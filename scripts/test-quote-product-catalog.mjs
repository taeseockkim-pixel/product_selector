import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(join(root, 'src', 'data', 'quoteProductCatalog.ts'), 'utf8');
const marker = 'export const QUOTE_PRODUCT_CATALOG: QuoteCatalogGroup[] = ';
const start = source.indexOf(marker);
assert.notEqual(start, -1, '생성된 견적 카탈로그를 찾지 못했습니다.');
const jsonStart = start + marker.length;
const end = source.indexOf(';\n\nexport const QUOTE_PRODUCT_ITEMS', jsonStart);
assert.notEqual(end, -1, '생성된 견적 상품 JSON의 끝을 찾지 못했습니다.');
const groups = JSON.parse(source.slice(jsonStart, end));

const webGroup = groups.find((group) => group.sheet === 'SCADA PRO. Web');
assert.ok(webGroup, 'SCADA PRO. Web 시트가 견적 상품 선택 목록에 포함되어야 합니다.');
assert.equal(webGroup.items.length, 32, 'SCADA PRO. Web 시트의 32개 단가 상품이 모두 생성되어야 합니다.');
assert.ok(webGroup.items.every((item) => item.categoryLabel === 'SCADA PRO - Web Version'), 'A3의 Web Version 섹션명이 32개 상품 카테고리에 반영되어야 합니다.');
assert.equal(webGroup.items[0].name, 'CM03-0150-01/WS');
assert.equal(webGroup.items[0].spec, 'Web 동시접속 1 User, 150 Tag / Web + Development + Runtime + Keylock');
assert.deepEqual(webGroup.items[0].tiers, [{ minQty: 1, unitPrice: 2550000 }]);
const padded500ThreeUser = webGroup.items.find((item) => item.name === 'CM03-0500-03/WS');
assert.ok(padded500ThreeUser, '형명은 4자리 0500 표기를 사용해야 합니다.');
assert.equal(padded500ThreeUser.spec, 'Web 동시접속 3 User, 500 Tag / Mobile(2User) + Web + Development + Runtime + Keylock');
assert.deepEqual(padded500ThreeUser.tiers, [{ minQty: 1, unitPrice: 7110000 }]);
assert.equal(webGroup.items.at(-1).name, 'CM03-100K-30/WS');
assert.deepEqual(webGroup.items.at(-1).tiers, [{ minQty: 1, unitPrice: 34390000 }]);
assert.equal(new Set(webGroup.items.map((item) => item.id)).size, webGroup.items.length, '새 시트 안의 상품 ID는 중복되면 안 됩니다.');
assert.match(source, /groupCount: 16,/);
assert.match(source, /itemCount: 373,/);

// 기존 저장 견적에 남은 형명도 새 시트의 4자리 형명으로 연결되어 편집 시 다른 상품에 매칭되지 않아야 한다.
const runtimeExports = {};
const generatedJavaScript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
new Function('exports', generatedJavaScript)(runtimeExports);
assert.equal(runtimeExports.findQuoteCatalogItem('CM03-500-03/WS')?.name, 'CM03-0500-03/WS');
assert.equal(runtimeExports.findQuoteCatalogItem('CM03-500/RS')?.name, 'CM03-0500/RS');

console.log('✅ SCADA PRO. Web 견적 카탈로그 검증 통과 (32개 상품, Web Version 라벨, 첫 단가 2,550,000원, 마지막 단가 34,390,000원)');
