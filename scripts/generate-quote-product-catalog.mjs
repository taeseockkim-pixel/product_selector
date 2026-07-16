#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'Quote_manage', '기본자료', 'Product_Prise.xlsx');
const OUT_PATH = path.join(ROOT, 'src', 'data', 'quoteProductCatalog.ts');

const NAME_HEADERS = new Set(['형명', '품명', '모델명']);
const SPEC_HEADERS = new Set(['구분', '규격', '사양', 'Display', '해상도']);
const MODULE_SECTION_NAMES = new Set(['전원', '베이스', '증설', 'DI/DO', '아날로그', '온도', '고속/통신', '통신']);

function cellText(cell) {
  try {
    return (cell.text ?? '').trim();
  } catch {
    return '';
  }
}

function cellNumber(cell) {
  const value = cell.value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && 'result' in value && typeof value.result === 'number') {
    return value.result;
  }
  const parsed = Number(cellText(cell).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function minQtyFromCell(cell) {
  const numeric = cellNumber(cell);
  if (numeric != null) return numeric;

  const text = cellText(cell).replace(/,/g, '').trim();
  const range = text.match(/^(\d+)\s*~/);
  if (range) return Number(range[1]);

  const firstNumber = text.match(/(\d+)/);
  if (firstNumber) return Number(firstNumber[1]);

  return null;
}

function sanitizeIdentifier(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Za-z0-9가-힣._/()+,\-\s]/g, '');
}

function pushUnique(array, value) {
  const normalized = value.trim();
  if (normalized && !array.includes(normalized)) array.push(normalized);
}

function findSectionLabel(row, columnCount) {
  for (let c = 1; c <= columnCount; c++) {
    const text = cellText(row.getCell(c)).replace(/\s+/g, ' ').trim();
    if (text.startsWith('■')) {
      return text.replace(/^■\s*/, '').trim();
    }
  }
  return '';
}

function sheetPrefix(sheetName) {
  const sheet = sheetName.trim();
  if (sheet === 'PLC . CM1') return 'CM1';
  if (sheet === 'PLC . CM3') return 'CM3';
  if (sheet.includes('SCADA PRO')) return 'SCADA PRO';
  if (sheet.includes('SCADA')) return 'SCADA';
  if (sheet === 'Net(CAN Bus),RIO(Remote IO)') return 'NET/RIO';
  return sheet;
}

function normalizeSectionLabel(sheetName, sectionLabel) {
  const section = sectionLabel
    .replace(/\s+/g, ' ')
    .replace(/\s*series$/i, '')
    .replace(/\s*Series$/i, '')
    .trim();
  const prefix = sheetPrefix(sheetName);
  if (!section) return prefix;

  const cmMatch = section.match(/CM([13])/i);
  if (cmMatch && sheetName.trim() === 'Accessory') {
    return `CM${cmMatch[1]} - 액세서리`;
  }

  if (MODULE_SECTION_NAMES.has(section)) {
    return `${prefix} - ${section} 모듈`;
  }
  return `${prefix} - ${section}`;
}

function findHeader(row, columnCount, sheetName) {
  let nameCol = 0;
  let qtyCol = 0;
  const specCols = [];
  const unitPriceCols = [];
  const listPriceCols = [];

  for (let c = 1; c <= columnCount; c++) {
    const text = cellText(row.getCell(c));
    if (!nameCol && (NAME_HEADERS.has(text) || (sheetName === 'TOUCH MONITOR' && text === '제품명'))) nameCol = c;
    if (text === '주문수량') qtyCol = c;
    if ((SPEC_HEADERS.has(text) || (sheetName === 'TOUCH MONITOR' && text === 'Size')) && !specCols.includes(c)) specCols.push(c);
    if (text === '단가') unitPriceCols.push({ col: c, minQty: 1 });
    const tier = text.match(/^단가-\s*(\d+)대$/);
    if (tier) unitPriceCols.push({ col: c, minQty: Number(tier[1]) });
    if (text === 'List Price') listPriceCols.push({ col: c, minQty: 1 });
  }

  const priceCols = unitPriceCols.length > 0 ? unitPriceCols : listPriceCols;
  if (!nameCol || priceCols.length === 0) return null;
  return { nameCol, specCols, qtyCol, priceCols };
}

function buildTieredItems(workbook) {
  const groups = [];

  for (const sheet of workbook.worksheets) {
    let header = null;
    let currentSection = sheetPrefix(sheet.name);
    const items = new Map();

    for (let r = 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const sectionLabel = findSectionLabel(row, sheet.columnCount);
      if (sectionLabel) {
        currentSection = normalizeSectionLabel(sheet.name, sectionLabel);
        continue;
      }

      const nextHeader = findHeader(row, sheet.columnCount, sheet.name.trim());
      if (nextHeader) {
        header = nextHeader;
        continue;
      }
      if (!header) continue;

      const rawName = cellText(row.getCell(header.nameCol));
      const name = sanitizeIdentifier(rawName);
      if (!name || NAME_HEADERS.has(name) || name === 'NO' || name === 'Option') continue;

      const specParts = [];
      for (const col of header.specCols) {
        const value = cellText(row.getCell(col));
        if (value && !NAME_HEADERS.has(value) && value !== name) pushUnique(specParts, value);
      }
      const spec = specParts.join(' / ');

      const mapKey = `${name}\u0000${spec}`;
      let item = items.get(mapKey);
      if (!item) {
        item = {
          sheet: sheet.name.trim(),
          categoryLabel: currentSection,
          name,
          spec,
          tiers: [],
        };
        items.set(mapKey, item);
      }

      for (const priceCol of header.priceCols) {
        const price = cellNumber(row.getCell(priceCol.col));
        if (price == null || price <= 0) continue;
        const qtyFromRow = header.qtyCol ? minQtyFromCell(row.getCell(header.qtyCol)) : null;
        const minQty = qtyFromRow ?? priceCol.minQty;
        if (!Number.isFinite(minQty) || minQty < 1) continue;
        item.tiers.push({ minQty, unitPrice: Math.round(price) });
      }
    }

    const normalizedItems = [...items.values()]
      .map((item) => ({
        ...item,
        tiers: item.tiers
          .filter((tier, idx, tiers) => tiers.findIndex((t) => t.minQty === tier.minQty) === idx)
          .sort((a, b) => a.minQty - b.minQty),
      }))
      .filter((item) => item.tiers.length > 0)
      ;

    if (normalizedItems.length > 0) {
      groups.push({ sheet: sheet.name.trim(), items: normalizedItems });
    }
  }

  return groups;
}

function makeId(sheet, name, index) {
  const base = `${sheet}:${name}`.replace(/\s+/g, ' ').trim();
  return `${base}#${index + 1}`;
}

function serialize(groups) {
  let itemCount = 0;
  const withIds = groups.map((group) => ({
    sheet: group.sheet,
    items: group.items.map((item, index) => ({ id: makeId(group.sheet, item.name, index), ...item })),
  }));
  itemCount = withIds.reduce((sum, group) => sum + group.items.length, 0);

  return `// Auto-generated by scripts/generate-quote-product-catalog.mjs from Quote_manage/기본자료/Product_Prise.xlsx.
// Do not edit by hand.

export interface QuoteCatalogTier {
  minQty: number;
  unitPrice: number;
}

export interface QuoteCatalogItem {
  id: string;
  sheet: string;
  name: string;
  spec: string;
  categoryLabel: string;
  tiers: QuoteCatalogTier[];
}

export interface QuoteCatalogGroup {
  sheet: string;
  items: QuoteCatalogItem[];
}

export const QUOTE_PRODUCT_CATALOG: QuoteCatalogGroup[] = ${JSON.stringify(withIds, null, 2)};

export const QUOTE_PRODUCT_ITEMS: QuoteCatalogItem[] = QUOTE_PRODUCT_CATALOG.flatMap((group) => group.items);

export function getQuoteCatalogUnitPrice(item: QuoteCatalogItem, qty: number): number | null {
  const matched = [...item.tiers].reverse().find((tier) => qty >= tier.minQty);
  return matched?.unitPrice ?? null;
}

export function findQuoteCatalogItem(name: string): QuoteCatalogItem | undefined {
  const normalized = name.trim().toUpperCase();
  return QUOTE_PRODUCT_ITEMS.find((item) => {
    const itemName = item.name.trim().toUpperCase();
    return itemName === normalized || itemName === \`CM-\${normalized}\` || itemName.endsWith(normalized);
  });
}

export const QUOTE_PRODUCT_CATALOG_META = {
  source: 'Quote_manage/기본자료/Product_Prise.xlsx',
  generatedAt: '${new Date().toISOString()}',
  groupCount: ${withIds.length},
  itemCount: ${itemCount},
} as const;
`;
}

if (!fs.existsSync(SOURCE_PATH)) {
  console.error(`Product_Prise.xlsx 파일을 찾을 수 없습니다: ${SOURCE_PATH}`);
  process.exit(1);
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(SOURCE_PATH);
const groups = buildTieredItems(workbook);
fs.writeFileSync(OUT_PATH, serialize(groups), 'utf8');

const itemCount = groups.reduce((sum, group) => sum + group.items.length, 0);
console.log(`Generated ${path.relative(ROOT, OUT_PATH)} (${groups.length} sheets, ${itemCount} items)`);
