import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { excelToPdfBatch, POWERSHELL_CONVERT_FUNCTION } from './excelToPdf.js';

/**
 * 이전 실행(강제 종료, 재부팅 등)에서 남은 숨김 Excel을 정리한다.
 * Node가 갑자기 종료되면 Windows가 PowerShell 워커도 함께 종료시켜 워커가 Excel을 닫지 못한다.
 * 그래서 워커가 만든 Excel PID를 파일에 기록해 두고 다음 시작 때 창이 없는 EXCEL 프로세스만 종료한다
 * (사용자가 직접 연 Excel은 창이 있으므로 건드리지 않는다).
 */
export function reapStaleExcelWorker(pidFile, log = console) {
  if (!pidFile || !existsSync(pidFile)) return false;
  let pid = 0;
  try {
    pid = Number(JSON.parse(readFileSync(pidFile, 'utf8')).excelPid) || 0;
  } catch {
    pid = 0;
  }
  try { unlinkSync(pidFile); } catch { /* 이미 삭제됨 */ }
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    const output = execFileSync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($p -and $p.ProcessName -eq 'EXCEL' -and $p.MainWindowHandle -eq 0) { $p.Kill(); 'killed' }`,
    ], { encoding: 'utf8', timeout: 20000 });
    if (output.includes('killed')) {
      log.log?.(`[Excel 워커] 이전 실행에서 남은 숨김 Excel(PID ${pid})을 정리했습니다.`);
      return true;
    }
  } catch (err) {
    log.warn?.(`[Excel 워커] 남은 Excel 정리 확인 실패(PID ${pid}): ${err.message || err}`);
  }
  return false;
}

/**
 * 작업마다 PowerShell과 Excel을 새로 띄우지 않도록, 숨김 Excel을 유지하는 PowerShell 워커.
 * 요청은 한 줄(base64 JSON)로 보내고 응답도 한 줄('R:' + base64 JSON)로 받는다.
 * 어떤 이유로든 워커가 실패하면 excelToPdfBatchWarm()이 기존 일회성 변환으로 되돌아간다.
 */
const WORKER_SCRIPT = `
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
${POWERSHELL_CONVERT_FUNCTION}
$script:xl = $null
$script:excelPid = 0
function New-QuoteExcel {
  $before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  $app = New-Object -ComObject Excel.Application
  $app.Visible = $false
  $app.DisplayAlerts = $false
  $script:excelPid = 0
  try {
    $created = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue |
      Where-Object { $before -notcontains $_.Id } |
      Sort-Object StartTime -Descending)
    if ($created.Count -gt 0) { $script:excelPid = [int]$created[0].Id }
  } catch { }
  return $app
}
function Test-QuoteExcel {
  if ($null -eq $script:xl) { return $false }
  try { $null = $script:xl.Version; return $true } catch { return $false }
}
function Stop-QuoteExcel {
  if ($null -ne $script:xl) {
    try { $script:xl.Quit() } catch { }
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($script:xl) | Out-Null } catch { }
    $script:xl = $null
  }
}
function Send-Reply($id, $ok, $message) {
  $json = (@{ id = $id; ok = $ok; error = $message; excelPid = $script:excelPid } | ConvertTo-Json -Compress)
  $b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))
  [Console]::Out.WriteLine('R:' + $b64)
  [Console]::Out.Flush()
}
try {
  $script:xl = New-QuoteExcel
  [Console]::Out.WriteLine('READY:' + $script:excelPid)
  [Console]::Out.Flush()
  while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line -or $line -eq 'QUIT') { break }
    if ($line.Trim().Length -eq 0) { continue }
    $id = ''
    try {
      $req = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($line)) | ConvertFrom-Json
      $id = [string]$req.id
      if (-not (Test-QuoteExcel)) { Stop-QuoteExcel; $script:xl = New-QuoteExcel }
      foreach ($task in @($req.tasks)) { Convert-QuotePdf $script:xl $task }
      Send-Reply $id $true ''
    } catch {
      Send-Reply $id $false $_.ToString()
    }
  }
} finally {
  Stop-QuoteExcel
}
`.trim();

export class ExcelPdfWorker {
  constructor({
    idleMs = 30 * 60 * 1000,
    maxJobs = 200,
    readyTimeoutMs = 60000,
    requestTimeoutMs = 120000,
    spawnFn = spawn,
    pidFile = '',
  } = {}) {
    this.pidFile = pidFile;
    this.idleMs = idleMs;
    this.maxJobs = maxJobs;
    this.readyTimeoutMs = readyTimeoutMs;
    this.requestTimeoutMs = requestTimeoutMs;
    this.spawnFn = spawnFn;
    this.child = null;
    this.ready = null;
    this.pending = null;
    this.excelPid = 0;
    this.stopping = false;
    this.jobCount = 0;
    this.nextId = 1;
    this.idleTimer = null;
    this.queue = Promise.resolve();
    this.stdoutBuffer = '';
    this.stats = { starts: 0, conversions: 0, lastStartMs: 0, lastConvertMs: 0 };
  }

  status() {
    return {
      running: Boolean(this.child),
      jobsSinceStart: this.jobCount,
      ...this.stats,
    };
  }

  convert(filePairs) {
    const run = this.queue.then(() => this.#convert(filePairs));
    this.queue = run.catch(() => {});
    return run;
  }

  async stop() {
    this.#clearIdle();
    const child = this.child;
    if (!child) return;
    this.stopping = true;
    try {
      child.stdin.write('QUIT\n');
      child.stdin.end();
    } catch { /* 이미 종료됨 */ }
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.#kill();
        resolve();
      }, 8000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    // 정상 종료 신호에도 Excel이 닫히지 않는 경우(이전 강제 종료로 생긴 복구 상태 등)를 대비해 정리한다.
    const excelPid = this.excelPid;
    this.excelPid = 0;
    await this.#reapExcel(excelPid);
    this.#removePidFile();
  }

  async #reapExcel(pid, graceMs = 5000) {
    if (!(pid > 0)) return;
    const deadline = Date.now() + graceMs;
    while (Date.now() < deadline) {
      try {
        process.kill(pid, 0);
      } catch {
        return; // 이미 종료됨
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    try { process.kill(pid); } catch { /* 이미 종료됨 */ }
  }

  kill() {
    this.#clearIdle();
    this.#kill();
  }

  async #convert(filePairs) {
    this.#clearIdle();
    try {
      await this.#ensureStarted();
      const id = String(this.nextId++);
      const payload = Buffer.from(JSON.stringify({ id, tasks: filePairs }), 'utf8').toString('base64');
      const startedAt = Date.now();
      const timeoutMs = Math.max(this.requestTimeoutMs, 30000 * filePairs.length);
      const reply = await this.#request(id, payload, timeoutMs);
      if (!reply.ok) throw new Error(reply.error || 'Excel 변환에 실패했습니다.');
      this.stats.conversions += filePairs.length;
      this.stats.lastConvertMs = Date.now() - startedAt;
      this.jobCount += 1;
      if (this.jobCount >= this.maxJobs) await this.stop();
    } finally {
      this.#armIdle();
    }
  }

  #ensureStarted() {
    if (this.child && this.ready) return this.ready;

    const startedAt = Date.now();
    // 직전 실행이 비정상 종료되어 남긴 Excel이 있으면 먼저 정리한다(PID 파일이 없으면 즉시 지나간다).
    reapStaleExcelWorker(this.pidFile);
    const encoded = Buffer.from(WORKER_SCRIPT, 'utf16le').toString('base64');
    const child = this.spawnFn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    this.child = child;
    this.stdoutBuffer = '';
    this.jobCount = 0;
    this.excelPid = 0;
    this.stopping = false;
    let stderrText = '';

    child.stdin.on('error', () => { /* 종료 중 쓰기 오류는 exit 이벤트에서 처리 */ });
    child.stderr.on('data', (data) => {
      stderrText = (stderrText + data.toString('utf8')).slice(-2000);
    });
    child.stdout.on('data', (chunk) => this.#onStdout(chunk.toString('utf8')));
    child.on('error', (err) => this.#onExit(child, `실행 오류: ${err.message}`));
    child.on('exit', (code) => this.#onExit(child, `종료 코드 ${code} ${stderrText}`.trim()));

    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Excel 변환 워커 시작 시간이 초과되었습니다.'));
        this.#kill();
      }, this.readyTimeoutMs);
      this.readyHandlers = {
        resolve: () => {
          clearTimeout(timer);
          this.stats.starts += 1;
          this.stats.lastStartMs = Date.now() - startedAt;
          resolve();
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      };
    });
    // 시작 실패가 처리되지 않은 거부로 남지 않도록 한다. 호출한 쪽은 await로 오류를 받는다.
    this.ready.catch(() => {});
    return this.ready;
  }

  #onStdout(text) {
    this.stdoutBuffer += text;
    let newline = this.stdoutBuffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.stdoutBuffer.slice(0, newline).replace(/\r$/, '');
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      this.#onLine(line);
      newline = this.stdoutBuffer.indexOf('\n');
    }
  }

  #onLine(line) {
    if (line === 'READY' || line.startsWith('READY:')) {
      this.excelPid = Number(line.slice(6)) || 0;
      this.#writePidFile();
      this.readyHandlers?.resolve();
      return;
    }
    if (!line.startsWith('R:') || !this.pending) return;
    try {
      const reply = JSON.parse(Buffer.from(line.slice(2), 'base64').toString('utf8'));
      if (Number(reply.excelPid) > 0 && Number(reply.excelPid) !== this.excelPid) {
        // 워커 안에서 Excel이 다시 만들어졌다면 새 PID를 기록한다.
        this.excelPid = Number(reply.excelPid);
        this.#writePidFile();
      }
      if (String(reply.id) === this.pending.id) {
        const { resolve, timer } = this.pending;
        clearTimeout(timer);
        this.pending = null;
        resolve(reply);
      }
    } catch { /* 해석할 수 없는 줄은 무시한다. */ }
  }

  #request(id, payload, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = null;
        this.#kill();
        reject(new Error(`Excel 변환 워커가 ${Math.round(timeoutMs / 1000)}초 안에 응답하지 않았습니다.`));
      }, timeoutMs);
      this.pending = { id, resolve, reject, timer };
      try {
        this.child.stdin.write(`${payload}\n`);
      } catch (err) {
        clearTimeout(timer);
        this.pending = null;
        reject(err);
      }
    });
  }

  #onExit(child, reason) {
    // 강제 종료한 이전 워커의 늦은 종료 이벤트가 새 워커의 요청을 실패시키지 않도록 무시한다.
    if (this.child && this.child !== child) return;
    if (this.child === child) {
      this.child = null;
      this.ready = null;
      // 정상 종료(QUIT)가 아니면 워커가 만든 숨김 Excel이 고아 프로세스로 남을 수 있어 함께 정리한다.
      if (!this.stopping) this.#killExcel();
    }
    const error = new Error(`Excel 변환 워커가 종료되었습니다: ${reason}`);
    this.readyHandlers?.reject(error);
    this.readyHandlers = null;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
  }

  #kill() {
    const child = this.child;
    this.child = null;
    this.ready = null;
    if (child) {
      try { child.kill(); } catch { /* 이미 종료됨 */ }
    }
    this.#killExcel();
  }

  #killExcel() {
    const excelPid = this.excelPid;
    this.excelPid = 0;
    if (excelPid > 0) {
      try { process.kill(excelPid); } catch { /* 이미 종료됨 */ }
    }
    this.#removePidFile();
  }

  #writePidFile() {
    if (!this.pidFile || !(this.excelPid > 0)) return;
    try {
      writeFileSync(this.pidFile, JSON.stringify({ excelPid: this.excelPid, at: Date.now() }), 'utf8');
    } catch { /* PID 기록 실패는 변환에 영향을 주지 않는다. */ }
  }

  #removePidFile() {
    if (!this.pidFile) return;
    try { unlinkSync(this.pidFile); } catch { /* 이미 삭제됨 */ }
  }

  #armIdle() {
    this.#clearIdle();
    if (!this.child) return;
    this.idleTimer = setTimeout(() => { void this.stop(); }, this.idleMs);
    this.idleTimer.unref?.();
  }

  #clearIdle() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}

let sharedWorker = null;
let sharedOptions = {};

/** 공용 워커를 만들기 전에 옵션(예: PID 파일 경로)을 지정한다. */
export function configureExcelPdfWorker(options) {
  sharedOptions = { ...sharedOptions, ...options };
}

export function getExcelPdfWorker() {
  if (!sharedWorker) sharedWorker = new ExcelPdfWorker(sharedOptions);
  return sharedWorker;
}

export function excelWorkerStatus() {
  return sharedWorker ? sharedWorker.status() : { running: false, jobsSinceStart: 0, starts: 0, conversions: 0 };
}

export function shutdownExcelPdfWorker() {
  if (sharedWorker) sharedWorker.kill();
}

/**
 * 상시 대기 Excel로 변환하고, 워커가 실패하면 기존 일회성 변환으로 다시 시도한다.
 * @returns {Promise<{mode: 'worker'|'fallback'|'none', ms: number}>}
 */
export async function excelToPdfBatchWarm(filePairs, log = console) {
  if (!Array.isArray(filePairs) || filePairs.length === 0) return { mode: 'none', ms: 0 };
  const startedAt = Date.now();
  try {
    await getExcelPdfWorker().convert(filePairs);
    return { mode: 'worker', ms: Date.now() - startedAt };
  } catch (err) {
    log.warn?.(`[Excel 워커] 상시 변환 실패 — 일회성 방식으로 다시 시도합니다: ${err.message || err}`);
    excelToPdfBatch(filePairs);
    return { mode: 'fallback', ms: Date.now() - startedAt };
  }
}
