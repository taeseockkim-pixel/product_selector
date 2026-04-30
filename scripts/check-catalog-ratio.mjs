// check-catalog-ratio.mjs — pre-commit 훅에서 호출하는 catalog 비율 게이트
// catalog spec 비율 30% 미만이면 exit 1 (커밋 차단)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(readFileSync(join(__dir, '../src/data/products.json'), 'utf8'));

let catalog = 0;
let total = 0;
for (const p of products) {
  for (const s of p.specs ?? []) {
    total++;
    if (s.source !== 'estimated') catalog++;
  }
}

const ratio = total > 0 ? Math.round(catalog / total * 100) : 0;

if (ratio < 30) {
  console.error(`[pre-commit] ❌ catalog spec 비율 ${ratio}% — 30% 미만 (${catalog}/${total})`);
  console.error('[pre-commit]    product_advisor를 실행해 카탈로그 검증 후 재시도하세요:');
  console.error('[pre-commit]    cd D:\\업무\\agent\\product_advisor && npm run review:dry');
  process.exit(1);
}

console.log(`[pre-commit] ✅ catalog 비율 ${ratio}% (${catalog}/${total}) — 통과`);
