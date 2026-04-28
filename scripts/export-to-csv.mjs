#!/usr/bin/env node
// products.json → docs/csv-export/products.csv (단일 파일)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { csvEscape } from './_csv-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PRODUCTS_PATH = path.join(ROOT, 'src/data/products.json');
const OUT_DIR = path.join(ROOT, 'docs/csv-export');
const OUT_PATH = path.join(OUT_DIR, 'products.csv');

const BOM = '﻿';

const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const lines = [BOM + 'id,modelName,label,value,source'];

for (const p of products) {
  if (!p.specs || p.specs.length === 0) {
    // 스펙 없는 제품도 한 행으로 포함 (label/value/source 빈 셀)
    lines.push([csvEscape(p.id), csvEscape(p.modelName), '', '', ''].join(','));
  } else {
    for (const s of p.specs) {
      lines.push([
        csvEscape(p.id),
        csvEscape(p.modelName),
        csvEscape(s.label),
        csvEscape(s.value),
        csvEscape(s.source || 'catalog'),
      ].join(','));
    }
  }
}

fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');

console.log('✅ Export 완료');
console.log(`   제품 수: ${products.length}개`);
console.log(`   스펙 수: ${lines.length - 1}행`);
console.log(`   → ${path.relative(ROOT, OUT_PATH)}`);
