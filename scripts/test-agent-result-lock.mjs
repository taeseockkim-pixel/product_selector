// test-agent-result-lock.mjs — 완료 보고(에이전트 결과) 중복 반영 방지 회귀 테스트
//
// 배경: 같은 완료 보고 파일을 트리거·완료 상태 폴링·견적 목록 조회가 동시에 처리하면
// 두 실행이 모두 "대장에 해당 견적번호 행이 없다"고 판단해 appendRow를 두 번 실행한다.
// 그 결과 같은 견적번호(예: 기술영업 2610-506) 행이 2개 생성된다.
//
// 이 테스트는 Apps Script 운영 코드(APPS_SCRIPT_Code_gs_전체교체코드.txt)가
// 아래 안전장치를 실제로 갖추고 있는지 검사한다.
//   1) processAgentResults가 스크립트 잠금 안에서 결과 1건을 처리한다.
//   2) 잠금을 얻지 못하면 건너뛰고 다음 트리거/폴링에 맡긴다.
//   3) 잠금 획득 후 이미 삭제된 결과 파일은 다시 반영하지 않는다.
//   4) operationId 단위 완료 표시로 같은 완료 보고를 두 번 반영하지 않는다.
//   5) queueLedgerExport_는 잠금을 푼 뒤에 호출한다(내부 releaseLock이 바깥 잠금을 풀지 않도록).

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(join(root, 'APPS_SCRIPT_Code_gs_전체교체코드.txt'), 'utf8');

// 지정한 함수의 선언부터 닫는 중괄호까지 잘라낸다(문자열·주석 안의 중괄호는 무시).
function extractFunction(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} 함수를 찾을 수 없습니다.`);
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = text.indexOf('{', start); i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
    if (inBlockComment) { if (ch === '*' && next === '/') { inBlockComment = false; i++; } continue; }
    if (inSingle) { if (ch === '\\') { i++; } else if (ch === "'") inSingle = false; continue; }
    if (inDouble) { if (ch === '\\') { i++; } else if (ch === '"') inDouble = false; continue; }
    if (inTemplate) { if (ch === '\\') { i++; } else if (ch === '`') inTemplate = false; continue; }
    if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (ch === "'") { inSingle = true; continue; }
    if (ch === '"') { inDouble = true; continue; }
    if (ch === '`') { inTemplate = true; continue; }
    if (ch === '{') { depth++; continue; }
    if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error(`${name} 함수의 끝을 찾을 수 없습니다.`);
}

const constantValue = (name) => {
  const match = source.match(new RegExp(`const ${name} = ([^;]+);`));
  assert.ok(match, `${name} 상수가 없습니다.`);
  return new Function(`return ${match[1]}`)();
};

// ── 1. 구조 검사: processAgentResults ───────────────────────────────────────
const body = extractFunction(source, 'processAgentResults');

assert.match(body, /LockService\.getScriptLock\(\)/, '완료 보고 처리는 스크립트 잠금을 사용해야 합니다.');
assert.match(body, /tryLock\(AGENT_RESULT_LOCK_WAIT_MS\)/, '잠금은 tryLock으로 시도해야 합니다.');
assert.match(body, /if \(!locked\)/, '잠금을 얻지 못했을 때의 분기가 있어야 합니다.');
assert.match(body, /lock\.releaseLock\(\)/, '잠금은 finally에서 해제해야 합니다.');
assert.equal(
  (body.match(/lock\.releaseLock\(\)/g) || []).length,
  1,
  '잠금 해제는 finally 한 곳에서만 수행해야 합니다.'
);
assert.match(body, /isAgentResultFileAlive_\(file\)/, '잠금 획득 후 결과 파일 생존 여부를 다시 확인해야 합니다.');

assert.match(body, /readLedgerCommit_\(operationId\)/, 'operationId 완료 표시를 먼저 확인해야 합니다.');
assert.match(body, /\[중복 반영 차단\]/, '이미 반영된 완료 보고는 건너뛰어야 합니다.');
assert.ok(
  body.indexOf('readLedgerCommit_(operationId)') < body.indexOf('commitLedgerAfterAgentSuccess_(result)'),
  '완료 표시 확인이 대장 기록보다 먼저 와야 합니다.'
);
assert.ok(
  body.indexOf('updateLedgerLink_(result, system)') < body.indexOf('markLedgerCommitted_(operationId'),
  '대장 행과 링크가 모두 반영된 뒤에 완료 표시를 남겨야 합니다.'
);

// 잠금 안에서 queueLedgerExport_를 호출하면 그 내부 releaseLock이 바깥 잠금까지 풀어 버린다.
assert.doesNotMatch(body, /queueLedgerExport_\(system/, 'queueLedgerExport_는 잠금 안에서 호출하면 안 됩니다.');
assert.match(body, /queueLedgerExport_\(entry\.system/, '내보내기 대기열은 잠금을 푼 뒤 등록해야 합니다.');
assert.ok(
  body.indexOf('lock.releaseLock()') < body.indexOf('queueLedgerExport_(entry.system'),
  '내보내기 대기열 등록은 잠금 해제 이후여야 합니다.'
);
assert.match(body, /cleanupExpiredLedgerCommits_\(\)/, '만료된 완료 표시 정리가 트리거에서 호출되어야 합니다.');

// ── 2. 동작 검사: operationId 완료 표시 ────────────────────────────────────
const prefix = constantValue('LEDGER_COMMIT_PREFIX');
const ttl = constantValue('LEDGER_COMMIT_TTL_MS');
assert.ok(ttl >= 60 * 60 * 1000, '완료 표시 TTL은 최소 1시간 이상이어야 합니다.');

const store = new Map();
const PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => (store.has(key) ? store.get(key) : null),
    setProperty: (key, value) => { store.set(key, value); },
    deleteProperty: (key) => { store.delete(key); },
    getProperties: () => Object.fromEntries(store),
  }),
};
const Logger = { log: () => {} };
const sanitizeDriveName = (value) => String(value ?? '').replace(/[\\/:*?"<>|]/g, '_');

const helpers = [
  extractFunction(source, 'readLedgerCommit_'),
  extractFunction(source, 'markLedgerCommitted_'),
  extractFunction(source, 'cleanupExpiredLedgerCommits_'),
].join('\n');

const cacheStore = new Map();
const CacheService = {
  getScriptCache: () => ({
    get: (key) => (cacheStore.has(key) ? cacheStore.get(key) : null),
    put: (key, value) => { cacheStore.set(key, value); },
  }),
};

const api = new Function(
  'PropertiesService',
  'Logger',
  'CacheService',
  'sanitizeDriveName',
  'LEDGER_COMMIT_PREFIX',
  'LEDGER_COMMIT_TTL_MS',
  `${helpers}\nreturn { readLedgerCommit_, markLedgerCommitted_, cleanupExpiredLedgerCommits_ };`
)(PropertiesService, Logger, CacheService, sanitizeDriveName, prefix, ttl);

assert.equal(api.readLedgerCommit_('op-none'), 0, '기록이 없으면 0을 돌려줘야 합니다.');
assert.equal(api.readLedgerCommit_(''), 0, 'operationId가 없으면 0을 돌려줘야 합니다.');

api.markLedgerCommitted_('op-1', '기술영업 2610-506');
assert.ok(api.readLedgerCommit_('op-1') > 0, '완료 표시를 기록한 뒤에는 0보다 큰 시각을 돌려줘야 합니다.');
assert.ok(store.has(prefix + 'op-1'), 'operationId 기준 키로 저장되어야 합니다.');
assert.equal(api.readLedgerCommit_('op-other'), 0, '다른 operationId는 영향받지 않아야 합니다.');

api.markLedgerCommitted_('', '기술영업 2610-507');
assert.equal(store.has(prefix), false, 'operationId가 없으면 완료 표시를 쓰지 않아야 합니다.');

store.set(prefix + 'op-old', JSON.stringify({ at: Date.now() - ttl - 1000, quoteNumber: '기술영업 2610-001' }));
assert.equal(api.readLedgerCommit_('op-old'), 0, 'TTL이 지난 완료 표시는 무효로 처리해야 합니다.');
assert.equal(store.has(prefix + 'op-old'), false, 'TTL이 지난 완료 표시는 정리해야 합니다.');

// 만료 표시 일괄 정리: 신선한 기록은 남기고 만료된 기록만 지운다.
store.set(prefix + 'op-expired', JSON.stringify({ at: Date.now() - ttl - 1000 }));
store.set(prefix + 'op-fresh', JSON.stringify({ at: Date.now() }));
store.set('QUOTE_NUMBER_RESERVATION_기술영업 2610-001', JSON.stringify({ createdAt: Date.now() }));
api.cleanupExpiredLedgerCommits_();
assert.equal(store.has(prefix + 'op-expired'), false, '만료된 완료 표시는 일괄 정리해야 합니다.');
assert.equal(store.has(prefix + 'op-fresh'), true, '유효한 완료 표시는 남겨야 합니다.');
assert.equal(store.has('QUOTE_NUMBER_RESERVATION_기술영업 2610-001'), true, '다른 종류의 속성은 건드리지 않아야 합니다.');

console.log('✅ 완료 보고 중복 반영 방지 검증 통과 (잠금 + operationId 완료 표시)');
