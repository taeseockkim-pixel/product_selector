import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 실제 에이전트 프로세스를 임시 폴더로 띄워, Apps Script가 하는 일을 흉내 낸 대기열 파일로
 * 생존 신호 → 저장 → Excel PDF → 메일 첨부 전달(attachments) → 완료 보고(results)가 이어지는지 확인한다.
 * Excel이 설치된 Windows에서만 실행할 수 있다.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = join(process.env.LOCALAPPDATA || 'C:/Users/CIMON/AppData/Local', 'Temp', 'opencode');
await mkdir(tempRoot, { recursive: true });
const tempDir = await mkdtemp(join(tempRoot, 'agent-e2e-'));
const port = 18790 + Math.floor(Math.random() * 500);

const agentFolder = join(tempDir, '견적에이전트');
const storageRoot = join(tempDir, '견적서');
const configPath = join(tempDir, 'config.json');
await mkdir(agentFolder, { recursive: true });
await writeFile(configPath, JSON.stringify({
  agentFolderPath: agentFolder,
  storageRoot,
  defaultDepartment: '기술영업',
  publicBaseUrl: `http://127.0.0.1:${port}`,
  httpPort: port,
  pollIntervalMs: 500,
  heartbeatIntervalMs: 1000,
  fileLinkSecret: 'e2e-secret',
  folderPasswords: { 기술영업: 'pw' },
  adminPassword: 'admin',
  templatePath: join(root, 'agent', 'templates', '견적서 샘플.xlsx'),
  excelWorkerPidFile: join(tempDir, 'excel-worker.pid'),
}), 'utf8');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const pageCount = (buffer) => (buffer.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;

async function waitFor(check, description, timeoutMs = 90000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await check();
    if (value) return value;
    await sleep(300);
  }
  throw new Error(`시간 초과: ${description}\n--- 에이전트 로그 ---\n${agentLog.slice(-3000)}`);
}

function findFiles(dir, predicate, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findFiles(full, predicate, found);
    else if (predicate(entry.name)) found.push(full);
  }
  return found;
}

function makeJob({ quoteNumber, operationId, createDraft, items }) {
  return {
    details: {
      quoteNumber,
      baseQuoteNumber: quoteNumber,
      clientName: 'E2E 고객',
      clientContactPerson: '담당자',
      clientPhone: '010-0000-0000',
      clientEmail: 'customer@example.com',
      authorName: '테스트 작성자',
      authorPhone: '010-1111-2222',
      authorEmail: 'author@cimon.com',
      authorDepartment: '기술영업',
      quoteDate: '2026년 10월 13일',
      year: 2026,
      deliveryLocation: '테스트 장소',
      deliveryDeadline: '협의',
      paymentTerms: '협의',
      validityPeriod: '30일',
      packing: '제조사 기본',
      notes: 'E2E 비고',
      folderClientName: 'E2E 고객',
      operationId,
      agentQueuedAt: Date.now(),
    },
    items,
    vatTotal: items.reduce((sum, item) => sum + item.totalPrice, 0) * 1.1,
    createDraft,
    attachPdf: createDraft,
    customSubject: '',
  };
}

const quoteItems = (count) => Array.from({ length: count }, (_, index) => ({
  name: `CM-E2E-${index + 1}`,
  spec: 'Intel CPU / 내장 한글 규격 시험',
  quantity: 1,
  unitPrice: 100000,
  multiplier: 1,
  totalPrice: 100000,
}));

let agentLog = '';
function startAgent() {
  const child = spawn(process.execPath, [join(root, 'agent', 'index.js')], {
    env: { ...process.env, CIMON_AGENT_CONFIG: configPath },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.on('data', (data) => { agentLog += data.toString('utf8'); });
  child.stderr.on('data', (data) => { agentLog += data.toString('utf8'); });
  return child;
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const pidFilePath = join(tempDir, 'excel-worker.pid');
let agent = startAgent();

try {
  // 1. 생존 신호와 /health
  const health = await waitFor(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }, '/health 응답', 30000);
  assert.equal(health.ok, true);
  assert.ok(health.features.includes('draftAttachments'), '에이전트가 첨부 기능을 알려야 합니다.');
  assert.equal(health.publicBaseUrl, `http://127.0.0.1:${port}`);
  assert.match(health.storageRootFingerprint, /^[a-f0-9]{16}$/);
  assert.ok(health.host);
  assert.equal(health.pollIntervalMs, 500);

  const heartbeatPath = join(agentFolder, 'heartbeat.json');
  const heartbeat = await waitFor(async () => (existsSync(heartbeatPath) ? JSON.parse(await readFile(heartbeatPath, 'utf8')) : null), 'heartbeat.json');
  assert.equal(heartbeat.stopped, false);
  assert.ok(heartbeat.features.includes('draftAttachments'));
  assert.equal(heartbeat.storageRootFingerprint, health.storageRootFingerprint);
  assert.equal(heartbeat.publicBaseUrl, health.publicBaseUrl);
  const firstTs = heartbeat.ts;
  await waitFor(async () => JSON.parse(await readFile(heartbeatPath, 'utf8')).ts > firstTs, '생존 신호 갱신', 15000);

  // 2. 메일 초안이 필요한 분할 견적(15개 품목 → 2개 파일) 저장
  const operationId = '123e4567-e89b-12d3-a456-426614174000';
  const quoteNumber = '기술영업 2610-900';
  await writeFile(
    join(agentFolder, 'pending', `${quoteNumber}.json`),
    JSON.stringify(makeJob({ quoteNumber, operationId, createDraft: true, items: quoteItems(15) })),
    'utf8',
  );

  const resultPath = join(agentFolder, 'results', `${quoteNumber}.json`);
  const result = await waitFor(async () => {
    if (!existsSync(resultPath)) return null;
    try { return JSON.parse(await readFile(resultPath, 'utf8')); } catch { return null; }
  }, '완료 보고(results)');
  assert.equal(result.ok, true, `저장이 실패했습니다: ${result.error}`);
  assert.ok(result.timings, '완료 보고에 단계별 시간이 있어야 합니다.');
  assert.ok(result.timings.pdfConversionMs > 0);
  assert.ok(['worker', 'fallback', 'one-shot'].includes(result.timings.pdfConversionMode));
  assert.equal(result.fileUrls.length, 2, '15개 품목은 2개 파일로 나뉘어야 합니다.');

  // 3. 첨부 파일이 저장된 최종 PDF와 바이트까지 같다.
  const manifestPath = join(agentFolder, 'attachments', `${operationId}__manifest.json`);
  assert.ok(existsSync(manifestPath), 'manifest가 있어야 합니다.');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(manifest.ok, true);
  assert.equal(manifest.files.length, 2);

  const storedPdfs = findFiles(storageRoot, (name) => name.startsWith('기술영업 2610-900') && name.endsWith('.pdf'));
  assert.equal(storedPdfs.length, 2, `저장된 PDF가 2개여야 합니다: ${storedPdfs.join(', ')}`);
  for (const entry of manifest.files) {
    const stored = storedPdfs.find((path) => path.endsWith(entry.name));
    assert.ok(stored, `저장된 PDF를 찾지 못했습니다: ${entry.name}`);
    const attached = join(agentFolder, 'attachments', entry.attachmentName);
    assert.equal(await sha256(attached), await sha256(stored), `메일 첨부 PDF가 저장 PDF와 달라서는 안 됩니다: ${entry.name}`);
    assert.equal(pageCount(await readFile(attached)), 1, '견적서 PDF는 1페이지여야 합니다.');
  }

  // 4. 메일을 요청하지 않은 일반 저장은 첨부를 만들지 않고, 같은 에이전트가 연속 작업을 처리한다(워커 재사용).
  const plainOperation = '223e4567-e89b-12d3-a456-426614174111';
  const plainNumber = '기술영업 2610-901';
  await writeFile(
    join(agentFolder, 'pending', `${plainNumber}.json`),
    JSON.stringify(makeJob({ quoteNumber: plainNumber, operationId: plainOperation, createDraft: false, items: quoteItems(1) })),
    'utf8',
  );
  const plainResultPath = join(agentFolder, 'results', `${plainNumber}.json`);
  const plainResult = await waitFor(async () => {
    if (!existsSync(plainResultPath)) return null;
    try { return JSON.parse(await readFile(plainResultPath, 'utf8')); } catch { return null; }
  }, '일반 저장 완료 보고');
  assert.equal(plainResult.ok, true);
  assert.equal(existsSync(join(agentFolder, 'attachments', `${plainOperation}__manifest.json`)), false, '메일을 요청하지 않으면 첨부를 만들면 안 됩니다.');
  assert.equal(plainResult.actualFolderName, '기술영업 2610-901_E2E 고객');
  assert.equal(plainResult.pdfFileNames.length, 1);

  // 저장 파일이 다른 견적번호 폴더에 놓였어도, 서명된 링크는 같은 부서/연도 안의 정확한 견적 파일을 찾아야 한다.
  const yearDir = dirname(plainResult.localPath);
  const misplacedFolder = join(yearDir, '기술영업 2610-900_이전 폴더에 잘못 저장된 901');
  await rename(plainResult.localPath, misplacedFolder);
  const recoveredResponse = await fetch(plainResult.fileUrl);
  assert.equal(recoveredResponse.status, 200, '다른 폴더에 있는 정확한 파일은 서명된 견적 링크로 열려야 합니다.');
  const recoveredPdf = Buffer.from(await recoveredResponse.arrayBuffer());
  assert.equal(recoveredPdf.subarray(0, 8).toString('latin1'), '%PDF-1.7');
  assert.match(agentLog, /파일 링크 다른 폴더에서 복구/, '다른 폴더에서 찾은 사실을 운영 로그에 남겨야 합니다.');

  // 같은 기본 번호의 원본이 있어도 존재하지 않는 Rev 파일 링크에 원본 PDF를 대신 반환하면 안 된다.
  const nonexistentRevisionName = '기술영업 2610-901_Rev01_E2E 고객_견적서.pdf';
  const revisionRelativePath = [
    '기술영업', '2026', plainResult.actualFolderName, nonexistentRevisionName,
  ].map(encodeURIComponent).join('/');
  const revisionSignature = createHmac('sha256', 'e2e-secret').update(revisionRelativePath).digest('hex');
  const nonexistentRevisionResponse = await fetch(
    `http://127.0.0.1:${port}/files/${revisionRelativePath}?k=${revisionSignature}`,
  );
  assert.equal(nonexistentRevisionResponse.status, 404, '없는 Rev 파일 요청에 원본 파일을 대신 반환하면 안 됩니다.');

  const finalHealth = await (await fetch(`http://127.0.0.1:${port}/health`)).json();

  // 5. 에이전트가 갑자기 종료돼도 남은 숨김 Excel은 다음 시작 때 정리된다.
  assert.ok(existsSync(pidFilePath), 'Excel PID 파일이 기록되어 있어야 합니다.');
  const orphanPid = JSON.parse(await readFile(pidFilePath, 'utf8')).excelPid;
  assert.ok(orphanPid > 0 && processExists(orphanPid), '워커의 Excel이 실행 중이어야 합니다.');
  agent.kill();
  await sleep(2500);
  assert.ok(processExists(orphanPid), '강제 종료 직후에는 Excel이 남아 있는 상황을 재현해야 합니다.');

  agent = startAgent();
  await waitFor(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }, '재시작한 에이전트 /health', 30000);
  await waitFor(async () => !processExists(orphanPid), '남은 Excel 정리', 30000);
  assert.match(agentLog, /남은 숨김 Excel/, '정리 로그가 남아야 합니다.');

  console.log(
    `✅ 에이전트 통합 시험 통과 (분할 2파일 PDF ${result.timings.pdfConversionMs}ms[${result.timings.pdfConversionMode}], ` +
    `첨부 전달 ${result.timings.attachmentMs}ms, 에이전트 합계 ${result.timings.agentTotalMs}ms / 이어서 일반 저장 ${plainResult.timings.pdfConversionMs}ms, ` +
    `Excel 워커 시작 ${finalHealth.excelWorker.starts}회, 강제 종료 뒤 잔여 Excel 정리 확인)`,
  );
} finally {
  agent.kill();
  await sleep(1500);
  // 시험이 실패해도 숨김 Excel이 남지 않도록 PID 파일에 기록된 프로세스를 정리한다.
  try {
    const leftover = JSON.parse(await readFile(pidFilePath, 'utf8')).excelPid;
    if (leftover > 0) process.kill(leftover);
  } catch { /* 이미 정리됨 */ }
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
}
