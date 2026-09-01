/**
 * CIMON 견적 파일 로컬 저장 에이전트 (Google Drive 폴더 연동형)
 *
 * 인증/네트워크 호출 없이 동작한다:
 *  1. Apps Script가 Drive의 "견적에이전트/pending" 폴더에 견적 JSON 파일을 생성하면
 *     Google Drive 데스크톱 동기화를 통해 이 PC의 대기 폴더에 나타난다.
 *  2. 본 에이전트가 대기 폴더를 주기적으로 확인해 XLSX를 생성한다
 *     (server/fillTemplate.js 재사용) and PDF로 변환한다 (server/excelToPdf.js, Excel 필요).
 *  3. 부서별 보안 폴더에 저장: {storageRoot}\{부서}\{연도}\{견적번호}_{업체명}\
 *  4. 완료 보고를 results 폴더에 기록하면 Apps Script가 대장 파일링크를 갱신한다.
 *  5. 사내 PC에서 견적 파일을 내려받을 수 있는 HTTP 파일 서버도 함께 구동한다.
 *
 * 실행: agent/config.json 준비 후 `npm run agent` (프로젝트 루트에서) 또는 start-agent.bat
 * 요구: Node.js 18+, Windows + Excel(이 PC), Google Drive 데스크톱(로그인), 상시 가동 권장
 */

import { readFileSync, existsSync, mkdirSync, statSync, unlinkSync, writeFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname, resolve, sep } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { fillQuoteTemplate } from '../server/fillTemplate.js';
import { excelToPdf } from '../server/excelToPdf.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 설정 로드 ──────────────────────────────────────────────────────────────
const configPath = join(__dirname, 'config.json');
if (!existsSync(configPath)) {
  console.error('[에이전트] agent/config.json 파일이 없습니다.');
  console.error('[에이전트] agent/config.example.json을 복사해 config.json으로 만들고 값을 채워 주세요.');
  process.exit(1);
}

let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error('[에이전트] agent/config.json을 해석할 수 없습니다: ' + err.message);
  console.error('[에이전트] JSON에서는 경로의 백슬래시(\\)를 반드시 두 개(\\\\) 쓰거나, 슬래시(/)를 사용해야 합니다.');
  console.error('[에이전트]   올바른 예: "agentFolderPath": "G:/공유 드라이브/견적서/견적에이전트"');
  process.exit(1);
}

const AGENT_FOLDER = resolve(String(config.agentFolderPath || ''));
const STORAGE_ROOT = resolve(String(config.storageRoot || 'D:\\견적서'));
const DEFAULT_DEPARTMENT = String(config.defaultDepartment || '기술영업');
const PUBLIC_BASE_URL = String(config.publicBaseUrl || '').replace(/\/+$/, '');
const HTTP_PORT = Number(config.httpPort || 8790);
const POLL_INTERVAL_MS = Number(config.pollIntervalMs || 10000);
const TEMPLATE_PATH = resolve(__dirname, String(config.templatePath || 'templates/견적서 샘플.xlsx'));
const MAX_JOB_ATTEMPTS = 3;

const PENDING_DIR = join(AGENT_FOLDER, 'pending');
const RESULTS_DIR = join(AGENT_FOLDER, 'results');

if (!AGENT_FOLDER) {
  console.error('[에이전트] config.json에 agentFolderPath를 입력해 주세요 (Drive 동기화된 견적에이전트 폴더 경로).');
  process.exit(1);
}
// Drive 가상 드라이브는 세션/권한에 따라 보이지 않을 수 있어 단계별로 가시성을 검사한다.
let folderReady = true;
try {
  mkdirSync(PENDING_DIR, { recursive: true });
  mkdirSync(RESULTS_DIR, { recursive: true });
} catch (err) {
  folderReady = false;
  console.error(`[에이전트] pending/results 폴더 준비 실패: ${describeError(err)}`);
}

if (!folderReady || !existsSync(PENDING_DIR) || !existsSync(RESULTS_DIR)) {
  console.error('[에이전트] Drive 폴더 가시성 진단:');
  const parts = AGENT_FOLDER.split(sep).filter(Boolean);
  let probe = parts.length > 0 ? parts[0] + sep : AGENT_FOLDER;
  let sawProjectFolder = false;
  console.error(`  ${existsSync(probe) ? '[OK]' : '[X ]'} ${probe}`);
  for (const part of parts.slice(1)) {
    probe = join(probe, part);
    let visible = false;
    try { visible = existsSync(probe); } catch { visible = false; }
    console.error(`  ${visible ? '[OK]' : '[X ]'} ${probe}`);
    if (!visible && existsSync(join(probe, 'package.json'))) sawProjectFolder = true;
  }
  console.error(`[에이전트] 설정된 경로(JSON 문자열): ${JSON.stringify(AGENT_FOLDER)}`);
  console.error('[에이전트] [X]가 처음 나타나는 위치가 문제 지점입니다.');
  console.error('[에이전트]  1. 같은 터미널에서 dir "G:\\공유 드라이브\\견적서\\견적에이전트" 실행 결과와 비교해 주세요');
  console.error('[에이전트]  2. 터미널을 관리자 권한으로 실행 중이라면 일반 권한으로 재시도해 주세요 (가상 드라이브는 세션마다 보임이 다를 수 있음)');
  console.error('[에이전트]  3. Google Drive 데스크톱 앱을 재시작하고 다시 시도해 주세요');
  if (sawProjectFolder) {
    console.error('[에이전트]  4. 지정된 폴더 아래에 package.json이 있는 경우 프로젝트 폴더입니다. agentFolderPath는 Drive 동기화 "견적에이전트" 폴더여야 합니다');
  } else {
    console.error('[에이전트]  4. 폴더 이름이 "견적에이전트"와 철자·띄어쓰기까지 정확히 일치하는지 확인해 주세요');
  }
  process.exit(1);
}
if (!existsSync(TEMPLATE_PATH)) {
  console.error(`[에이전트] 견적서 템플릿을 찾을 수 없습니다: ${TEMPLATE_PATH}`);
  process.exit(1);
}

// ── 유틸 ───────────────────────────────────────────────────────────────────
function safeSegment(value) {
  return String(value ?? '').replace(/[/\\:*?"<>|]/g, '').trim();
}

function quoteYear(details) {
  const match = String(details?.quoteDate || '').match(/(\d{4})/);
  return match ? match[1] : String(new Date().getFullYear());
}

// ── 견적 1건 처리 ──────────────────────────────────────────────────────────
async function processJob(fileName) {
  const jsonPath = join(PENDING_DIR, fileName);
  const payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const details = payload.details || {};
  const items = payload.items || [];

  const department = safeSegment(details.authorDepartment || DEFAULT_DEPARTMENT) || DEFAULT_DEPARTMENT;
  const year = quoteYear(details);
  const folderName = `${safeSegment(details.quoteNumber)}_${safeSegment(details.clientName)}`;
  const folder = join(STORAGE_ROOT, department, year, folderName);
  mkdirSync(folder, { recursive: true });

  const xlsxFileName = `${safeSegment(details.quoteNumber)}_${safeSegment(details.clientName)}_견적서.xlsx`;
  const pdfFileName = xlsxFileName.replace(/\.xlsx$/, '.pdf');
  const xlsxPath = join(folder, xlsxFileName);
  const pdfPath = join(folder, pdfFileName);

  const quote = {
    client: {
      company: details.clientName ?? '',
      contact: details.clientContactPerson ?? '',
      phone: details.clientPhone ?? '',
      email: details.clientEmail ?? '',
    },
    author: {
      name: details.authorName ?? '',
      phone: details.authorPhone ?? '',
      email: details.authorEmail ?? '',
    },
    details: {
      quoteDate: details.quoteDate ?? '',
      deliveryLocation: details.deliveryLocation ?? '',
      deliveryDeadline: details.deliveryDeadline ?? '',
      paymentTerms: details.paymentTerms ?? '',
      validityPeriod: details.validityPeriod ?? '',
      packing: details.packing ?? '',
      notes: details.notes ?? '',
    },
    items: items,
    vatTotal: Number(payload.vatTotal ?? 0),
  };

  await fillQuoteTemplate(quote, xlsxPath, TEMPLATE_PATH);
  excelToPdf(xlsxPath, pdfPath);

  const relativePath = [department, year, folderName, pdfFileName].map(encodeURIComponent).join('/');
  const fileUrl = PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}/files/${relativePath}` : '';

  const result = {
    quoteNumber: details.quoteNumber ?? '',
    department,
    year,
    ok: true,
    fileUrl,
    localPath: folder,
  };
  writeFileSync(join(RESULTS_DIR, `${safeSegment(details.quoteNumber)}.json`), JSON.stringify(result), 'utf8');
  unlinkSync(jsonPath);
}

function reportJobFailure(fileName, payload, errorMessage) {
  const details = payload?.details || {};
  // 원본 데이터 유실 방지를 위해 로컬 백업을 먼저 남긴다
  const backupDir = join(__dirname, 'failed-jobs');
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, fileName), JSON.stringify(payload, null, 2), 'utf8');

  const result = {
    quoteNumber: details.quoteNumber ?? '',
    department: details.authorDepartment ?? '',
    year: quoteYear(details),
    ok: false,
    error: String(errorMessage),
  };
  writeFileSync(join(RESULTS_DIR, `${safeSegment(details.quoteNumber) || fileName}`), JSON.stringify(result), 'utf8');
  unlinkSync(join(PENDING_DIR, fileName));
}

// ── 대기 폴더 폴링 ─────────────────────────────────────────────────────────
const jobAttempts = new Map();
let processing = false;

async function pollPending() {
  if (processing) return;
  processing = true;
  try {
    let fileNames = [];
    try {
      fileNames = readdirSync(PENDING_DIR).filter((f) => !f.startsWith('.') && f !== 'desktop.ini');
    } catch {
      return;
    }

    for (const fileName of fileNames) {
      const jsonPath = join(PENDING_DIR, fileName);
      let payload = null;
      try {
        payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
      } catch {
        // Drive 동기화가 아직 완료되지 않았을 수 있음 — 다음 폴링에서 재시도
        continue;
      }
      if (!payload?.details) continue;
      if (!fileName.endsWith('.json')) {
        // 확장자 없이 동기화된 경우에도 처리 가능하도록 원본을 .json으로 복제해 처리한다
        try {
          copyFileSync(jsonPath, jsonPath + '.json');
        } catch { /* 복제 실패 시 원본 그대로 처리 */ }
      }
      const jobFileName = fileName.endsWith('.json') ? fileName : fileName + '.json';

      console.log(`[에이전트] 저장 대기 견적 처리 시작: ${payload.details.quoteNumber ?? fileName}`);
      try {
        await processJob(jobFileName);
        jobAttempts.delete(jobFileName);
        jobAttempts.delete(fileName);
        console.log(`[에이전트] 저장 완료: ${payload.details.quoteNumber}`);
      } catch (err) {
        const attempts = (jobAttempts.get(jobFileName) || 0) + 1;
        jobAttempts.set(jobFileName, attempts);
        console.error(`[에이전트] 저장 실패 (${attempts}/${MAX_JOB_ATTEMPTS}) ${payload.details.quoteNumber}: ${err.message}`);
        if (attempts >= MAX_JOB_ATTEMPTS) {
          jobAttempts.delete(jobFileName);
          try {
            reportJobFailure(jobFileName, payload, err.message);
            console.error(`[에이전트] ${MAX_JOB_ATTEMPTS}회 실패 — 실패 보고를 기록했습니다. (로컬 백업: agent\\failed-jobs\\${fileName})`);
          } catch (reportErr) {
            console.error(`[에이전트] 실패 보고 기록 실패: ${reportErr.message} — 원본은 pending에 유지되며 백업은 agent\\failed-jobs\\에 있습니다.`);
          }
        }
      }
    }
  } finally {
    processing = false;
  }
}

function startPolling() {
  void pollPending().finally(() => {
    setTimeout(startPolling, POLL_INTERVAL_MS);
  });
}

// ── 사내 파일 다운로드 서버 ────────────────────────────────────────────────
const app = express();

app.get('/', (_req, res) => {
  res.type('text/plain; charset=utf-8').send('CIMON 견적 파일 에이전트가 실행 중입니다.');
});

app.use('/files', (req, res) => {
  try {
    const raw = req.url.split('?')[0].replace(/^\/+/, '');
    if (!raw) return res.status(404).send('Not found');
    const relative = decodeURIComponent(raw);
    const absolute = resolve(join(STORAGE_ROOT, relative));
    if (absolute !== STORAGE_ROOT && !absolute.startsWith(STORAGE_ROOT + sep)) {
      return res.status(403).send('Forbidden');
    }
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      return res.status(404).send('Not found');
    }
    res.sendFile(absolute);
  } catch (err) {
    res.status(500).send(String(err.message || err));
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`[에이전트] 파일 서버: ${PUBLIC_BASE_URL || `http://0.0.0.0:${HTTP_PORT}`}/files/...`);
});

// ── 시작 ───────────────────────────────────────────────────────────────────
mkdirSync(STORAGE_ROOT, { recursive: true });
console.log('[에이전트] CIMON 견적 파일 로컬 저장 에이전트 시작');
console.log(`[에이전트] Drive 대기 폴더: ${PENDING_DIR}`);
console.log(`[에이전트] 저장 루트: ${STORAGE_ROOT}`);
console.log(`[에이전트] 템플릿: ${TEMPLATE_PATH}`);
console.log(`[에이전트] 폴링 주기: ${POLL_INTERVAL_MS}ms`);
startPolling();
