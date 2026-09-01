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

import { readFileSync, existsSync, mkdirSync, statSync, unlinkSync, writeFileSync, readdirSync } from 'fs';
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
if (!existsSync(PENDING_DIR)) {
  console.error(`[에이전트] 대기 폴더를 찾을 수 없습니다: ${PENDING_DIR}`);
  if (existsSync(join(AGENT_FOLDER, 'package.json')) || existsSync(join(AGENT_FOLDER, 'agent'))) {
    console.error('[에이전트] 지정된 폴더는 프로젝트 폴더로 보입니다. agentFolderPath에는 프로젝트 폴더가 아니라');
    console.error('[에이전트] Google Drive 데스크톱이 동기화하는 "견적에이전트" 폴더의 로컬 경로를 입력해야 합니다.');
    console.error('[에이전트]   예: "G:/공유 드라이브/견적서/견적에이전트"');
  }
  console.error('[에이전트] 확인 사항:');
  console.error('[에이전트]  1. 이 PC에 Google Drive 데스크톱이 설치되어 있고 회사 계정으로 로그인되어 있는가');
  console.error('[에이전트]  2. Drive에서 "견적에이전트" 폴더가 동기화되고 있는가 (견적 저장이 1회 이상 있으면 자동 생성됨)');
  console.error('[에이전트]  3. config.json의 agentFolderPath가 그 폴더의 실제 로컬 경로와 일치하는가');
  process.exit(1);
}
if (!existsSync(RESULTS_DIR)) {
  mkdirSync(RESULTS_DIR, { recursive: true });
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
  try {
    const result = {
      quoteNumber: details.quoteNumber ?? '',
      department: details.authorDepartment ?? '',
      year: quoteYear(details),
      ok: false,
      error: String(errorMessage),
    };
    writeFileSync(join(RESULTS_DIR, `${safeSegment(details.quoteNumber) || fileName}.json`), JSON.stringify(result), 'utf8');
    unlinkSync(join(PENDING_DIR, fileName));
  } catch (err) {
    console.error(`[에이전트] 실패 보고 기록 오류 (${fileName}): ${err.message}`);
  }
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
      fileNames = readdirSync(PENDING_DIR).filter((f) => f.endsWith('.json'));
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

      console.log(`[에이전트] 저장 대기 견적 처리 시작: ${payload.details.quoteNumber ?? fileName}`);
      try {
        await processJob(fileName);
        jobAttempts.delete(fileName);
        console.log(`[에이전트] 저장 완료: ${payload.details.quoteNumber}`);
      } catch (err) {
        const attempts = (jobAttempts.get(fileName) || 0) + 1;
        jobAttempts.set(fileName, attempts);
        console.error(`[에이전트] 저장 실패 (${attempts}/${MAX_JOB_ATTEMPTS}) ${payload.details.quoteNumber}: ${err.message}`);
        if (attempts >= MAX_JOB_ATTEMPTS) {
          jobAttempts.delete(fileName);
          reportJobFailure(fileName, payload, err.message);
          console.error(`[에이전트] ${MAX_JOB_ATTEMPTS}회 실패 — 실패 보고를 기록했습니다.`);
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
