// test-quote-item-row-ui.mjs — 견적 품목 입력 행 레이아웃 회귀 테스트
//
// 배경: 품목 하단의 상세/수량/단가/배율/금액/삭제가 서로 다른 높이·너비를 사용해
// 위아래 선이 어긋나고, 좁은 수량 칸과 넓은 단가 칸이 나란히 보였다.
// 또 품목 번호가 11px 보조 글씨에 묻혀 몇 번째 품목인지 알아보기 어려웠다.
//
// 이 테스트는 QuoteFormPage.tsx가 아래 규칙을 유지하는지 검사한다.
//   1) 품목 번호를 두 자리 배지(36px 이상, 18px 굵은 글씨)로 표시
//   2) 하단 라벨 높이(h-5)와 컨트롤 높이(h-10)를 모든 항목에 동일 적용
//   3) 수량·단가·배율 입력칸을 같은 너비로 배치
//   4) 좁은 화면에서는 2열/3열, 넓은 화면에서는 6열로 재배치
//   5) 모델명 라벨에 중복 번호를 다시 넣지 않음

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(join(root, 'src', 'components', 'QuoteFormPage.tsx'), 'utf8');

// 1) 품목 번호 배지
assert.match(
  source,
  /String\(idx \+ 1\)\.padStart\(2, '0'\)/,
  '품목 번호는 두 자리(01, 02 …)로 표시해야 합니다.'
);
assert.match(
  source,
  /min-w-\[36px\][^"]*text-lg font-bold[^"]*tabular-nums/,
  '품목 번호 배지는 36px 이상, 18px 굵은 숫자여야 합니다.'
);

// 2) 라벨/컨트롤 높이 통일
const labelHeights = source.match(/mb-1\.5 block h-5 leading-5 text-xs text-\[#94a3b8\]/g) || [];
assert.equal(
  labelHeights.length,
  6,
  `하단 6개 항목의 라벨은 동일한 높이(h-5)를 사용해야 합니다. (현재 ${labelHeights.length}개)`
);
const controlHeights = source.match(/\bh-10\b/g) || [];
assert.ok(
  controlHeights.length >= 6,
  `하단 컨트롤 6개는 모두 같은 높이(h-10)를 사용해야 합니다. (현재 ${controlHeights.length}개)`
);

// 3) 수량·단가·배율 입력칸 너비 통일 (넓은 화면 6열 배치)
assert.match(
  source,
  /grid grid-cols-2 items-start gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-\[minmax\(64px,1fr\)_minmax\(88px,120px\)_minmax\(88px,120px\)_minmax\(88px,120px\)_minmax\(104px,144px\)_56px\]/,
  '수량·단가·배율은 같은 너비(최소 88px / 최대 120px)로 한 줄에 배치해야 합니다.'
);
assert.match(source, /whitespace-nowrap[^"]*text-sm font-bold/, '금액은 줄바꿈 없이 한 줄로 표시해야 합니다.');
assert.ok(
  !source.includes('72px_116px_76px_132px_48px'),
  '서로 다른 너비를 쓰던 이전 배치는 제거해야 합니다.'
);

// 4) 반응형 재배치
assert.match(source, /grid grid-cols-2[\s\S]{0,200}sm:grid-cols-3/, '좁은 화면에서는 2열로 재배치해야 합니다.');

// 5) 모델명 라벨의 중복 번호 제거 (번호는 배지가 담당)
assert.ok(
  !/idx \+ 1\}\. \{lang === 'en' \? 'Product name'/.test(source),
  '모델명 라벨에 품목 번호를 중복 표시하지 않아야 합니다.'
);

// 6) 모델명/규격 라벨과 입력칸 높이 정렬
assert.match(
  source,
  /mb-1\.5 flex h-5 items-center gap-1\.5[^"]*text-\[11px\][^"]*leading-5/,
  '모델명 라벨은 수기작성 배지가 있어도 20px 높이로 고정되어야 합니다.'
);
assert.match(
  source,
  /mb-1\.5 flex h-5 items-center text-\[11px\][^"]*leading-5/,
  '규격 라벨은 모델명 라벨과 같은 높이여야 합니다.'
);
assert.match(
  source,
  /const itemTextareaRows = Math\.max\(\s*quoteItemTextareaRows\(item\.name, 22\),\s*quoteItemTextareaRows\(item\.spec, 58\)\s*\);/,
  '모델명·규격 입력칸은 같은 줄 수로 높이를 맞춰야 합니다.'
);
assert.equal(
  (source.match(/rows=\{itemTextareaRows\}/g) || []).length,
  2,
  '모델명과 규격 입력칸 모두 공통 줄 수를 사용해야 합니다.'
);
assert.match(
  source,
  /grid grid-cols-1 items-start gap-3 md:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1\.6fr\)\]/,
  '모델명/규격 2단 영역은 위쪽 정렬이어야 합니다.'
);

// 긴 숫자에서도 정렬이 흔들리지 않도록 숫자 폭을 고정한다.
const tabularCount = source.match(/tabular-nums/g) || [];
assert.ok(tabularCount.length >= 5, `숫자 입력/표시에는 tabular-nums를 적용해야 합니다. (현재 ${tabularCount.length}개)`);

console.log('✅ 견적 품목 행 정렬/번호 배지 검증 통과 (라벨 6/6, 컨트롤 6/6, 동일 너비·높이)');
