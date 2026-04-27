// validate-specs.mjs — products.json 사양 데이터 검증 스크립트
// npm run validate:specs 로 실행
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(
  readFileSync(join(__dir, '../src/data/products.json'), 'utf8')
);

let totalCatalog = 0;
let totalEstimated = 0;
let totalUntagged = 0;
const zeroVerified = [];

for (const p of products) {
  let catalogCount = 0;
  for (const s of p.specs ?? []) {
    if (s.source === 'estimated') {
      totalEstimated++;
    } else if (s.source === 'catalog') {
      totalCatalog++;
      catalogCount++;
    } else {
      // source 미지정 = catalog 취급 (하지만 명시 권장)
      totalUntagged++;
      catalogCount++;
    }
  }
  if (catalogCount === 0) {
    zeroVerified.push({ id: p.id, modelName: p.modelName, subType: p.subType });
  }
}

console.log('\n=== 사양 데이터 검증 결과 ===');
console.log(`전체 제품 수    : ${products.length}`);
console.log(`catalog (표시)  : ${totalCatalog}`);
console.log(`estimated (숨김): ${totalEstimated}`);
console.log(`source 미지정   : ${totalUntagged}  ← 명시 권장`);

if (zeroVerified.length > 0) {
  console.log(`\n[경고] 카탈로그 사양이 0개인 제품 (${zeroVerified.length}건):`);
  for (const p of zeroVerified) {
    console.log(`  - ${p.modelName} (${p.id}) [${p.subType}]`);
  }
} else {
  console.log('\n[OK] 모든 제품에 카탈로그 사양이 1개 이상 존재합니다.');
}
console.log('');
