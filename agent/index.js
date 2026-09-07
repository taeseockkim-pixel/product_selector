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

import { readFileSync, existsSync, mkdirSync, statSync, unlinkSync, writeFileSync, readdirSync, copyFileSync, appendFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join, dirname, resolve, sep, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { createHmac, timingSafeEqual } from 'crypto';
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
const FILE_LINK_SECRET = String(config.fileLinkSecret || '');
// 부서별 폴더 브라우저 비밀번호: { 부서: 비밀번호 }. adminPassword가 설정되어 있으면
// 모든 부서 폴더를 열람할 수 있는 관리자 비밀번호로 동작한다.
const FOLDER_PASSWORDS = config.folderPasswords && typeof config.folderPasswords === 'object' ? config.folderPasswords : {};
const ADMIN_PASSWORD = String(config.adminPassword || '');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 로그인 유지 12시간
const POLL_INTERVAL_MS = Number(config.pollIntervalMs || 10000);
const TEMPLATE_PATH = resolve(__dirname, String(config.templatePath || 'templates/견적서 샘플.xlsx'));
const MAX_JOB_ATTEMPTS = 3;
const ITEMS_PER_FILE = 14;
const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024; // 1GB

const PENDING_DIR = join(AGENT_FOLDER, 'pending');
const RESULTS_DIR = join(AGENT_FOLDER, 'results');
const DELIVERY_DIR = join(AGENT_FOLDER, 'delivery');
const LOG_ROOT = join(STORAGE_ROOT, 'LOG');
try {
  mkdirSync(LOG_ROOT, { recursive: true });
} catch { /* noop */ }

/**
 * 계정별·일자별 활동 로그 기록
 * 저장 경로: {STORAGE_ROOT}/LOG/{계정}/{YYYY-MM-DD}.log
 * 통합 경로: {STORAGE_ROOT}/LOG/전체_{YYYY-MM-DD}.log
 */
function appendActivityLog(account, eventType, detailText) {
  try {
    const rawAccount = String(account || 'unknown').trim().toLowerCase();
    const safeAccount = safeSegment(rawAccount) || 'unknown';
    const accountDir = join(LOG_ROOT, safeAccount);
    mkdirSync(accountDir, { recursive: true });

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${dateStr} ${hh}:${min}:${ss}`;

    const line = `[${timeStr}] [${eventType}] [${rawAccount}] ${detailText}\n`;

    // 1. 계정별 폴더 안의 일자별 로그 파일에 기록
    const accountLogPath = join(accountDir, `${dateStr}.log`);
    appendFileSync(accountLogPath, line, 'utf8');

    // 2. LOG 폴더 루트의 날짜별 전체 통합 로그에도 기록
    const allLogPath = join(LOG_ROOT, `전체_${dateStr}.log`);
    appendFileSync(allLogPath, line, 'utf8');

    console.log(`[로그] [${eventType}] [${rawAccount}] ${detailText}`);
  } catch (err) {
    console.error(`[로그 기록 실패] ${describeError(err)}`);
  }
}

if (!AGENT_FOLDER) {
  console.error('[에이전트] config.json에 agentFolderPath를 입력해 주세요 (Drive 동기화된 견적에이전트 폴더 경로).');
  process.exit(1);
}
// Drive 가상 드라이브는 세션/권한에 따라 보이지 않을 수 있어 단계별로 가시성을 검사한다.
let folderReady = true;
try {
  mkdirSync(PENDING_DIR, { recursive: true });
  mkdirSync(RESULTS_DIR, { recursive: true });
  mkdirSync(DELIVERY_DIR, { recursive: true });
} catch (err) {
  console.error(`[에이전트] pending/results 폴더를 생성하지 못했습니다: ${describeError(err)}`);
  process.exit(1);
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
if (!FILE_LINK_SECRET) {
  console.error('[에이전트] config.json에 fileLinkSecret을 입력해 주세요.');
  console.error('[에이전트] 이 값은 견적 파일 링크의 부서 접근 제어 서명에 사용됩니다 (유출 금지).');
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

// Node 오류의 원인 코드(ENOTFOUND, EACCES 등)까지 로그에 남긴다.
function describeError(err) {
  const cause = err?.cause;
  const causeInfo = cause ? ` [원인: ${cause.code || ''} ${cause.message || ''}]` : '';
  return `${err.message || err}${causeInfo}`;
}

// 파일 상대 경로에 대한 부서 접근 제어 서명 (HMAC-SHA256)
function signRelativePath(relativePath) {
  return createHmac('sha256', FILE_LINK_SECRET).update(String(relativePath)).digest('hex');
}

function verifyRelativePathSignature(relativePath, signature) {
  const expected = Buffer.from(signRelativePath(relativePath), 'utf8');
  const given = Buffer.from(String(signature || ''), 'utf8');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ── 폴더 브라우저 세션/비밀번호 ────────────────────────────────────────────
function safeEqualStr(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function signSession(value) {
  return createHmac('sha256', FILE_LINK_SECRET).update(value).digest('hex');
}

function makeSessionCookie(department) {
  const expires = Date.now() + SESSION_TTL_MS;
  const value = `${department}|${expires}`;
  return `session=${encodeURIComponent(value)}.${signSession(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

function readSession(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/(?:^|;\s*)session=([^;]+)/);
  if (!match) return null;
  const raw = decodeURIComponent(match[1]);
  const idx = raw.lastIndexOf('.');
  if (idx === -1) return null;
  const value = raw.slice(0, idx);
  const signature = raw.slice(idx + 1);
  if (!safeEqualStr(signature, signSession(value))) return null;
  const sepIdx = value.lastIndexOf('|');
  if (sepIdx === -1) return null;
  const department = value.slice(0, sepIdx);
  const expires = Number(value.slice(sepIdx + 1));
  if (!Number.isFinite(expires) || expires < Date.now()) return null;
  return { department };
}

// 비밀번호 → 열람 가능 부서. adminPassword는 모든 부서('*')를 반환한다.
function checkFolderPassword(password) {
  const input = String(password || '');
  if (!input) return null;
  for (const [department, deptPassword] of Object.entries(FOLDER_PASSWORDS)) {
    if (deptPassword && safeEqualStr(input, deptPassword)) return { department };
  }
  if (ADMIN_PASSWORD && safeEqualStr(input, ADMIN_PASSWORD)) return { department: '*' };
  return null;
}

function escHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function quoteYear(details) {
  // Apps Script가 수정본 저장 시 원본 대장 연도(revisionYear)를 currentYear로 확정해 담아준다.
  // details.quoteDate는 항상 "오늘"이므로 연도 폴더 결정에는 details.year를 우선 사용해야 한다.
  const explicitYear = Number(details?.year);
  if (Number.isInteger(explicitYear) && explicitYear >= 2000 && explicitYear <= 2100) {
    return String(explicitYear);
  }
  const match = String(details?.quoteDate || '').match(/(\d{4})/);
  return match ? match[1] : String(new Date().getFullYear());
}

function splitItems(items) {
  const parts = [];
  for (let index = 0; index < items.length; index += ITEMS_PER_FILE) {
    parts.push(items.slice(index, index + ITEMS_PER_FILE));
  }
  return parts.length > 0 ? parts : [[]];
}

function partQuoteNumber(baseQuoteNumber, partIndex, partCount) {
  return partCount > 1 ? `${baseQuoteNumber}_${partIndex + 1}` : baseQuoteNumber;
}

function vatTotalForItems(items) {
  const supplyTotal = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  return Math.round(supplyTotal * 1.1);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Apps Script가 delivery 폴더에 넣어둔 대장 사본(XLSX)을 기다렸다가
// 견적 연도 폴더(견적 폴더들의 부모)에 {연도}_견적관리대장.xlsx로 복사한다.
async function waitForLedgerCopy(quoteNumber, yearFolder, year) {
  const ledgerName = `${year}_견적관리대장.xlsx`;
  const source = join(DELIVERY_DIR, `대장_${safeSegment(quoteNumber)}.xlsx`);
  const target = join(yearFolder, ledgerName);
  const deadline = Date.now() + 45000;

  while (Date.now() < deadline) {
    if (existsSync(source)) {
      try {
        copyFileSync(source, target);
        try { unlinkSync(source); } catch { /* 동기화 중 잠금 — 남아있어도 무해 */ }
        return target;
      } catch {
        // 동기화 중 복사 실패 — 잠시 후 재시도
      }
    }
    await delay(2000);
  }
  return '';
}

// ── 견적 1건 처리 ──────────────────────────────────────────────────────────
// 작성자 시트 값이 비정상('.', '..', 공란)이면 경로 탈출을 막기 위해 기본 부서로 대체한다.
function safeDepartmentSegment(value) {
  const segment = safeSegment(value);
  return (segment && segment !== '.' && segment !== '..') ? segment : DEFAULT_DEPARTMENT;
}

// 같은 견적번호(baseQuoteNumber)로 이미 만들어진 폴더가 있으면 그 폴더를 그대로 재사용한다.
// 계산된 이름(`baseQuoteNumber_folderClientName`)이 실제 폴더명과 정확히 일치하지 않는 경우
// (업체명 표기 차이, 사람이 폴더명을 직접 수정한 경우 등)에도 수정본(Rev) 파일이 별도의 새
// 폴더가 아니라 원본과 같은 폴더에 들어가도록 하기 위함이다. 일치하는 폴더가 없거나 후보가
// 여럿이라 모호한 경우에는 계산된 경로를 그대로 사용한다(기존 동작과 동일, 신규 생성 허용).
function resolveExistingQuoteFolder_(yearDir, baseQuoteNumber, computedFolderName) {
  const computedPath = join(yearDir, computedFolderName);
  if (existsSync(computedPath) && statSync(computedPath).isDirectory()) return computedPath;
  if (!existsSync(yearDir)) return computedPath;
  try {
    const prefix = `${baseQuoteNumber}_`;
    const candidates = readdirSync(yearDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name.startsWith(prefix));
    if (candidates.length === 1) return join(yearDir, candidates[0].name);
  } catch {
    // 연도 폴더를 읽을 수 없으면(권한 등) 계산된 경로로 진행한다.
  }
  return computedPath;
}

async function processJob(fileName) {
  const jsonPath = join(PENDING_DIR, fileName);
  const payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const details = payload.details || {};
  const items = payload.items || [];

  const department = safeDepartmentSegment(details.authorDepartment || DEFAULT_DEPARTMENT);
  const year = quoteYear(details);
  const outputQuoteNumber = safeSegment(details.quoteNumber);
  const baseQuoteNumber = safeSegment(details.baseQuoteNumber || details.quoteNumber);
  const itemParts = splitItems(items);
  const folderName = `${baseQuoteNumber}_${safeSegment(details.folderClientName || details.clientName)}`;
  const yearDir = join(STORAGE_ROOT, department, year);
  const folder = resolveExistingQuoteFolder_(yearDir, baseQuoteNumber, folderName);
  mkdirSync(folder, { recursive: true });

  const pdfFileNames = [];
  for (let partIndex = 0; partIndex < itemParts.length; partIndex += 1) {
    const partItems = itemParts[partIndex];
    const partNumber = partQuoteNumber(outputQuoteNumber, partIndex, itemParts.length);
    const xlsxFileName = `${partNumber}_${safeSegment(details.clientName)}_견적서.xlsx`;
    const pdfFileName = xlsxFileName.replace(/\.xlsx$/, '.pdf');
    const xlsxPath = join(folder, xlsxFileName);
    const pdfPath = join(folder, pdfFileName);
    const quote = {
      quoteNumber: partNumber,
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
      items: partItems,
      vatTotal: vatTotalForItems(partItems),
    };

    await fillQuoteTemplate(quote, xlsxPath, TEMPLATE_PATH);
    excelToPdf(xlsxPath, pdfPath);
    pdfFileNames.push(pdfFileName);
  }

  // 견적 연도 폴더에 최신 견적관리대장 사본을 함께 유지한다 (Drive의 대장과 동일한 레이아웃)
  const yearFolder = dirname(folder);
  const ledgerCopy = await waitForLedgerCopy(safeSegment(details.quoteNumber), yearFolder, year);
  if (ledgerCopy) {
    console.log(`[에이전트] 대장 사본 갱신: ${ledgerCopy}`);
  } else {
    console.warn(`[에이전트] 대장 사본 미수신 — 도착 시 자동 복사하도록 대기열에 등록합니다 (${year}년)`);
    deferredLedgerCopies.set(safeSegment(details.quoteNumber), {
      quoteNumber: details.quoteNumber ?? '',
      yearFolder,
      year,
      attempts: 0,
      firstAt: Date.now(),
    });
  }

  const relativePath = [department, year, folderName, pdfFileNames[0]].map(encodeURIComponent).join('/');
  const signature = signRelativePath(decodeURIComponent(relativePath));
  const fileUrl = PUBLIC_BASE_URL
    ? `${PUBLIC_BASE_URL}/files/${relativePath}?k=${signature}`
    : '';

  const result = {
    quoteNumber: details.quoteNumber ?? '',
    ledgerQuoteNumber: details.baseQuoteNumber || details.quoteNumber || '',
    revisionNumber: Number(details.revisionNumber) || 0,
    department,
    year,
    ok: true,
    fileUrl,
    fileUrls: pdfFileNames.map((pdfFileName) => {
      const partPath = [department, year, folderName, pdfFileName].map(encodeURIComponent).join('/');
      const partSignature = signRelativePath(decodeURIComponent(partPath));
      return PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}/files/${partPath}?k=${partSignature}` : '';
    }),
    localPath: folder,
  };
  writeFileSync(join(RESULTS_DIR, `${safeSegment(details.quoteNumber)}.json`), JSON.stringify(result), 'utf8');
  unlinkSync(jsonPath);

  // ── 활동 로그 기록 (저장 / 수정 / 이메일 송부) ──
  const account = details.authorEmail || details.authorName || 'unknown';
  const isRevision = Number(details.revisionNumber || 0) > 0;
  const totalPriceNum = Number(payload.vatTotal || vatTotalForItems(items));
  const amountStr = Number.isFinite(totalPriceNum) ? `${totalPriceNum.toLocaleString('ko-KR')}원` : '-';

  if (isRevision) {
    const revStr = `Rev${String(details.revisionNumber).padStart(2, '0')}`;
    const detail = `견적번호: ${details.quoteNumber || ''} (${revStr}) | 원본번호: ${details.baseQuoteNumber || ''} | 업체명: ${details.clientName || ''} | 부서: ${department} | 작성자: ${details.authorName || ''} | 금액: ${amountStr} | 파일수: ${pdfFileNames.length}개`;
    appendActivityLog(account, '수정', detail);
  } else {
    const detail = `견적번호: ${details.quoteNumber || ''} | 업체명: ${details.clientName || ''} | 부서: ${department} | 작성자: ${details.authorName || ''} | 품목수: ${items.length}건 | 금액: ${amountStr} | 파일수: ${pdfFileNames.length}개`;
    appendActivityLog(account, '저장', detail);
  }

  if (payload.createDraft) {
    const subject = payload.customSubject || `[CIMON] ${details.clientName} - 제품 견적서 송부 드립니다.`;
    const detail = `견적번호: ${details.quoteNumber || ''} | 수신: ${details.clientEmail || ''} | 제목: ${subject}`;
    appendActivityLog(account, '이메일 송부', detail);
  }
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
// 처리 시점에 대장 사본이 아직 동기화되지 않은 건 — 도착 시 연도 폴더에 복사한다
const deferredLedgerCopies = new Map();
let processing = false;

async function pollPending() {
  if (processing) return;
  processing = true;
  try {
    await processDeferredLedgerCopies();
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

// 처리 시점에 받지 못한 대장 사본을 최대 15분간 재확인하며 늦게 도착하면 복사한다.
async function processDeferredLedgerCopies() {
  if (deferredLedgerCopies.size === 0) return;
  for (const [key, info] of [...deferredLedgerCopies]) {
    const source = join(DELIVERY_DIR, `대장_${safeSegment(info.quoteNumber)}.xlsx`);
    const target = join(info.yearFolder, `${info.year}_견적관리대장.xlsx`);
    if (Date.now() - info.firstAt > 15 * 60 * 1000) {
      deferredLedgerCopies.delete(key);
      console.warn(`[에이전트] 대장 사본 수신 대기 포기 (15분 초과): ${info.quoteNumber}`);
      continue;
    }
    if (!existsSync(source)) {
      info.attempts += 1;
      continue;
    }
    try {
      copyFileSync(source, target);
      try { unlinkSync(source); } catch { /* 동기화 중 잠금 — 남아있어도 무해 */ }
      deferredLedgerCopies.delete(key);
      console.log(`[에이전트] 대장 사본 갱신(지연 처리): ${target}`);
    } catch {
      info.attempts += 1; // 동기화 중 복사 실패 — 다음 폴링에서 재시도
    }
  }
}

function startPolling() {
  void pollPending().finally(() => {
    setTimeout(startPolling, POLL_INTERVAL_MS);
  });
}

// ── 사내 파일 브라우저/다운로드 서버 ───────────────────────────────────────
const app = express();
app.use(express.urlencoded({ extended: false }));
// JSON 본문 파서는 /upload 라우트에만 적용한다 — 로그인 등 다른 모든 요청이 인증 전에
// 대용량 버퍼링을 강제로 겪지 않도록 앱 전체에는 걸지 않는다.
// base64로 인코딩하면 원본 크기의 4/3배가 되므로(1GB → 약 1.33GB), 여유를 두고 1400mb로 설정한다.
const uploadJsonParser = express.json({ limit: '1400mb' });

const PAGE_STYLE = `
    body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; background: #f0ede8; margin: 0; padding: 40px 16px; }
    .card { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #ddd9d2; border-radius: 12px; padding: 28px; }
    h1 { font-size: 18px; color: #191919; margin: 0 0 6px; }
    .sub { color: #999999; font-size: 12px; margin-bottom: 20px; }
    input[type=password] { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #ddd9d2; border-radius: 8px; font-size: 14px; }
    button { margin-top: 12px; width: 100%; padding: 10px 12px; background: #2563eb; color: #fff; border: 0; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; }
    .error { color: #dc2626; font-size: 13px; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td, th { padding: 8px 10px; border-bottom: 1px solid #eee; text-align: left; }
    th { color: #555; font-size: 12px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .crumb { font-size: 13px; color: #555; margin-bottom: 14px; word-break: break-all; }
    .crumb a { color: #555; }
    .top { display: flex; justify-content: space-between; align-items: center; }
    .logout { font-size: 12px; color: #999; }
    .btn-action { display: inline-block; padding: 3px 8px; font-size: 11px; border-radius: 4px; text-decoration: none !important; font-weight: 500; }
    .btn-view { color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; margin-right: 4px; }
    .btn-view:hover { background: #dbeafe; }
    .btn-down { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
    .btn-down:hover { background: #dcfce7; }`.trim();

function safeNextPath(value) {
  const next = String(value || '').trim();
  // "/\evil.com"처럼 백슬래시로 시작하는 경로는 브라우저가 "//evil.com"(프로토콜 상대 URL)으로
  // 해석해 로그인 후 외부 사이트로 리다이렉트될 수 있으므로, 두 번째 문자도 "/"·"\"가 아니어야 한다.
  return /^\/[^/\\]/.test(next) ? next : '/browse';
}

function loginPageHtml(errorMessage = '', nextPath = '') {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CIMON 견적 파일 열람</title>
<style>${PAGE_STYLE}</style></head>
<body><div class="card">
  <h1>CIMON 견적 파일 열람</h1>
  <div class="sub">부서별 견적 폴더 — 접속 비밀번호를 입력해 주세요</div>
  <form method="POST" action="/login">
    ${nextPath ? `<input type="hidden" name="next" value="${escHtml(nextPath)}">` : ''}
    <input type="password" name="password" placeholder="비밀번호" autofocus required>
    <button type="submit">접속</button>
    ${errorMessage ? `<div class="error">${escHtml(errorMessage)}</div>` : ''}
  </form>
</div></body></html>`;
}

function browserPageHtml(session, dirRelative, entries) {
  const departmentLabel = session.department === '*' ? '전체 부서 (관리자)' : escHtml(session.department);
  const crumbParts = [`<a href="/browse">홈</a>`];
  let acc = '';
  for (const part of dirRelative.split('/').filter(Boolean)) {
    acc = acc ? `${acc}/${part}` : part;
    crumbParts.push(`<a href="/browse?dir=${encodeURIComponent(acc)}">${escHtml(part)}</a>`);
  }
  const rows = entries.map((entry) => {
    if (entry.isFolder) {
      return `<tr><td>📁 <a href="/browse?dir=${encodeURIComponent(entry.browsePath)}">${escHtml(entry.name)}</a></td><td>폴더</td><td style="text-align:center; color:#ccc;">-</td></tr>`;
    }
    const viewUrl = `/view?path=${encodeURIComponent(entry.downloadPath)}`;
    const downUrl = `/download?path=${encodeURIComponent(entry.downloadPath)}`;
    return `<tr>` +
      `<td>📄 <a href="${viewUrl}" target="_blank" rel="noopener noreferrer">${escHtml(entry.name)}</a></td>` +
      `<td>${entry.size}</td>` +
      `<td style="white-space:nowrap; text-align:center;">` +
      `<a href="${viewUrl}" target="_blank" rel="noopener noreferrer" class="btn-action btn-view" title="새 탭에서 열기">열기</a>` +
      `<a href="${downUrl}" class="btn-action btn-down" title="파일 다운로드">다운로드</a>` +
      `</td>` +
      `</tr>`;
  }).join('');
  const emptyRow = entries.length === 0 ? `<tr><td colspan="3" style="color:#999; text-align:center; padding:16px;">파일이 없습니다.</td></tr>` : '';
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CIMON 견적 파일 열람</title>
<style>${PAGE_STYLE}</style></head>
<body><div class="card">
  <div class="top">
    <div><h1>CIMON 견적 파일 열람</h1><div class="sub">부서: ${departmentLabel}</div></div>
    <a class="logout" href="/logout">로그아웃</a>
  </div>
  <div class="crumb">${crumbParts.join(' &gt; ')}</div>
  <table><tr><th>이름</th><th style="width:75px;">크기</th><th style="width:130px; text-align:center;">동작</th></tr>${rows}${emptyRow}</table>
  </div></body></html>`;
}

function resolveQuoteFolder(session, values) {
  const year = String(values.year || '').trim();
  if (!/^\d{4}$/.test(year)) return null;

  let department = session.department;
  if (session.department === '*') {
    department = safeSegment(values.department);
    const allowedDepartments = new Set([DEFAULT_DEPARTMENT, ...Object.keys(FOLDER_PASSWORDS)]);
    if (!allowedDepartments.has(department)) return null;
  }
  const quoteNumber = safeSegment(String(values.quoteNumber || '').replace(/_Rev\d+$/i, ''));
  const company = safeSegment(values.company);
  if (!department || !quoteNumber || !company) return null;

  const departmentRoot = resolve(join(STORAGE_ROOT, department));
  const yearRoot = resolve(join(departmentRoot, year));
  if (!yearRoot.startsWith(departmentRoot + sep) || !existsSync(yearRoot) || !statSync(yearRoot).isDirectory()) return null;

  const exactTarget = resolve(join(yearRoot, `${quoteNumber}_${company}`));
  let target = exactTarget;
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    const candidates = readdirSync(yearRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name.startsWith(`${quoteNumber}_`));
    if (candidates.length !== 1) return null;
    target = resolve(join(yearRoot, candidates[0].name));
  }
  if (!target.startsWith(yearRoot + sep) || !existsSync(target) || !statSync(target).isDirectory()) return null;
  const authorEmail = String(values.authorEmail || values.email || '').trim().toLowerCase();
  return { department, year, quoteNumber, company, target, folderName: basename(target), authorEmail };
}

function uploadPageHtml(session, targetInfo, message = '', isError = false) {
  const departmentLabel = session.department === '*' ? `전체 부서 (관리자) / ${escHtml(targetInfo.department)}` : escHtml(session.department);
  const statusClass = isError ? 'error' : 'success';
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CIMON 견적 서류 업로드</title>
<style>${PAGE_STYLE} .hint { color:#777; font-size:12px; line-height:1.6; margin:12px 0 18px; } .success { color:#15803d; font-size:13px; margin-top:12px; } .error { color:#dc2626; font-size:13px; margin-top:12px; } input[type=file] { width:100%; box-sizing:border-box; padding:9px; border:1px solid #ddd9d2; border-radius:8px; background:#fff; }</style></head>
<body><div class="card">
  <div class="top">
    <div><h1>견적 서류 업로드</h1><div class="sub">부서: ${departmentLabel}</div></div>
    <a class="logout" href="/browse">목록으로</a>
  </div>
  <div class="crumb">대상 폴더: ${escHtml(targetInfo.folderName)}</div>
  <p class="hint">발주서, 사업자등록증, 발표자료(PPT) 등 대부분의 파일 형식을 업로드할 수 있습니다(실행 파일 등 일부 형식은 제외). 파일당 최대 1GB입니다.</p>
  <form id="uploadForm">
    <input type="hidden" id="uploadYear" value="${escHtml(targetInfo.year)}">
    <input type="hidden" id="uploadDepartment" value="${escHtml(targetInfo.department)}">
    <input type="hidden" id="uploadQuoteNumber" value="${escHtml(targetInfo.quoteNumber)}">
    <input type="hidden" id="uploadCompany" value="${escHtml(targetInfo.company)}">
    <input type="hidden" id="uploadAuthorEmail" value="${escHtml(targetInfo.authorEmail || '')}">
    <input id="fileInput" type="file" required>
    <button type="submit">업로드</button>
    <div id="status" class="${statusClass}">${escHtml(message)}</div>
  </form>
</div>
<script>
  const form = document.getElementById('uploadForm');
  const input = document.getElementById('fileInput');
  const status = document.getElementById('status');
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
      reader.readAsDataURL(file);
    });
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = input.files[0];
    if (!file) return;
    status.className = '';
    status.textContent = '업로드 중...';
    try {
      const content = await toBase64(file);
      const response = await fetch('/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: document.getElementById('uploadYear').value,
          department: document.getElementById('uploadDepartment').value,
          quoteNumber: document.getElementById('uploadQuoteNumber').value,
          company: document.getElementById('uploadCompany').value,
          authorEmail: document.getElementById('uploadAuthorEmail').value,
          fileName: file.name,
          content,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || '업로드에 실패했습니다.');
      status.className = 'success';
      status.textContent = '업로드 완료: ' + result.fileName;
      form.reset();
    } catch (error) {
      status.className = 'error';
      status.textContent = String(error);
    }
  });
</script>
</body></html>`;
}

app.get('/', (req, res) => {
  const nextPath = safeNextPath(req.query.next);
  if (readSession(req)) return res.redirect(nextPath);
  res.type('html').send(loginPageHtml('', String(req.query.next || '')));
});

app.post('/login', (req, res) => {
  const session = checkFolderPassword(req.body?.password);
  if (!session) {
    res.status(401).type('html').send(loginPageHtml('비밀번호가 올바르지 않습니다. 다시 입력해 주세요.', String(req.body?.next || '')));
    return;
  }
  res.setHeader('Set-Cookie', makeSessionCookie(session.department));
  res.redirect(safeNextPath(req.body?.next));
});

app.get('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'session=; Path=/; Max-Age=0');
  res.redirect('/');
});

app.get('/upload', (req, res) => {
  const session = readSession(req);
  if (!session) {
    return res.redirect('/?next=' + encodeURIComponent(req.originalUrl));
  }
  const targetInfo = resolveQuoteFolder(session, req.query);
  if (!targetInfo) return res.status(404).type('html').send('견적 폴더를 찾을 수 없습니다. 견적번호와 업체명을 확인해 주세요.');
  res.type('html').send(uploadPageHtml(session, targetInfo));
});

app.post('/upload', (req, res, next) => {
  // 세션 쿠키가 없는 요청은 굳이 대용량 JSON 본문을 파싱하지 않고 즉시 거부한다.
  if (!readSession(req)) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  next();
}, uploadJsonParser, async (req, res) => {
  const session = readSession(req);
  if (!session) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });

  const targetInfo = resolveQuoteFolder(session, req.body || {});
  if (!targetInfo) return res.status(404).json({ success: false, message: '견적 폴더를 찾을 수 없습니다.' });

  const rawFileName = String(req.body?.fileName || '').trim();
  const content = String(req.body?.content || '');
  // safeSegment로 Windows에서 특별한 의미를 갖는 문자(: * ? " < > | 등)를 제거한다 —
  // 예: "report.pdf:hidden.pdf" 같은 NTFS 대체 데이터 스트림 트릭 방지.
  const fileName = safeSegment(rawFileName);
  const extension = extname(fileName).toLowerCase();
  const stem = basename(fileName, extension);
  const reservedNames = new Set(['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']);
  // 확장자는 허용 목록이 아니라 차단 목록으로 관리한다 — pptx 등 문서 형식은 모두 허용하고,
  // 다른 직원이 나중에 내려받아 실행했을 때 위험할 수 있는 실행/스크립트 파일만 막는다.
  const blockedExtensions = new Set([
    '.exe', '.bat', '.cmd', '.com', '.scr', '.msi', '.msp', '.mst', '.jar',
    '.vb', '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsh', '.ps1', '.psm1',
    '.sh', '.dll', '.cpl', '.reg', '.hta', '.gadget', '.lnk', '.scf', '.apk',
    '.html', '.htm', '.svg',
  ]);
  if (!fileName || fileName !== rawFileName || basename(fileName) !== fileName || fileName === 'desktop.ini' || fileName.toLowerCase() === 'desktop.ini' || reservedNames.has(stem.toUpperCase())) {
    return res.status(400).json({ success: false, message: '파일명이 올바르지 않습니다.' });
  }
  if (!extension || blockedExtensions.has(extension)) {
    return res.status(400).json({ success: false, message: '보안상 이 파일 형식(실행 파일 등)은 업로드할 수 없습니다.' });
  }
  if (!content || content.length > Math.ceil(MAX_UPLOAD_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9+/]*={0,2}$/.test(content)) {
    return res.status(400).json({ success: false, message: '파일 데이터가 올바르지 않거나 너무 큽니다.' });
  }

  const buffer = Buffer.from(content, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ success: false, message: '파일은 1GB 이하만 업로드할 수 있습니다.' });
  }

  let outputName = fileName;
  const existingPath = join(targetInfo.target, outputName);
  if (existsSync(existingPath)) {
    outputName = `${stem}_${Date.now()}${extension}`;
  }
  try {
    await writeFile(join(targetInfo.target, outputName), buffer);
  } catch (err) {
    console.error(`[업로드] 파일 저장 실패: ${describeError(err)}`);
    return res.status(500).json({ success: false, message: '파일 저장에 실패했습니다.' });
  }

  const rawAccount = String(req.body?.authorEmail || targetInfo.authorEmail || session.department || 'unknown').trim().toLowerCase();
  const detail = `파일명: ${outputName} (${Math.max(1, Math.round(buffer.length / 1024))} KB) | 대상 견적: ${targetInfo.quoteNumber}_${targetInfo.company} | 부서: ${targetInfo.department}`;
  appendActivityLog(rawAccount, '업로드', detail);

  res.json({ success: true, fileName: outputName });
});

app.options('/api/log', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

app.post('/api/log', express.json(), (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { account, eventType, detail } = req.body || {};
  if (!eventType || !detail) {
    return res.status(400).json({ success: false, message: 'eventType과 detail이 필요합니다.' });
  }
  appendActivityLog(account, eventType, detail);
  res.json({ success: true });
});

// 세션 부서의 폴더 안에 있는지 검사하고 실제 경로를 반환한다
function resolveInsideDepartment(session, relative) {
  const deptRoot = resolve(join(STORAGE_ROOT, session.department === '*' ? '' : session.department));
  const target = resolve(join(deptRoot, relative || ''));
  if (target !== deptRoot && !target.startsWith(deptRoot + sep)) return null;
  return { deptRoot, target };
}

app.get('/browse', (req, res) => {
  const session = readSession(req);
  if (!session) return res.redirect('/');
  const { deptRoot } = resolveInsideDepartment(session, '');
  let target = resolveInsideDepartment(session, String(req.query.dir || ''));
  if (!target || !existsSync(target.target) || !statSync(target.target).isDirectory()) {
    target = { deptRoot, target: deptRoot };
  }

  // 폴더 이동용 경로(dirRelative)는 부서 폴더 기준,
  // 다운로드용 경로(downloadPath)는 저장 루트 기준(부서 접두사 포함)으로 계산한다.
  const storageRootResolved = resolve(STORAGE_ROOT);
  const dirRelative = target.target === deptRoot ? '' : target.target.slice(deptRoot.length + 1).split(sep).join('/');
  const storageRelative = target.target === storageRootResolved ? '' : target.target.slice(storageRootResolved.length + 1).split(sep).join('/');

  const entries = readdirSync(target.target, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.') && e.name.toLowerCase() !== 'desktop.ini')
    .map((e) => {
      const isFolder = e.isDirectory();
      let size = '';
      if (!isFolder) {
        try { size = `${Math.max(1, Math.round(statSync(join(target.target, e.name)).size / 1024))} KB`; } catch { size = '-'; }
      }
      return {
        name: e.name,
        isFolder,
        size,
        browsePath: dirRelative ? `${dirRelative}/${e.name}` : e.name,
        downloadPath: storageRelative ? `${storageRelative}/${e.name}` : e.name,
      };
    })
    .sort((a, b) => (a.isFolder === b.isFolder ? a.name.localeCompare(b.name, 'ko') : a.isFolder ? -1 : 1));

  res.type('html').send(browserPageHtml(session, dirRelative, entries));
});

app.get('/view', (req, res) => {
  const session = readSession(req);
  if (!session) return res.redirect('/');

  // 경로는 storageRoot 기준(부서 세그먼트 포함)이며, 자기 부서(또는 관리자)만 허용한다
  const storageRoot = resolve(STORAGE_ROOT);
  const relative = String(req.query.path || '');
  const target = resolve(join(storageRoot, relative));
  if (target !== storageRoot && !target.startsWith(storageRoot + sep)) {
    return res.status(403).send('Forbidden');
  }
  const firstSegment = relative.split(/[\\/]+/).filter(Boolean)[0] || '';
  if (session.department !== '*' && firstSegment !== session.department) {
    return res.status(403).send('Forbidden: 다른 부서의 파일은 열람할 수 없습니다.');
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    return res.status(404).send('Not found');
  }

  // 브라우저에서 인라인으로 볼 수 있는 파일(PDF, 이미지, 텍스트 등)은 sendFile로 전달해 새 탭에서 열리도록 하고,
  // 엑셀(.xlsx), 워드, 한글, 압축파일 등 브라우저가 직접 열지 못하는 파일은 다운로드로 전환한다.
  const ext = extname(target).toLowerCase();
  const nonInlineExts = new Set(['.xlsx', '.xls', '.doc', '.docx', '.hwp', '.hwpx', '.zip', '.7z', '.rar']);
  if (nonInlineExts.has(ext)) {
    return res.download(target, basename(target));
  }
  res.sendFile(target);
});

app.get('/download', (req, res) => {
  const session = readSession(req);
  if (!session) return res.redirect('/');

  // 경로는 storageRoot 기준(부서 세그먼트 포함)이며, 자기 부서(또는 관리자)만 허용한다
  const storageRoot = resolve(STORAGE_ROOT);
  const relative = String(req.query.path || '');
  const target = resolve(join(storageRoot, relative));
  if (target !== storageRoot && !target.startsWith(storageRoot + sep)) {
    return res.status(403).send('Forbidden');
  }
  const firstSegment = relative.split(/[\\/]+/).filter(Boolean)[0] || '';
  if (session.department !== '*' && firstSegment !== session.department) {
    return res.status(403).send('Forbidden: 다른 부서의 파일은 열람할 수 없습니다.');
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    return res.status(404).send('Not found');
  }
  res.download(target, basename(target));
});

app.use('/files', (req, res) => {
  try {
    const [rawPath, rawQuery] = req.url.split('?');
    const query = new URLSearchParams(rawQuery || '');
    const raw = rawPath.replace(/^\/+/, '');
    if (!raw) return res.status(404).send('Not found');

    // 부서 접근 제어: 대장에 기록된 서명된 링크만 허용한다 (경로 변조·상위 경로 접근 차단)
    const relative = decodeURIComponent(raw);
    if (!verifyRelativePathSignature(relative, query.get('k'))) {
      return res.status(403).send('Forbidden: 유효한 파일 링크가 아닙니다. 견적 목록의 링크를 이용해 주세요.');
    }

    const absolute = resolve(join(STORAGE_ROOT, relative));
    if (absolute !== STORAGE_ROOT && !absolute.startsWith(STORAGE_ROOT + sep)) {
      return res.status(403).send('Forbidden');
    }
    if (!existsSync(absolute) || !statSync(absolute).isFile()) {
      return res.status(404).send('Not found');
    }
    if (extname(absolute).toLowerCase() === '.xlsx') {
      return res.download(absolute, basename(absolute));
    }
    res.sendFile(absolute);
  } catch (err) {
    res.status(500).send(String(err.message || err));
  }
});

const server = app.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`[에이전트] 파일 브라우저: ${PUBLIC_BASE_URL || `http://0.0.0.0:${HTTP_PORT}`} (부서 비밀번호로 접속)`);
  console.log(`[에이전트] 서명된 파일 링크: ${PUBLIC_BASE_URL || `http://0.0.0.0:${HTTP_PORT}`}/files/...`);
});

server.on('error', (err) => {
  console.error(`[에이전트] 파일 서버를 시작하지 못했습니다: ${err.code || err.message}`);
  if (err.code === 'EADDRINUSE') {
    console.error(`[에이전트] ${HTTP_PORT} 포트를 다른 프로그램이 사용 중입니다.`);
  }
  process.exitCode = 1;
});

// ── 시작 ───────────────────────────────────────────────────────────────────
mkdirSync(STORAGE_ROOT, { recursive: true });
console.log('[에이전트] CIMON 견적 파일 로컬 저장 에이전트 시작');
console.log(`[에이전트] Drive 대기 폴더: ${PENDING_DIR}`);
console.log(`[에이전트] 저장 루트: ${STORAGE_ROOT}`);
console.log(`[에이전트] 템플릿: ${TEMPLATE_PATH}`);
console.log(`[에이전트] 폴링 주기: ${POLL_INTERVAL_MS}ms`);
startPolling();
