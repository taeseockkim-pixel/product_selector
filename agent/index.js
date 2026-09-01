/**
 * CIMON 견적 파일 로컬 저장 에이전트
 *
 * 역할:
 *  1. Apps Script "저장대기열"을 폴링하여 저장 대기 견적을 가져온다 (HTTPS 아웃바운드)
 *  2. 견적서 샘플.xlsx 템플릿에 데이터를 채워 XLSX 생성 (server/fillTemplate.js 재사용)
 *  3. Excel COM으로 PDF 변환 (server/excelToPdf.js 재사용 — 이 PC에 Excel 필요)
 *  4. 부서별 보안 폴더에 저장: {storageRoot}\{부서}\{연도}\{견적번호}_{업체명}\
 *  5. 완료 보고 → Apps Script가 견적관리대장의 파일링크를 사내 다운로드 URL로 갱신
 *  6. 사내 PC에서 견적 파일을 내려받을 수 있는 HTTP 파일 서버도 함께 구동
 *
 * 실행: agent/config.json 준비 후 `npm run agent` (프로젝트 루트에서)
 * 요구: Node.js 18+, Windows + Excel(이 PC), 상시 가동 권장
 */

import { readFileSync, existsSync, mkdirSync, statSync } from 'fs';
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
  console.error('[에이전트]   잘못된 예: "storageRoot": "D:\\folders\\공유\\견적서"');
  console.error('[에이전트]   올바른 예: "storageRoot": "D:/folders/공유/견적서"');
  console.error('[에이전트]   또는     : "storageRoot": "D:\\\\folders\\\\공유\\\\견적서"');
  process.exit(1);
}

const TOKEN = String(config.agentToken || '');
const AGENT_URL = String(config.appsScriptAgentUrl || '');
const STORAGE_ROOT = resolve(String(config.storageRoot || 'D:\\견적서'));
const DEFAULT_DEPARTMENT = String(config.defaultDepartment || '기술영업');
const PUBLIC_BASE_URL = String(config.publicBaseUrl || '').replace(/\/+$/, '');
const HTTP_PORT = Number(config.httpPort || 8790);
const POLL_INTERVAL_MS = Number(config.pollIntervalMs || 30000);
const TEMPLATE_PATH = resolve(__dirname, String(config.templatePath || 'templates/견적서 샘플.xlsx'));

if (!TOKEN || !AGENT_URL) {
  console.error('[에이전트] config.json에 agentToken과 appsScriptAgentUrl을 모두 입력해 주세요.');
  process.exit(1);
}
if (AGENT_URL.includes('여기에')) {
  console.error('[에이전트] appsScriptAgentUrl에 아직 배포 URL을 입력하지 않았습니다.');
  console.error('[에이전트] Apps Script 편집기 → 배포 → 새 배포 → 웹 앱 → 액세스: 누구나 로 배포한 URL을 넣어 주세요.');
  process.exit(1);
}
try {
  const agentOrigin = new URL(AGENT_URL).origin;
  console.log(`[에이전트] Apps Script 엔드포인트: ${agentOrigin}`);
  if (!AGENT_URL.endsWith('/exec')) {
    console.warn('[에이전트] 경고: appsScriptAgentUrl이 /exec로 끝나지 않습니다. 배포 관리의 웹 앱 URL을 그대로 붙여넣어 주세요.');
  }
} catch {
  console.error(`[에이전트] appsScriptAgentUrl이 올바른 URL이 아닙니다: ${AGENT_URL}`);
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

// Node fetch 실패 시 원인 코드(ENOTFOUND, ECONNREFUSED 등)를 로그에 남긴다.
function describeError(err) {
  const cause = err?.cause;
  const causeInfo = cause ? ` [원인: ${cause.code || ''} ${cause.message || ''}]` : '';
  return `${err.message || err}${causeInfo}`;
}

function printSelfSignedCertGuidance() {
  console.error('[에이전트] 회사 네트워크의 SSL 검사(보안 프로그램)가 구글 연결의 인증서를 대체하고 있습니다.');
  console.error('[에이전트] 해결 방법 1 (권장): 그 PC의 브라우저에서 https://script.google.com 접속');
  console.error('[에이전트]   → 주소창 자물쇠 아이콘 → 인증서(연결이 안전함) → 인증서 보기');
  console.error('[에이전트]   → 인증 경로의 최상위(루트) 인증서 선택 → 세부 정보 → "파일에 복사"');
  console.error('[에이전트]   → Base-64 인코딩 X.509로 내보내 agent\\corp-ca.pem 으로 저장한 뒤 재시작');
  console.error('[에이전트]   (또는 certmgr.msc → 신뢰할 수 있는 루트 인증 기관에서 회사 CA를 Base-64로 내보내기)');
  console.error('[에이전트] 해결 방법 2 (임시): agent\\allow-insecure-tls 라는 이름의 빈 파일을 만들고 재시작');
  console.error('[에이전트]   → 인증서 검증을 건너뜁니다. 보안상 임시 확인 용도로만 사용하세요.');
}

async function callAppsScript(body) {
  const res = await fetch(AGENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  });
  const text = await res.text();
  if (res.status === 401 || res.status === 403 || /userCodeAppPanel|accounts\.google\.com|ppConfig/.test(text)) {
    throw new Error(
      `Apps Script 인증 오류 (HTTP ${res.status}). 에이전트용 배포의 액세스가 '모든 사용자'(익명 허용)로 설정되어 있는지, ` +
      `config.json의 URL이 그 배포의 /exec 주소와 일치하는지 확인하세요. (Google 계정이 필요한 배포는 익명 요청 시 로그인 페이지를 반환합니다)`
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Apps Script 응답이 JSON이 아닙니다 (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
}

function quoteYear(details) {
  const match = String(details?.quoteDate || '').match(/(\d{4})/);
  return match ? match[1] : String(new Date().getFullYear());
}

// ── 견적 1건 처리 ──────────────────────────────────────────────────────────
async function processJob(job) {
  const payload = job.payload || {};
  const details = payload.details || {};
  const items = payload.items || [];

  const department = safeSegment(job.department || details.authorDepartment || DEFAULT_DEPARTMENT) || DEFAULT_DEPARTMENT;
  const year = quoteYear(details);
  const folderName = `${safeSegment(job.quoteNumber)}_${safeSegment(details.clientName)}`;
  const folder = join(STORAGE_ROOT, department, year, folderName);
  mkdirSync(folder, { recursive: true });

  const xlsxFileName = `${safeSegment(job.quoteNumber)}_${safeSegment(details.clientName)}_견적서.xlsx`;
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

  return {
    id: job.id,
    ok: true,
    department,
    quoteNumber: job.quoteNumber,
    year,
    fileUrl,
    localPath: folder,
  };
}

// ── 폴링 루프 ───────────────────────────────────────────────────────────────
let running = false;

async function pollOnce() {
  if (running) return;
  running = true;
  try {
    const claim = await callAppsScript({ action: 'AGENT_CLAIM', token: TOKEN });
    if (!claim?.success) {
      console.warn(`[에이전트] 클레임 실패: ${claim?.message ?? '알 수 없는 오류'}`);
      return;
    }
    const jobs = claim.jobs || [];
    if (jobs.length === 0) return;

    console.log(`[에이전트] 저장 대기 견적 ${jobs.length}건 처리 시작`);
    const results = [];
    for (const job of jobs) {
      try {
        const result = await processJob(job);
        results.push(result);
        console.log(`[에이전트] 저장 완료: ${result.quoteNumber} → ${result.localPath}`);
      } catch (err) {
        console.error(`[에이전트] 저장 실패 (${job.quoteNumber}): ${err.message}`);
        results.push({ id: job.id, ok: false, error: String(err.message || err) });
      }
    }
    await completeResults(results);
  } catch (err) {
    console.error(`[에이전트] 폴링 오류: ${describeError(err)}`);
    if (String(err?.cause?.code || '').includes('SELF_SIGNED_CERT') || String(err?.message || '').includes('SELF_SIGNED_CERT')) {
      printSelfSignedCertGuidance();
    }
  } finally {
    running = false;
  }
}

async function completeResults(results) {
  if (results.length === 0) return;
  const response = await callAppsScript({ action: 'AGENT_COMPLETE', token: TOKEN, results });
  if (!response?.success) {
    console.warn(`[에이전트] 완료 보고 실패: ${response?.message ?? '알 수 없는 오류'}`);
  }
}

function startPolling() {
  void pollOnce().finally(() => {
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
console.log(`[에이전트] 저장 루트: ${STORAGE_ROOT}`);
console.log(`[에이전트] 템플릿: ${TEMPLATE_PATH}`);
console.log(`[에이전트] 폴링 주기: ${POLL_INTERVAL_MS}ms`);
startPolling();
