#!/usr/bin/env node
/**
 * CSV → products.json 스펙 반영 스크립트
 * 사용법: node scripts/import-specs-csv.js docs/specs-input-template.csv
 */

const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('사용법: node scripts/import-specs-csv.js <csv파일경로>');
  process.exit(1);
}

const productsPath = path.join(__dirname, '../src/data/products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

const csvText = fs.readFileSync(csvPath, 'utf8');
const rows = csvText
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .slice(1); // 헤더 제거

let added = 0;
let updated = 0;
let skipped = 0;

rows.forEach(row => {
  const cols = row.split(',');
  // catalog_section, modelName, label, value (value에 쉼표 포함 가능)
  const [, modelName, label, ...valueParts] = cols;
  const value = valueParts.join(',').trim();

  if (!modelName || !label || !value) {
    skipped++;
    return;
  }

  const product = products.find(p => p.modelName === modelName.trim());
  if (!product) {
    console.warn(`⚠️  제품 없음: ${modelName.trim()}`);
    skipped++;
    return;
  }

  if (!product.specs) product.specs = [];

  const existing = product.specs.find(s => s.label === label.trim());
  if (existing) {
    existing.value = value;
    existing.source = 'catalog';
    updated++;
  } else {
    product.specs.push({ label: label.trim(), value, source: 'catalog' });
    added++;
  }
});

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf8');

console.log(`✅ 완료`);
console.log(`   추가: ${added}개`);
console.log(`   수정: ${updated}개`);
console.log(`   건너뜀(값 없음): ${skipped}개`);
