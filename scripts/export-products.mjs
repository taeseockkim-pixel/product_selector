/**
 * products.ts → src/data/products.json 변환 스크립트
 * 실행: node scripts/export-products.mjs
 */
import { createRequire } from 'module';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// TypeScript 파일을 읽어서 데이터 부분만 추출
const tsContent = readFileSync(path.join(rootDir, 'src/data/products.ts'), 'utf-8');

// TypeScript 전용 구문 제거 (as const, type annotations 등)
let jsContent = tsContent
  .replace(/import type.*?;\n/g, '')
  .replace(/import.*?;\n/g, '')
  .replace(/: Product\[\]/g, '')
  .replace(/ as const/g, '')
  .replace(/plcSeries: 'CM1'/g, "plcSeries: 'CM1'")
  .replace(/plcSeries: 'CM3'/g, "plcSeries: 'CM3'")
  .replace(/outputType: 'TR_SINK'/g, "outputType: 'TR_SINK'")
  .replace(/outputType: 'TR_SOURCE'/g, "outputType: 'TR_SOURCE'")
  .replace(/outputType: 'RELAY'/g, "outputType: 'RELAY'")
  .replace(/formFactor: 'SLIM'/g, "formFactor: 'SLIM'")
  .replace(/formFactor: 'BRICK'/g, "formFactor: 'BRICK'")
  .replace(/formFactor: 'MODULAR'/g, "formFactor: 'MODULAR'")
  .replace(/category: 'PLC'/g, "category: 'PLC'")
  .replace(/category: 'IPC'/g, "category: 'IPC'")
  .replace(/category: 'SCADA'/g, "category: 'SCADA'")
  .replace(/category: 'XPANEL'/g, "category: 'XPANEL'")
  .replace(/export const PRODUCTS = /, 'const PRODUCTS = ')
  .replace(/cpuTier: 'J_SERIES'/g, "cpuTier: 'J_SERIES'")
  .replace(/cpuTier: 'I3'/g, "cpuTier: 'I3'")
  .replace(/cpuTier: 'I5'/g, "cpuTier: 'I5'")
  .replace(/cpuTier: 'I7'/g, "cpuTier: 'I7'")
  .replace(/installType: 'PANEL'/g, "installType: 'PANEL'")
  .replace(/installType: 'RACK'/g, "installType: 'RACK'")
  .replace(/installType: 'BOX'/g, "installType: 'BOX'")
  .replace(/installType: 'MONITOR'/g, "installType: 'MONITOR'")
  .replace(/touchType: 'RESISTIVE'/g, "touchType: 'RESISTIVE'")
  .replace(/touchType: 'CAPACITIVE'/g, "touchType: 'CAPACITIVE'")
  .replace(/touchType: 'NONE'/g, "touchType: 'NONE'")
  .replace(/scadaEdition: 'SCADA'/g, "scadaEdition: 'SCADA'")
  .replace(/scadaEdition: 'SCADA_PRO'/g, "scadaEdition: 'SCADA_PRO'")
  .replace(/xpanelOs: 'CE'/g, "xpanelOs: 'CE'")
  .replace(/xpanelOs: 'WEC7'/g, "xpanelOs: 'WEC7'")
  .replace(/xpanelOs: 'LINUX'/g, "xpanelOs: 'LINUX'")
  .replace(/xpanelPower: 'DC24V'/g, "xpanelPower: 'DC24V'")
  .replace(/xpanelPower: 'AC'/g, "xpanelPower: 'AC'");

jsContent += '\nexport { PRODUCTS };';

// 임시 파일로 저장 후 eval
const tmpFile = path.join(rootDir, 'scripts', '_tmp_products.mjs');
writeFileSync(tmpFile, jsContent);

const { PRODUCTS } = await import('./_tmp_products.mjs');

// 카테고리별 분리
const categories = ['PLC', 'IPC', 'SCADA', 'XPANEL'];
const outputDir = path.join(rootDir, 'src', 'data');
mkdirSync(outputDir, { recursive: true });

// 전체 products.json 저장
writeFileSync(
  path.join(outputDir, 'products.json'),
  JSON.stringify(PRODUCTS, null, 2),
  'utf-8'
);

console.log(`✅ 변환 완료: ${PRODUCTS.length}개 제품`);
categories.forEach(cat => {
  const count = PRODUCTS.filter(p => p.category === cat).length;
  console.log(`  - ${cat}: ${count}개`);
});

// 임시 파일 삭제
import { unlinkSync } from 'fs';
unlinkSync(tmpFile);
