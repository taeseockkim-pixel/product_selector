// check-catalog-ratio.mjs — catalog 사양 비율 최소 기준 검사
// pre-commit 훅에서 호출됨. catalog 비율이 MIN_RATIO 미만이면 exit 1
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const MIN_RATIO = 0.30; // catalog 스펙이 전체의 30% 미만이면 차단

const __dir = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(
  readFileSync(join(__dir, '../src/data/products.json'), 'utf8')
);

let totalCatalog = 0;
let totalAll = 0;

for (const p of products) {
  for (const s of p.specs ?? []) {
    totalAll++;
    if (s.source === 'catalog' || !s.source) totalCatalog++;
  }
}

const ratio = totalAll === 0 ? 1 : totalCatalog / totalAll;
const pct = (ratio * 100).toFixed(1);

if (ratio < MIN_RATIO) {
  console.error(`[pre-commit] ❌ catalog 비율 ${pct}% — 최소 기준 ${(MIN_RATIO * 100).toFixed(0)}% 미달. 커밋 차단.`);
  process.exit(1);
} else {
  console.log(`[pre-commit] ✅ catalog 비율 ${pct}% — 기준 통과.`);
}
