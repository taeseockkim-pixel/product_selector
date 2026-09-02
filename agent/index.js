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

const PENDING_DIR = join(AGENT_FOLDER, 'pending');
const RESULTS_DIR = join(AGENT_FOLDER, 'results');
const DELIVERY_DIR = join(AGENT_FOLDER, 'delivery');

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
    .replace(/"/g, '&quot;');
}

function quoteYear(details) {
  const match = String(details?.quoteDate || '').match(/(\d{4})/);
  return match ? match[1] : String(new Date().getFullYear());
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

  const relativePath = [department, year, folderName, pdfFileName].map(encodeURIComponent).join('/');
  const signature = signRelativePath(decodeURIComponent(relativePath));
  const fileUrl = PUBLIC_BASE_URL
    ? `${PUBLIC_BASE_URL}/files/${relativePath}?k=${signature}`
    : '';

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
    .logout { font-size: 12px; color: #999; }`.trim();

function loginPageHtml(errorMessage = '') {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>CIMON 견적 파일 열람</title>
<style>${PAGE_STYLE}</style></head>
<body><div class="card">
  <h1>CIMON 견적 파일 열람</h1>
  <div class="sub">부서별 견적 폴더 — 접속 비밀번호를 입력해 주세요</div>
  <form method="POST" action="/login">
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
      return `<tr><td>📁 <a href="/browse?dir=${encodeURIComponent(entry.browsePath)}">${escHtml(entry.name)}</a></td><td>폴더</td></tr>`;
    }
    return `<tr><td>📄 <a href="/download?path=${encodeURIComponent(entry.downloadPath)}">${escHtml(entry.name)}</a></td><td>${entry.size}</td></tr>`;
  }).join('');
  const emptyRow = entries.length === 0 ? `<tr><td colspan="2" style="color:#999">파일이 없습니다.</td></tr>` : '';
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
  <table><tr><th>이름</th><th>종류</th></tr>${rows}${emptyRow}</table>
</div></body></html>`;
}

app.get('/', (req, res) => {
  if (readSession(req)) return res.redirect('/browse');
  res.type('html').send(loginPageHtml());
});

app.post('/login', (req, res) => {
  const session = checkFolderPassword(req.body?.password);
  if (!session) {
    res.status(401).type('html').send(loginPageHtml('비밀번호가 올바르지 않습니다. 다시 입력해 주세요.'));
    return;
  }
  res.setHeader('Set-Cookie', makeSessionCookie(session.department));
  res.redirect('/browse');
});

app.get('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'session=; Path=/; Max-Age=0');
  res.redirect('/');
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
    .filter((e) => !e.name.startsWith('.'))
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
