import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'APPS_SCRIPT_Code_gs_전체교체코드.txt'), 'utf8');

// ── 정적 확인: 모양이 다른 Google 임시 PDF 경로가 남아 있지 않아야 한다 ──────────────────
for (const removed of ['createTempQuotePdf_', 'fillSheetData', 'createPdfBlob', 'format=pdf', 'runQuotePdfLayoutDiagnostic_']) {
  assert.ok(!source.includes(removed), `Google 임시 PDF 코드가 남아 있습니다: ${removed}`);
}
assert.match(source, /const MAX_QUOTE_NOTES_LENGTH = 300;/);
assert.match(source, /const AGENT_DRAFT_FEATURE = 'draftAttachments';/);
assert.match(source, /attachPdf: Boolean\(createDraft\)/, '에이전트 대기열에 첨부 요청 표시가 있어야 합니다.');

// ── 메모리 Drive / Gmail / Cache / Lock ──────────────────────────────────────────────
const state = { userEmail: 'taeseock.kim@cimon.com', now: Date.now(), gmailDrafts: [], logs: [], exports: [] };
let fileSeq = 0;
const folders = {};
const agentRoot = makeFolder('agent');

function makeIterator(items) {
  let index = 0;
  return { hasNext: () => index < items.length, next: () => items[index++] };
}

function makeFile(folder, name, content, options = {}) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
  const file = {
    id: `file-${++fileSeq}`,
    name,
    bytes,
    trashed: false,
    updated: options.updated ?? Date.now(),
    created: options.created ?? Date.now(),
    getId() { return this.id; },
    getName() { return this.name; },
    isTrashed() { return this.trashed; },
    getSize() { return this.bytes.length; },
    getLastUpdated() { return new Date(this.updated); },
    getDateCreated() { return new Date(this.created); },
    getBlob() {
      const self = this;
      return {
        name: self.name,
        getName() { return this.name; },
        setName(value) { this.name = value; return this; },
        getDataAsString() { return self.bytes.toString('utf8'); },
        getBytes() { return Array.from(self.bytes).map((byte) => (byte > 127 ? byte - 256 : byte)); },
      };
    },
  };
  folder.files.push(file);
  return file;
}

function makeFolder(name) {
  const folder = {
    name,
    files: [],
    createFile(fileName, content) { return makeFile(folder, fileName, content); },
    getFilesByName(fileName) { return makeIterator(folder.files.filter((file) => file.name === fileName)); },
    getFiles() { return makeIterator([...folder.files]); },
  };
  return folder;
}

function memoryCache() {
  const map = new Map();
  return {
    get: (key) => (map.has(key) ? map.get(key) : null),
    put: (key, value) => { map.set(key, String(value)); },
    remove: (key) => { map.delete(key); },
    clear: () => map.clear(),
  };
}

const cache = memoryCache();
const properties = new Map();
const lock = { waitLock() {}, tryLock: () => true, releaseLock() {} };

const sandbox = {
  console,
  Logger: { log: (message) => state.logs.push(String(message)) },
  Session: {
    getActiveUser: () => ({ getEmail: () => state.userEmail }),
    getScriptTimeZone: () => 'Asia/Seoul',
  },
  CacheService: { getScriptCache: () => cache },
  LockService: { getScriptLock: () => lock, getUserLock: () => lock },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key) => (properties.has(key) ? properties.get(key) : null),
      setProperty: (key, value) => { properties.set(key, String(value)); },
      deleteProperty: (key) => { properties.delete(key); },
    }),
  },
  MimeType: { PLAIN_TEXT: 'text/plain' },
  GmailApp: {
    createDraft: (to, subject, body, options) => { state.gmailDrafts.push({ to, subject, body, options }); },
  },
  Utilities: {
    getUuid: () => '123e4567-e89b-12d3-a456-426614174000',
    formatDate: (date, zone, format) => {
      const year = String(date.getFullYear());
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return { yy: year.slice(-2), MM: month }[format] ?? `${year}${month}`;
    },
  },
  DriveApp: {},
  SpreadsheetApp: {},
  UrlFetchApp: {},
  ScriptApp: {},
  ContentService: {},
  HtmlService: {},
};
const context = vm.createContext(sandbox);
vm.runInContext(source, context);

// 실제 Drive 대신 메모리 폴더를 쓰도록 접근 함수만 교체한다.
sandbox.getAgentFolder_ = () => agentRoot;
sandbox.getAgentSubfolder_ = (name) => (folders[name] ??= makeFolder(name));
sandbox.permanentlyDeleteFile_ = (id) => {
  for (const folder of [agentRoot, ...Object.values(folders)]) {
    folder.files = folder.files.filter((file) => file.id !== id);
  }
};
sandbox.exportLedgerIdToAgent_ = (ledgerId, year, quoteNumber) => { state.exports.push({ ledgerId, year, quoteNumber }); };

function resetWorld() {
  cache.clear();
  properties.clear();
  agentRoot.files = [];
  for (const key of Object.keys(folders)) delete folders[key];
  state.gmailDrafts = [];
  state.exports = [];
  state.logs = [];
  state.userEmail = 'taeseock.kim@cimon.com';
}

function setHeartbeat({ ageMs = 1000, stopped = false, features = ['draftAttachments'], omitContent = false } = {}) {
  agentRoot.files = [];
  const content = omitContent ? '{ not json' : JSON.stringify({ ts: Date.now(), stopped, features, version: 'test', host: 'PC' });
  makeFile(agentRoot, 'heartbeat.json', content, { updated: Date.now() - ageMs });
  cache.clear();
}

const pdf = (size, fill = 7) => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(size, fill), Buffer.from('\n%%EOF')]);
const OPERATION = '123e4567-e89b-12d3-a456-426614174000';

function draftDetails(overrides = {}) {
  return {
    operationId: OPERATION,
    clientEmail: 'customer@example.com',
    clientName: '테스트 고객',
    authorName: '김태석 차장',
    quoteNumber: '기술영업 2610-500',
    ...overrides,
  };
}

function writeAttachments(entries, { manifestOk = true, error = '' } = {}) {
  const folder = sandbox.getAgentSubfolder_('attachments');
  const files = [];
  entries.forEach((entry, index) => {
    const attachmentName = `${OPERATION}__${index + 1}__${entry.name}`;
    if (entry.write !== false) makeFile(folder, attachmentName, entry.content);
    files.push({ index: index + 1, name: entry.name, attachmentName, size: entry.size ?? entry.content.length });
  });
  const manifest = manifestOk
    ? { operationId: OPERATION, ok: true, files }
    : { operationId: OPERATION, ok: false, error, files: [] };
  makeFile(folder, `${OPERATION}__manifest.json`, JSON.stringify(manifest));
}

// ── 1. 에이전트 상태 확인 ───────────────────────────────────────────────────────
resetWorld();
let check = sandbox.checkAgentAvailable_(false);
assert.equal(check.ok, false, '상태 신호 파일이 없으면 접수를 거부해야 합니다.');
assert.match(check.message, /점검/);
assert.match(check.message, /start-agent\.bat/);

setHeartbeat({ ageMs: 5000 });
assert.equal(sandbox.checkAgentAvailable_(false).ok, true, '최근 신호는 접수 가능해야 합니다.');
assert.equal(sandbox.checkAgentAvailable_(true).ok, true);

setHeartbeat({ ageMs: 10 * 60 * 1000 });
check = sandbox.checkAgentAvailable_(false);
assert.equal(check.ok, false, '10분 지난 신호는 접수를 거부해야 합니다.');
assert.match(check.message, /10분|응답하지 않아/);

setHeartbeat({ stopped: true });
check = sandbox.checkAgentAvailable_(false);
assert.equal(check.ok, false, '종료 신호가 있으면 접수를 거부해야 합니다.');
assert.match(check.message, /종료/);

setHeartbeat({ features: [] });
assert.equal(sandbox.checkAgentAvailable_(false).ok, true, '첨부 기능이 없어도 일반 저장은 가능합니다.');
check = sandbox.checkAgentAvailable_(true);
assert.equal(check.ok, false, '첨부 기능이 없는 에이전트는 메일 요청을 거부해야 합니다.');
assert.match(check.message, /업데이트/);

setHeartbeat({ omitContent: true });
assert.equal(sandbox.checkAgentAvailable_(true).ok, true, '동기화 중이라 내용을 읽지 못해도 수정 시각이 최신이면 허용합니다.');

// ── 2. processQuote는 에이전트가 꺼져 있으면 아무것도 접수하지 않는다 ─────────────────────
resetWorld();
const quoteData = {
  details: { clientEmail: 'customer@example.com', clientName: '고객', notes: '비고', authorDepartment: '기술영업', quoteDate: '2026년 10월 13일' },
  items: [{ name: '제품', spec: '규격', quantity: 1, unitPrice: 1000, totalPrice: 1000 }],
};
let response = sandbox.processQuote(JSON.parse(JSON.stringify(quoteData)), false, '', '', '', undefined, '', 'newRevision', '');
assert.equal(response.success, false);
assert.equal(response.agentUnavailable, true);
assert.match(response.message, /저장을 접수하지 않았습니다/);
assert.equal(folders.pending, undefined, '에이전트가 꺼져 있으면 pending 대기열을 만들면 안 됩니다.');
assert.equal(folders.drafts, undefined, '에이전트가 꺼져 있으면 메일 초안 요청도 만들면 안 됩니다.');
assert.equal(state.gmailDrafts.length, 0);

setHeartbeat({ ageMs: 20 * 60 * 1000 });
response = sandbox.processQuote(JSON.parse(JSON.stringify(quoteData)), true, '', '', '', undefined, '', 'newRevision', '');
assert.equal(response.agentUnavailable, true, '오래된 신호는 메일 요청도 거부해야 합니다.');
assert.equal(folders.pending, undefined);

setHeartbeat({ ageMs: 1000 });
response = sandbox.processQuote({ ...quoteData, details: { ...quoteData.details, clientEmail: 'not-an-email' } }, true, '', '', '', undefined, '', 'newRevision', '');
assert.equal(response.success, false);
assert.notEqual(response.agentUnavailable, true);
assert.match(response.message, /이메일 주소/);
assert.equal(folders.pending, undefined, '이메일이 잘못되면 접수하지 않아야 합니다.');

response = sandbox.processQuote({ ...quoteData, details: { ...quoteData.details, notes: '비'.repeat(301) } }, false, '', '', '', undefined, '', 'newRevision', '');
assert.match(response.message, /300자/);

// ── 3. 메일 초안: 대기 → 생성 ──────────────────────────────────────────────────────────
resetWorld();
sandbox.enqueueQuoteDraftRequest_(draftDetails(), 2, '', '');
const requestFile = folders.drafts.files[0];
assert.equal(requestFile.name, `draft_${OPERATION}.json`);
const request = JSON.parse(requestFile.bytes.toString('utf8'));
assert.equal(request.requesterEmail, 'taeseock.kim@cimon.com');
assert.equal(request.to, 'customer@example.com');
assert.equal(request.partCount, 2);
assert.match(request.subject, /\[CIMON\] 테스트 고객/);
assert.match(request.body, /견적서 송부 드립니다/);

const userEmail = 'taeseock.kim@cimon.com';
assert.equal(sandbox.resolveQuoteDraft_(OPERATION, userEmail).state, 'pending', 'manifest가 없으면 기다려야 합니다.');

const pdfOne = pdf(2048, 1);
const pdfTwo = pdf(4096, 2);
writeAttachments([
  { name: '기술영업 2610-500_고객_견적서_1.pdf', content: pdfOne },
  { name: '기술영업 2610-500_고객_견적서_2.pdf', content: pdfTwo, write: false },
]);
assert.equal(sandbox.resolveQuoteDraft_(OPERATION, userEmail).state, 'pending', '첨부 파일이 일부만 도착하면 기다려야 합니다.');
assert.equal(state.gmailDrafts.length, 0);

// 파일 크기가 manifest와 다르면(동기화 중) 계속 기다린다.
folders.attachments.files = [];
writeAttachments([
  { name: '기술영업 2610-500_고객_견적서_1.pdf', content: pdfOne },
  { name: '기술영업 2610-500_고객_견적서_2.pdf', content: pdfTwo.subarray(0, 1000), size: pdfTwo.length },
]);
assert.equal(sandbox.resolveQuoteDraft_(OPERATION, userEmail).state, 'pending', '크기가 다른 반쪽 파일은 첨부하면 안 됩니다.');

// PDF가 아닌 내용도 첨부하지 않는다.
folders.attachments.files = [];
writeAttachments([
  { name: '기술영업 2610-500_고객_견적서_1.pdf', content: pdfOne },
  { name: '기술영업 2610-500_고객_견적서_2.pdf', content: Buffer.alloc(pdfTwo.length, 65) },
]);
assert.equal(sandbox.resolveQuoteDraft_(OPERATION, userEmail).state, 'pending', 'PDF 헤더가 없으면 첨부하면 안 됩니다.');
assert.equal(state.gmailDrafts.length, 0);

// 정상 도착 → 초안 1회 생성 후 임시 파일 삭제
folders.attachments.files = [];
writeAttachments([
  { name: '기술영업 2610-500_고객_견적서_1.pdf', content: pdfOne },
  { name: '기술영업 2610-500_고객_견적서_2.pdf', content: pdfTwo },
]);
const created = sandbox.resolveQuoteDraft_(OPERATION, userEmail);
assert.equal(created.state, 'created');
assert.equal(state.gmailDrafts.length, 1);
const draft = state.gmailDrafts[0];
assert.equal(draft.to, 'customer@example.com');
assert.equal(draft.options.name, '김태석 차장');
assert.equal(draft.options.attachments.length, 2);
assert.deepEqual([...draft.options.attachments].map((blob) => blob.getName()), [
  '기술영업 2610-500_고객_견적서_1.pdf',
  '기술영업 2610-500_고객_견적서_2.pdf',
], '첨부 파일명은 저장된 PDF 파일명과 같아야 합니다.');
assert.ok(draft.options.htmlBody.includes('견적서 송부'));
assert.equal(folders.drafts.files.length, 0, '초안 생성 후 요청 파일을 삭제해야 합니다.');
assert.equal(folders.attachments.files.length, 0, '초안 생성 후 첨부 파일을 삭제해야 합니다.');

// 같은 작업을 다시 조회해도 초안이 중복 생성되지 않는다.
assert.equal(sandbox.resolveQuoteDraft_(OPERATION, userEmail).state, 'created');
assert.equal(state.gmailDrafts.length, 1, '초안은 한 번만 만들어야 합니다.');

// ── 4. 다른 사용자의 요청은 처리하지 않는다 ─────────────────────────────────────────────
resetWorld();
sandbox.enqueueQuoteDraftRequest_(draftDetails(), 1, '', '');
writeAttachments([{ name: 'a.pdf', content: pdf(2048) }]);
assert.equal(sandbox.resolveQuoteDraft_(OPERATION, 'other.user@cimon.com').state, 'other');
assert.equal(state.gmailDrafts.length, 0, '다른 사용자의 편지함에 초안을 만들면 안 됩니다.');
assert.equal(folders.drafts.files.length, 1, '다른 사용자가 조회해도 요청을 지우면 안 됩니다.');
assert.equal(sandbox.resolveQuoteDraft_(OPERATION, 'TaeSeock.Kim@CIMON.com').state, 'created', '이메일 대소문자는 구분하지 않아야 합니다.');

// ── 5. 에이전트가 첨부 전달에 실패하면 초안을 만들지 않고 오류를 안내한다(A안) ─────────────────
resetWorld();
sandbox.enqueueQuoteDraftRequest_(draftDetails(), 1, '', '');
writeAttachments([], { manifestOk: false, error: 'ENOENT 원본 PDF 없음' });
let failed = sandbox.resolveQuoteDraft_(OPERATION, userEmail);
assert.equal(failed.state, 'failed');
assert.match(failed.message, /ENOENT/);
assert.equal(state.gmailDrafts.length, 0, '실패 시 다른 모양의 PDF로 초안을 만들면 안 됩니다.');
assert.equal(folders.drafts.files.length, 0);
assert.equal(sandbox.resolveQuoteDraft_(OPERATION, userEmail).state, 'failed', '실패 결과도 반복 조회에서 유지돼야 합니다.');

// 파트 수가 맞지 않으면 실패
resetWorld();
sandbox.enqueueQuoteDraftRequest_(draftDetails(), 2, '', '');
writeAttachments([{ name: 'a.pdf', content: pdf(2048) }]);
failed = sandbox.resolveQuoteDraft_(OPERATION, userEmail);
assert.equal(failed.state, 'failed');
assert.match(failed.message, /일치하지 않/);

// Gmail 오류도 실패로 보고하고 임시 파일을 정리한다.
resetWorld();
sandbox.enqueueQuoteDraftRequest_(draftDetails(), 1, '', '');
writeAttachments([{ name: 'a.pdf', content: pdf(2048) }]);
const originalCreateDraft = sandbox.GmailApp.createDraft;
sandbox.GmailApp.createDraft = () => { throw new Error('Gmail 할당량 초과'); };
failed = sandbox.resolveQuoteDraft_(OPERATION, userEmail);
sandbox.GmailApp.createDraft = originalCreateDraft;
assert.equal(failed.state, 'failed');
assert.match(failed.message, /Gmail/);
assert.equal(folders.attachments.files.length, 0);

// 24시간이 지난 요청은 만료로 실패 처리한다.
resetWorld();
sandbox.enqueueQuoteDraftRequest_(draftDetails(), 1, '', '');
const expiredRequest = JSON.parse(folders.drafts.files[0].bytes.toString('utf8'));
expiredRequest.createdAt = Date.now() - 25 * 60 * 60 * 1000;
folders.drafts.files[0].bytes = Buffer.from(JSON.stringify(expiredRequest), 'utf8');
failed = sandbox.resolveQuoteDraft_(OPERATION, userEmail);
assert.equal(failed.state, 'failed');
assert.match(failed.message, /24시간/);

// ── 6. 상태 조회에 초안 상태 합치기 ───────────────────────────────────────────────────────
resetWorld();
const completed = { success: true, status: 'completed', quoteNumber: '기술영업 2610-500' };
assert.deepEqual(sandbox.withQuoteDraftStatus_(completed, { operationId: OPERATION }), completed, '초안 요청이 없으면 상태를 바꾸지 않습니다.');

sandbox.enqueueQuoteDraftRequest_(draftDetails(), 1, '', '');
let merged = sandbox.withQuoteDraftStatus_(completed, { operationId: OPERATION });
assert.equal(merged.status, 'pending', '초안이 아직이면 완료로 보고하면 안 됩니다.');
assert.equal(merged.stage, 'draft');

writeAttachments([{ name: 'a.pdf', content: pdf(2048) }]);
merged = sandbox.withQuoteDraftStatus_(completed, { operationId: OPERATION });
assert.equal(merged.status, 'completed');
assert.equal(merged.draft, 'created');
assert.equal(state.gmailDrafts.length, 1);

resetWorld();
sandbox.enqueueQuoteDraftRequest_(draftDetails(), 1, '', '');
writeAttachments([{ name: 'a.pdf', content: pdf(2048) }]);
merged = sandbox.withQuoteDraftStatus_({ success: true, status: 'failed', message: '실패' }, { operationId: OPERATION });
assert.equal(merged.status, 'failed');
assert.equal(folders.drafts.files.length, 0, '저장이 실패하면 메일 초안 요청을 정리해야 합니다.');
assert.equal(folders.attachments.files.length, 0);
assert.equal(state.gmailDrafts.length, 0);

// 공개 상태 조회 함수가 대장 상태와 초안 상태를 합친다.
resetWorld();
sandbox.getQuoteLedgerOperationStatus_ = () => ({ success: true, status: 'completed', quoteNumber: 'Q-1' });
sandbox.enqueueQuoteDraftRequest_(draftDetails(), 1, '', '');
writeAttachments([{ name: 'a.pdf', content: pdf(2048) }]);
const publicStatus = sandbox.getQuoteOperationStatusFromReact({ operationId: OPERATION });
assert.equal(publicStatus.draft, 'created');

// ── 7. 창을 닫은 사용자의 초안을 다음 접속 때 마무리한다 ─────────────────────────────────────
resetWorld();
sandbox.enqueueQuoteDraftRequest_(draftDetails(), 1, '', '');
writeAttachments([{ name: 'a.pdf', content: pdf(2048) }]);
sandbox.finalizePendingQuoteDraftsForUser_();
assert.equal(state.gmailDrafts.length, 1, '목록 조회 때 대기 중인 초안을 만들어야 합니다.');

resetWorld();
state.userEmail = 'other.user@cimon.com';
sandbox.enqueueQuoteDraftRequest_(draftDetails({ operationId: '223e4567-e89b-12d3-a456-426614174111' }), 1, '', '');
state.userEmail = 'taeseock.kim@cimon.com';
sandbox.finalizePendingQuoteDraftsForUser_();
assert.equal(state.gmailDrafts.length, 0, '다른 사용자의 대기 초안은 건드리면 안 됩니다.');

// ── 8. 오래된 임시 파일 정리 ────────────────────────────────────────────────────────────────
resetWorld();
sandbox.getAgentSubfolder_('drafts');
makeFile(folders.drafts, 'draft_old.json', '{}', { created: Date.now() - 30 * 60 * 60 * 1000 });
makeFile(folders.drafts, 'draft_new.json', '{}', { created: Date.now() });
sandbox.cleanupStaleQuoteDraftFiles_();
assert.deepEqual(folders.drafts.files.map((file) => file.name), ['draft_new.json'], '24시간 지난 파일만 정리해야 합니다.');

// ── 9. 대장 사본 내보내기 대기열 ──────────────────────────────────────────────────────────────
resetWorld();
const fakeSystem = { ledger: { getId: () => 'ledger-1' } };
sandbox.queueLedgerExport_(fakeSystem, 2026, 'Q-1');
sandbox.queueLedgerExport_(fakeSystem, 2026, 'Q-1');
sandbox.queueLedgerExport_(fakeSystem, 2026, 'Q-2');
assert.equal(state.exports.length, 0, '대기열 등록 시에는 대장을 내려받지 않아야 합니다.');
assert.equal(JSON.parse(properties.get('LEDGER_EXPORT_QUEUE')).length, 2, '같은 견적은 한 번만 대기해야 합니다.');
sandbox.processLedgerExportQueue_();
assert.deepEqual(state.exports.map((item) => item.quoteNumber), ['Q-1', 'Q-2']);
assert.equal(properties.has('LEDGER_EXPORT_QUEUE'), false);
for (let index = 0; index < 7; index += 1) sandbox.queueLedgerExport_(fakeSystem, 2026, `B-${index}`);
state.exports = [];
sandbox.processLedgerExportQueue_();
assert.equal(state.exports.length, 5, '한 번에 5건까지만 처리해야 합니다.');
assert.equal(JSON.parse(properties.get('LEDGER_EXPORT_QUEUE')).length, 2, '나머지는 다음 실행으로 넘겨야 합니다.');

// ── 10. 다음 견적번호 계산에서 대장을 다시 열지 않는다 ─────────────────────────────────────────
resetWorld();
sandbox.getYearSystem = () => { throw new Error('같은 대장을 다시 열면 안 됩니다.'); };
const knownSystem = { ledgerSheet: { getLastRow: () => 1 } };
const thisYear = new Date().getFullYear();
const nextNumber = sandbox.getNextQuoteNumber('root', '기술영업', knownSystem, thisYear);
assert.match(nextNumber, /^기술영업 \d{4}-001$/);
assert.throws(() => sandbox.getNextQuoteNumber('root', '기술영업', knownSystem, thisYear - 1), /견적번호 생성 실패/, '연도가 다르면 해당 연도 대장을 열어야 합니다.');

// ── 11. 작성자 DB 캐시 ─────────────────────────────────────────────────────────────────────────
resetWorld();
let authorReads = 0;
sandbox.readAuthorRowsUncached_ = () => { authorReads += 1; return [{ name: '김태석', email: 'taeseock.kim@cimon.com', department: '기술영업', phone: '010' }]; };
assert.equal(sandbox.readAuthorRows_().length, 1);
assert.equal(sandbox.readAuthorRows_().length, 1);
assert.equal(authorReads, 1, '작성자 DB는 캐시 시간 안에는 다시 읽지 않아야 합니다.');

console.log('✅ 에이전트 상태 확인 · Excel PDF 메일 초안 · 속도 개선 로직 검증 통과');
