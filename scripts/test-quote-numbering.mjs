import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(join(root, 'src', 'utils', 'quoteNumbering.ts'), 'utf8');
const formSource = await readFile(join(root, 'src', 'components', 'QuoteFormPage.tsx'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exports = {};
new Function('exports', javascript)(exports);

const quoteNumberColumnIndex = 5;
const used = Array.from({ length: 488 }, (_, index) => index + 1).filter((sequence) => sequence !== 482);
const rows = used.map((sequence) => ({ values: [sequence, '', '', '', '', `기술영업 2610-${String(sequence).padStart(3, '0')}`] }));
rows.push({ values: ['', '', '', '', '', '기술영업 2610-488_Rev01'] }); // Rev는 새 기본 일련번호로 중복 계산하지 않는다.

assert.deepEqual(exports.deriveQuoteNumberSequenceOptions(rows, quoteNumberColumnIndex), {
  firstMissingSequence: 482,
  nextSequentialSequence: 489,
  hasGap: true,
});
assert.deepEqual(exports.deriveQuoteNumberSequenceOptions([
  { values: [1, '', '', '', '', '기술영업 2610-001'] },
  { values: [2, '', '', '', '', '기술영업 2610-002'] },
  { values: [3, '', '', '', '', '기술영업 2610-003'] },
], quoteNumberColumnIndex), {
  firstMissingSequence: 4,
  nextSequentialSequence: 4,
  hasGap: false,
});
assert.deepEqual(exports.deriveQuoteNumberSequenceOptions([], quoteNumberColumnIndex), {
  firstMissingSequence: 1,
  nextSequentialSequence: 1,
  hasGap: false,
});
assert.deepEqual(exports.deriveQuoteNumberSequenceOptions([
  { values: ['', '', '', '', '', '기술영업 2610-001'] },
  { values: ['', '', '', '', '', '기술영업 2610-003_Rev02'] },
], quoteNumberColumnIndex), {
  firstMissingSequence: 2,
  nextSequentialSequence: 4,
  hasGap: true,
});
assert.match(formSource, /누락 번호 재사용/);
assert.match(formSource, /마지막 번호 다음/);
assert.match(formSource, /quoteNumberChoiceStale/, '동시 저장 충돌 시 새 선택을 요구해야 합니다.');

console.log('✅ 견적번호 누락/연속 선택 계산 검증 통과 (누락 482, 연속 489)');
