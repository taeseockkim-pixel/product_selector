/**
 * check-i18n.mjs
 * 번역 누수 검증 스크립트
 *
 * 실행: npm run check:i18n
 *
 * specValues.ts 를 텍스트로 읽어 TOKENS 를 동적으로 추출한 뒤,
 * products.json 의 모든 spec value 에 적용하여
 * 한글이 잔류하는 항목을 빈도순으로 출력합니다.
 * 잔류 건수가 0 이면 통과(exit 0), 아니면 실패(exit 1).
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── specValues.ts 에서 TOKENS 동적 추출 ──────────────────────────
function loadTokens() {
  const src = readFileSync(
    path.join(ROOT, 'src/i18n/specValues.ts'),
    'utf-8'
  );

  // TOKENS 배열 블록만 추출
  const match = src.match(/const TOKENS[^=]*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error('specValues.ts 에서 TOKENS 를 찾을 수 없습니다.');

  // TypeScript → JS 변환: 정규식 리터럴은 eval 안에서 그대로 작동
  // eslint-disable-next-line no-eval
  const tokens = eval(match[1]);
  return tokens;
}

const TOKENS = loadTokens();

function translate(v) {
  for (const [re, rep] of TOKENS) {
    // eval 로 불러온 RegExp 는 lastIndex 가 누적되므로 매번 reset
    if (re.global) re.lastIndex = 0;
    v = v.replace(re, rep);
  }
  return v;
}

const KO_PATTERN = /[가-힣]/;

const products = JSON.parse(
  readFileSync(path.join(ROOT, 'src/data/products.json'), 'utf-8')
);

const issues = new Map(); // translated → count

for (const p of products) {
  for (const s of p.specs ?? []) {
    const translated = translate(s.value);
    if (KO_PATTERN.test(translated)) {
      issues.set(translated, (issues.get(translated) ?? 0) + 1);
    }
  }
}

const sorted = [...issues.entries()].sort((a, b) => b[1] - a[1]);

if (sorted.length === 0) {
  console.log('✅  번역 누수 없음 (0건)');
  process.exit(0);
} else {
  console.error(`\n❌  번역 누수 ${sorted.length}종 (총 ${[...issues.values()].reduce((a,b)=>a+b,0)}건)\n`);
  for (const [val, cnt] of sorted) {
    console.error(`  (${String(cnt).padStart(3)}) ${val.slice(0, 90)}`);
  }
  console.error('\n→ src/i18n/specValues.ts 에 패턴을 추가하세요.\n');
  process.exit(1);
}
