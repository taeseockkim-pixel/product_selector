import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  getAgentFolderFingerprint,
  getAgentLockDirectory,
  getAgentLockPath,
  isSameHostProcessAlive,
  readAgentLock,
} from './instanceLock.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = process.env.CIMON_AGENT_CONFIG
  ? resolve(process.env.CIMON_AGENT_CONFIG)
  : join(root, 'agent', 'config.json');
const HEALTH_TIMEOUT_MS = 2500;

function readConfig() {
  if (!existsSync(configPath)) throw new Error(`설정 파일이 없습니다: ${configPath}`);
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

function configuredAgentFolder(config) {
  const value = String(config.agentFolderPath || '').trim();
  if (!value) throw new Error('config.json에 agentFolderPath가 없습니다.');
  return resolve(value);
}

function configuredPort(config) {
  const port = Number(config.httpPort || 8790);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('config.json의 httpPort가 올바르지 않습니다.');
  return port;
}

function listeningPids(port) {
  try {
    const output = execFileSync('netstat.exe', ['-ano', '-p', 'tcp'], { encoding: 'utf8', timeout: 5000 });
    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
      const columns = line.trim().split(/\s+/);
      if (columns[0]?.toUpperCase() !== 'TCP' || columns[3]?.toUpperCase() !== 'LISTENING') continue;
      if (!columns[1]?.endsWith(`:${port}`)) continue;
      const pid = Number(columns[4]);
      if (Number.isInteger(pid) && pid > 0) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

async function probeHealth(port) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return data?.ok === true ? { ok: true, data } : { ok: false, error: 'health 응답의 ok 값이 true가 아닙니다.' };
  } catch (error) {
    return { ok: false, error: error?.name === 'AbortError' ? `${HEALTH_TIMEOUT_MS}ms 응답 시간 초과` : String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

function processDetails(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    const script = `$p = Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}'; if ($p) { $p | Select-Object ProcessId, ParentProcessId, Name, CommandLine | ConvertTo-Json -Compress }`;
    const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      encoding: 'utf8',
      timeout: 8000,
      windowsHide: true,
    }).trim();
    return output ? JSON.parse(output) : null;
  } catch {
    return null;
  }
}

function isAgentProcess(details) {
  return Boolean(
    details
    && String(details.Name || '').toLowerCase() === 'node.exe'
    && /agent[\\/]index\.js(?:\s|"|$)/i.test(String(details.CommandLine || '')),
  );
}

async function waitForHealth(port, timeoutMs = 45_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const health = await probeHealth(port);
    if (health.ok) return health.data;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  return null;
}

function stateFor(config) {
  const agentFolder = configuredAgentFolder(config);
  const port = configuredPort(config);
  const lockDir = getAgentLockDirectory(String(config.instanceLockDir || ''));
  const lockPath = getAgentLockPath(agentFolder, lockDir);
  const lock = readAgentLock(lockPath);
  const lockOwnerAlive = isSameHostProcessAlive(lock);
  const pids = listeningPids(port);
  return { agentFolder, fingerprint: getAgentFolderFingerprint(agentFolder), port, lockDir, lockPath, lock, lockOwnerAlive, pids };
}

async function collectDiagnostics(state) {
  const health = await probeHealth(state.port);
  const processes = [...new Set([...state.pids, ...(state.lockOwnerAlive ? [Number(state.lock.pid)] : [])])]
    .map((pid) => processDetails(pid))
    .filter(Boolean);
  return {
    capturedAt: new Date().toISOString(),
    host: hostname(),
    port: state.port,
    agentFolderFingerprint: state.fingerprint,
    lock: state.lock ? {
      pid: state.lock.pid || null,
      host: state.lock.host || '',
      instanceId: state.lock.instanceId || '',
      startedAt: state.lock.startedAt || '',
      alive: state.lockOwnerAlive,
      malformed: Boolean(state.lock.malformed),
    } : null,
    health: health.ok ? { ok: true, ...health.data } : { ok: false, error: health.error },
    listeningPids: state.pids,
    processes,
  };
}

async function saveDiagnostics(state) {
  const diagnostics = await collectDiagnostics(state);
  const parentDirectory = dirname(state.lockDir);
  const diagnosticsDirectory = resolve(String(readConfig().diagnosticsDir || join(parentDirectory, 'diagnostics')));
  mkdirSync(diagnosticsDirectory, { recursive: true });
  const path = join(diagnosticsDirectory, `agent-diagnostic-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(diagnostics, null, 2), 'utf8');
  console.log(`진단 정보 저장: ${path}`);
  console.log(`상태: /health ${diagnostics.health.ok ? '응답' : `무응답 (${diagnostics.health.error})`}, 포트 PID ${state.pids.join(', ') || '없음'}, 잠금 PID ${state.lockOwnerAlive ? state.lock.pid : '없음'}`);
  for (const details of diagnostics.processes) {
    console.log(`프로세스: PID ${details.ProcessId}, ${details.Name}, 부모 PID ${details.ParentProcessId}`);
    console.log(`  명령: ${String(details.CommandLine || '').slice(0, 500)}`);
  }
  return { diagnostics, path };
}

async function preflight() {
  const config = readConfig();
  const state = stateFor(config);
  const health = await probeHealth(state.port);
  if (health.ok) {
    const servedFingerprint = String(health.data.agentFolderFingerprint || '');
    if (servedFingerprint && servedFingerprint !== state.fingerprint) {
      console.error(`[에이전트 점검] ${state.port} 포트의 /health는 다른 견적에이전트 폴더(${servedFingerprint})를 가리킵니다.`);
      console.error('기존 프로세스를 종료하지 말고 포트 설정과 실행 PC를 관리자에게 확인하세요.');
      return 20;
    }
    const heartbeatAgeMs = health.data.heartbeatAgeMs == null
      ? Number.NaN
      : Number(health.data.heartbeatAgeMs);
    const heartbeatDegraded = (
      Number.isFinite(heartbeatAgeMs) && heartbeatAgeMs > 90_000
    ) || Boolean(health.data.heartbeatError) || (
      health.data.heartbeatWriteInProgress && Number(health.data.heartbeatWriteDurationMs) > 30_000
    ) || (
      typeof health.data.heartbeatAt === 'number'
      && health.data.heartbeatAt <= 0
      && !health.data.heartbeatWriteInProgress
    );
    if (heartbeatDegraded) {
      console.error(`[에이전트 점검] HTTP는 응답하지만 생존 신호가 비정상입니다 (나이 ${Number.isFinite(heartbeatAgeMs) ? `${Math.round(heartbeatAgeMs / 1000)}초` : '확인 불가'}).`);
      console.error('중복 실행하지 않았습니다. Drive 동기화와 에이전트 로그를 확인하고 agent\\restart-agent.bat으로 복구하세요.');
      return 20;
    }
    console.log(`[에이전트] 정상 실행 중: /health 응답, PID ${health.data.pid || '확인 불가'}, 버전 ${health.data.version || '확인 불가'}`);
    return 10;
  }

  if (state.lockOwnerAlive || state.pids.length > 0) {
    console.error(`[에이전트 점검] 프로세스/포트는 확인되지만 /health에 응답하지 않습니다 (${health.error}).`);
    console.error('에이전트를 중복 실행하지 않았습니다. 원인 정보를 수집하고 agent\\restart-agent.bat으로 복구하세요.');
    return 20;
  }
  return 0;
}

async function restart() {
  const config = readConfig();
  const state = stateFor(config);
  const health = await probeHealth(state.port);
  if (state.lockOwnerAlive && state.lock?.host && state.lock.host !== hostname()) {
    console.error(`잠금 소유 PC(${state.lock.host})의 프로세스는 이 PC에서 종료할 수 없습니다. 해당 PC의 에이전트를 확인하세요.`);
    return 1;
  }
  const servedFingerprint = String(health.data?.agentFolderFingerprint || '');
  if (servedFingerprint && servedFingerprint !== state.fingerprint) {
    console.error('현재 포트의 에이전트는 다른 견적에이전트 폴더를 사용합니다. 다른 인스턴스는 자동 종료하지 않았습니다.');
    return 1;
  }
  if (state.lock?.agentFolderFingerprint && state.lock.agentFolderFingerprint !== state.fingerprint) {
    console.error('잠금 파일이 다른 대기 폴더를 가리킵니다. 자동 종료하지 않았습니다.');
    return 1;
  }
  const localLockPid = state.lock?.host === hostname() && state.lockOwnerAlive ? Number(state.lock.pid) : 0;
  const preferredPid = localLockPid || Number(health.data?.pid || 0);
  const candidatePids = [...new Set([preferredPid, ...state.pids].filter((pid) => Number.isInteger(pid) && pid > 0))];

  if (candidatePids.length === 0) {
    console.log('중지할 에이전트 프로세스가 없습니다. 새로 시작합니다.');
  } else {
    const target = candidatePids
      .map((pid) => processDetails(pid))
      .find((details) => isAgentProcess(details));
    if (!target) {
      console.error('포트/잠금 프로세스가 에이전트 Node 프로세스임을 확인할 수 없어 종료하지 않았습니다.');
      console.error(`확인한 PID: ${candidatePids.join(', ')}`);
      return 1;
    }

    if (health.ok && health.data.currentJobRunning) {
      console.error('현재 견적 작업 처리 중입니다. 작업이 끝난 뒤 재시작해 주세요.');
      console.error(`현재 작업 경과: ${Math.round(Number(health.data.currentJobElapsedMs || 0) / 1000)}초`);
      return 1;
    }

    console.log(`재시작 대상: PID ${target.ProcessId}, ${target.Name}`);
    console.log(`/health: ${health.ok ? '정상 응답 중' : `무응답 (${health.error})`}`);
    const { path: diagnosticPath } = await saveDiagnostics(state);
    console.log(`진단 파일은 재시작 전에 저장했습니다: ${diagnosticPath}`);
    const readline = createInterface({ input: stdin, output: stdout });
    let answer = '';
    try {
      answer = await readline.question(`PID ${target.ProcessId}와 자식 프로세스만 종료하고 다시 시작할까요? (y/N): `);
    } finally {
      readline.close();
    }
    if (!/^y(es)?$/i.test(answer.trim())) {
      console.log('재시작을 취소했습니다.');
      return 1;
    }

    try {
      // 우선 Windows의 정상 종료 요청을 보내고 현재 작업을 마칠 시간을 준다.
      execFileSync('taskkill.exe', ['/PID', String(target.ProcessId), '/T'], { stdio: 'inherit', timeout: 15000 });
    } catch (error) {
      console.warn(`정상 종료 요청 결과 확인 필요: ${error.message || error}`);
    }
    const gracefulWaitUntil = Date.now() + 30_000;
    while (Date.now() < gracefulWaitUntil) {
      if (!processAlive(Number(target.ProcessId)) && !listeningPids(state.port).length) break;
      await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    }
    if (processAlive(Number(target.ProcessId)) || listeningPids(state.port).length) {
      const readline = createInterface({ input: stdin, output: stdout });
      let forceAnswer = '';
      try {
        forceAnswer = await readline.question('정상 종료가 되지 않았습니다. 진단 파일은 저장되어 있습니다. 이 에이전트 트리만 강제 종료할까요? (y/N): ');
      } finally {
        readline.close();
      }
      if (!/^y(es)?$/i.test(forceAnswer.trim())) {
        console.log('강제 종료하지 않았습니다. 진행 상태를 확인한 뒤 다시 시도해 주세요.');
        return 1;
      }
      try {
        execFileSync('taskkill.exe', ['/PID', String(target.ProcessId), '/T', '/F'], { stdio: 'inherit', timeout: 15000 });
      } catch (error) {
        console.error(`에이전트 강제 종료 실패: ${error.message || error}`);
        return 1;
      }
    }
    const waitUntil = Date.now() + 15_000;
    while (Date.now() < waitUntil) {
      if (!listeningPids(state.port).length) break;
      await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    }
    if (listeningPids(state.port).length) {
      console.error(`종료 후에도 포트 ${state.port}가 사용 중입니다. 다른 프로세스는 자동으로 종료하지 않았습니다.`);
      return 1;
    }
  }

  console.log('에이전트를 다시 시작합니다. 종료하지 말고 /health 확인을 기다려 주세요.');
  const child = spawn(process.execPath, [join(root, 'agent', 'index.js')], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false,
  });
  child.once('error', (error) => console.error(`에이전트 시작 실패: ${error.message}`));
  const childExit = new Promise((resolveExit, rejectExit) => {
    child.once('exit', resolveExit);
    child.once('error', rejectExit);
  });
  const newHealth = await waitForHealth(state.port);
  if (!newHealth) {
    console.error('45초 안에 /health가 응답하지 않았습니다. 새 프로세스를 종료하지 않고 창의 에이전트 로그를 확인해 주세요.');
    child.kill();
    await childExit.catch(() => {});
    return 1;
  }
  console.log(`✅ 재시작 확인: PID ${newHealth.pid}, 버전 ${newHealth.version}, heartbeat ${newHealth.heartbeatAgeMs ?? '확인 중'}ms`);
  await childExit;
  return 0;
}

const command = process.argv[2] || 'preflight';
try {
  const exitCode = command === 'preflight'
    ? await preflight()
    : command === 'restart'
      ? await restart()
      : 1;
  if (command !== 'preflight' && command !== 'restart') {
    console.error('사용법: node agent/agent-control.js [preflight|restart]');
  }
  process.exitCode = exitCode;
} catch (error) {
  console.error(`[에이전트 점검 오류] ${error.message || error}`);
  process.exitCode = 1;
}
