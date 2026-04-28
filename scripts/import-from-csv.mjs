#!/usr/bin/env node
// docs/csv-export/products.csv → src/data/products.json 반영
//
// 사용법:
//   node scripts/import-from-csv.mjs            # 반영
//   node scripts/import-from-csv.mjs --dry-run  # preview만, 파일 미변경

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parseCSV } from './_csv-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PRODUCTS_PATH = path.join(ROOT, 'src/data/products.json');
const CSV_PATH = path.join(ROOT, 'docs/csv-export/products.csv');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

const VALID_SOURCES = new Set(['catalog', 'estimated', 'user']);

// --- 로드 ---
const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
const originalJSON = JSON.stringify(products);
const idMap = new Map(products.map(p => [p.id, p]));

if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ CSV 파일 없음: ${CSV_PATH}`);
  console.error('   먼저 npm run export:csv 를 실행하세요.');
  process.exit(1);
}

const diff = {
  added: 0,
  updated: 0,
  sourceOnly: 0,
  deleted: 0,
  errors: [],
  warnings: [],
  changedProducts: new Map(),
};

function trackProduct(id, count = 1) {
  diff.changedProducts.set(id, (diff.changedProducts.get(id) || 0) + count);
}

// --- CSV 파싱 ---
const rows = parseCSV(fs.readFileSync(CSV_PATH, 'utf8'));
if (rows.length < 2) {
  console.error('❌ CSV 파일이 비어있습니다.');
  process.exit(1);
}

const headers = rows[0];
const idIdx     = headers.indexOf('id');
const labelIdx  = headers.indexOf('label');
const valueIdx  = headers.indexOf('value');
const sourceIdx = headers.indexOf('source');

if (idIdx === -1 || labelIdx === -1 || valueIdx === -1) {
  console.error('❌ CSV 헤더에 id / label / value 컬럼이 필요합니다.');
  process.exit(1);
}

// --- 행 처리 ---
for (let r = 1; r < rows.length; r++) {
  const cells = rows[r];
  const id    = cells[idIdx]?.trim();
  const label = cells[labelIdx]?.trim();
  const value = cells[valueIdx]?.trim() ?? '';
  const sourceRaw = sourceIdx !== -1 ? (cells[sourceIdx]?.trim() ?? '') : '';

  if (!id) { diff.errors.push(`row ${r + 1}: id 없음`); continue; }

  const product = idMap.get(id);
  if (!product) { diff.errors.push(`row ${r + 1}: id "${id}" 제품 없음`); continue; }

  // label/value 둘 다 빈 셀 = 스펙 없는 제품 placeholder 행, 건너뜀
  if (!label && !value) continue;

  if (!label) { diff.errors.push(`row ${r + 1} (${id}): label 없음`); continue; }

  if (!product.specs) product.specs = [];

  // 빈 value = 변경 없음
  if (value === '') continue;

  const isDelete = value.toUpperCase() === 'DELETE';
  const existingIdx = product.specs.findIndex(s => s.label === label);

  if (isDelete) {
    if (existingIdx !== -1) {
      product.specs.splice(existingIdx, 1);
      diff.deleted++;
      trackProduct(id);
    }
    continue;
  }

  // source 결정
  let resolvedSource = null;
  if (sourceRaw !== '') {
    if (!VALID_SOURCES.has(sourceRaw)) {
      diff.warnings.push(`row ${r + 1} (${id}): source "${sourceRaw}" 유효하지 않음 → 기존 유지`);
    } else {
      resolvedSource = sourceRaw;
    }
  }

  if (existingIdx !== -1) {
    const existing = product.specs[existingIdx];
    const valueChanged = existing.value !== value;
    const oldSource = existing.source ?? 'catalog';
    const newSource = resolvedSource ?? (valueChanged ? 'user' : oldSource);

    if (valueChanged || newSource !== oldSource) {
      existing.value = value;
      existing.source = newSource;
      if (!valueChanged) diff.sourceOnly++;
      else diff.updated++;
      trackProduct(id);
    }
  } else {
    const newSource = resolvedSource ?? 'user';
    product.specs.push({ label, value, source: newSource });
    diff.added++;
    trackProduct(id);
  }
}

// --- diff 출력 ---
const totalChanged = diff.added + diff.updated + diff.deleted + diff.sourceOnly;

console.log('\n=== Import 결과' + (isDryRun ? ' (dry-run)' : '') + ' ===');
console.log(`[Specs] 추가 ${diff.added}건 / 수정 ${diff.updated}건 / source변경 ${diff.sourceOnly}건 / 삭제 ${diff.deleted}건`);

if (diff.changedProducts.size > 0) {
  const list = [...diff.changedProducts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, n]) => `${id}(${n}건)`)
    .join(', ');
  console.log(`[변경 제품] ${list}${diff.changedProducts.size > 10 ? ` 외 ${diff.changedProducts.size - 10}개` : ''}`);
}

function sourceDist(prods) {
  const d = { catalog: 0, estimated: 0, user: 0, untagged: 0 };
  prods.forEach(p => (p.specs || []).forEach(s => {
    const k = s.source ?? 'untagged';
    d[k in d ? k : 'untagged']++;
  }));
  return d;
}
const before = sourceDist(JSON.parse(originalJSON));
const after  = sourceDist(products);
if (JSON.stringify(before) !== JSON.stringify(after)) {
  console.log(`[Source] catalog ${before.catalog}→${after.catalog} / user ${before.user}→${after.user} / estimated ${before.estimated}→${after.estimated}`);
}

if (diff.warnings.length) diff.warnings.forEach(w => console.log('⚠️  ' + w));
if (diff.errors.length)   diff.errors.forEach(e => console.log('❌ ' + e));

// --- 저장 ---
if (!isDryRun) {
  if (totalChanged > 0) {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), 'utf8');
    console.log('\n✅ products.json 저장 완료');
  } else {
    console.log('\n변경 사항 없음 — 파일 미변경');
  }
  try { execSync('node scripts/validate-specs.mjs', { cwd: ROOT, stdio: 'inherit' }); } catch {}
} else {
  console.log('\n(dry-run: 파일 변경 없음)');
}
