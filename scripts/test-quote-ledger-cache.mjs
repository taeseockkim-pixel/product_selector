import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src', 'utils', 'quoteLedgerCache.ts'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`;
const { cacheQuoteLedger, clearQuoteLedgerCache, getCachedQuoteLedger } = await import(moduleUrl);

clearQuoteLedgerCache();
const ledger = {
  success: true,
  department: '기술영업',
  headers: ['업체명'],
  rows: [{ values: ['트리폴맥스'], links: [] }],
};

cacheQuoteLedger('Admin@cimon.com', 2026, '기술영업', ledger, 1_000);

const sameOwnerScope = getCachedQuoteLedger('admin@cimon.com', 2026, '기술영업', 2_000);
assert.equal(sameOwnerScope?.fresh, true, '사용자 이메일은 대소문자를 정규화해 조회합니다.');
assert.equal(sameOwnerScope?.result.rows[0].values[0], '트리폴맥스');
assert.equal(getCachedQuoteLedger('other@cimon.com', 2026, '기술영업', 2_000), null, '다른 계정은 캐시를 공유하지 않습니다.');
assert.equal(getCachedQuoteLedger('admin@cimon.com', 2025, '기술영업', 2_000), null, '다른 연도는 캐시를 공유하지 않습니다.');
assert.equal(getCachedQuoteLedger('admin@cimon.com', 2026, '영업', 2_000), null, '다른 부서는 캐시를 공유하지 않습니다.');

const stale = getCachedQuoteLedger('admin@cimon.com', 2026, '기술영업', 122_001);
assert.equal(stale?.fresh, false, 'TTL이 지난 대장은 구분하되 우선 표시할 수 있도록 반환합니다.');
assert.equal(stale?.result.rows.length, 1);

cacheQuoteLedger('admin@cimon.com', 2026, '기술영업', { success: false }, 123_000);
assert.equal(getCachedQuoteLedger('admin@cimon.com', 2026, '기술영업', 124_000)?.result.rows.length, 1, '실패 응답은 정상 캐시를 덮지 않습니다.');

clearQuoteLedgerCache();
assert.equal(getCachedQuoteLedger('admin@cimon.com', 2026, '기술영업', 124_000), null);

console.log('✅ 견적 대장 세션 캐시의 계정/연도/부서 격리와 TTL 테스트 통과');
