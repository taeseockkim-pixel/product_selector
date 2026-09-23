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
const NOTE_HEADERS = new Set(['비고', '비 고', '비  고']);
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
  let noteCol = 0;
  const specCols = [];
  const unitPriceCols = [];
  const listPriceCols = [];

  for (let c = 1; c <= columnCount; c++) {
    const text = cellText(row.getCell(c));
    if (!nameCol && (NAME_HEADERS.has(text) || (sheetName === 'TOUCH MONITOR' && text === '제품명'))) nameCol = c;
    if (text === '주문수량') qtyCol = c;
    if ((SPEC_HEADERS.has(text) || (sheetName === 'TOUCH MONITOR' && text === 'Size')) && !specCols.includes(c)) specCols.push(c);
    if (NOTE_HEADERS.has(text)) noteCol = c;
    if (text === '단가') unitPriceCols.push({ col: c, minQty: 1 });
    const tier = text.match(/^단가-\s*(\d+)대$/);
    if (tier) unitPriceCols.push({ col: c, minQty: Number(tier[1]) });
    if (text === 'List Price') listPriceCols.push({ col: c, minQty: 1 });
  }

  const priceCols = unitPriceCols.length > 0 ? unitPriceCols : listPriceCols;
  if (!nameCol || priceCols.length === 0) return null;
  return { nameCol, specCols, qtyCol, noteCol, priceCols };
}

function buildIpcDetailedSpec(sheetName, name, specParts, noteText) {
  const isAc = /-A($|\s)/i.test(name) || (sheetName === '500Series' && !/-D($|\s)/i.test(name) && name.endsWith('-A'));
  const isDc = /-D($|\s)/i.test(name) || sheetName.includes('50000') || sheetName.includes('BOX');
  const power = isDc ? 'DC 24V' : (isAc ? 'AC 220V' : '');

  let cpu = '';
  let ramSpec = 'SDRAM8GB(Max. 32GB)';
  let ssd = 'SSD 120 Gbyte';
  let os = 'Windows 10 IoT Enterprise';
  let scada = '';

  const isScada = /iNT|T\d/i.test(name) || /SCADA/i.test(noteText);

  if (sheetName === '500Series') {
    cpu = 'Intel® Celeron® Quad-Core J6412 SoC (FANLESS)';
    ramSpec = 'SDRAM8GB(Max. 32GB)';
    ssd = 'SSD 120 Gbyte';
    os = 'Windows 10 IoT Enterprise';
    if (isScada) scada = 'FULL DS 내장';
  } else if (sheetName === '5000Series') {
    cpu = 'Intel® Core™ i5-6300U (FANLESS)';
    ramSpec = 'SDRAM8GB(Max. 32GB)';
    ssd = 'SSD 120 Gbyte';
    os = 'Windows 10 IoT Enterprise';
    if (isScada) scada = 'FULL DS 내장';
  } else if (sheetName.includes('50000')) {
    const is70k = /711|70000/i.test(name);
    cpu = is70k
      ? 'Intel® Core™ i7-1185G7E Quad Core (FANLESS)'
      : 'Intel® Core™ i5-1145G7E Quad Core (FANLESS)';
    ramSpec = 'SDRAM 8GB';
    ssd = 'SSD 500GB';
    os = 'Windows 11 IoT Enterprise';
    if (isScada) scada = 'SCADA PRO (10K/DS) 내장';
  } else if (sheetName.includes('BOX')) {
    const is70k = /7011/i.test(name);
    const is200 = /200/i.test(name);
    if (is200) {
      cpu = 'Intel® Celeron® Quad-Core J6412 SoC (FANLESS)';
      ssd = 'SSD 120 Gbyte';
    } else if (is70k) {
      cpu = 'Intel® Core™ i7-1185G7E Quad Core (FANLESS)';
      ssd = 'SSD 500GB';
    } else {
      cpu = 'Intel® Core™ i5-1145G7E Quad Core (FANLESS)';
      ssd = 'SSD 500GB';
    }
    ramSpec = 'SDRAM 8GB';
    os = 'Windows 10 IoT Enterprise';
    if (isScada) scada = 'FULL DS 내장';
  }

  // 화면 / 해상도 추출
  let screenPart = '';
  if (specParts.length >= 2) {
    screenPart = `${specParts[0]} / ${specParts[1]}`;
  } else if (specParts.length === 1) {
    screenPart = specParts[0];
  } else if (sheetName.includes('BOX')) {
    screenPart = 'BOX PC TYPE';
  }

  // 1줄: CPU / DDR4
  // 2줄: RAM / SSD / OS
  // 3줄: 화면 / 해상도 / 전원 / SCADA
  const line1 = `${cpu} / DDR4`;
  const line2Parts = [ramSpec];
  if (ssd) line2Parts.push(ssd);
  if (os) line2Parts.push(os);
  const line2 = line2Parts.join(' / ');

  const line3Parts = [];
  if (screenPart) line3Parts.push(screenPart);
  if (power) line3Parts.push(power);
  if (scada) line3Parts.push(scada);
  const line3 = line3Parts.join(' / ');

  return [line1, line2, line3].filter(Boolean).join('\n');
}

function buildDetailedSpec(sheetName, name, specParts, noteText) {
  const isIpc = ['500Series', '5000Series', '50000_70000Series', 'BOX PC Series'].includes(sheetName);
  if (isIpc) {
    return buildIpcDetailedSpec(sheetName, name, specParts, noteText);
  }

  if (sheetName === 'TOUCH MONITOR') {
    if (name.includes('15W')) {
      return '15.6" Wide TFT LCD / 1920 x 1080 (FHD) / 4-Wire Resistive Touch\nLuminance 500 cd/m² / DC 24V / HDMI, VGA';
    }
    if (name.includes('12W')) {
      return '12.1" Wide TFT LCD / 1280 x 800 / 정전식 Touch\nLuminance 600 cd/m² / DC 24V / HDMI, DP, DVI, VGA';
    }
    if (name.includes('21W')) {
      return '21.5" Wide TFT LCD / 1920 x 1080 (FHD) / 정전식 Touch\nLuminance 400 cd/m² / DC 24V / HDMI, DP, DVI, VGA';
    }
  }

  // PLC . CM3: 비고란에 전원 사양이 있으면 보강
  if (sheetName === 'PLC . CM3' && noteText) {
    const powerMatch = noteText.match(/전원\s*:\s*(DC24V|AC\d+V)/i);
    if (powerMatch && !specParts.some((p) => p.includes(powerMatch[1]))) {
      pushUnique(specParts, powerMatch[1]);
    }
  }

  return specParts.join(' / ');
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
      if (!name || NAME_HEADERS.has(name) || name === 'NO' || name === 'Option' || name.startsWith('■') || name.startsWith('*')) continue;

      const specParts = [];
      for (const col of header.specCols) {
        const value = cellText(row.getCell(col));
        if (value && !NAME_HEADERS.has(value) && value !== name) pushUnique(specParts, value);
      }

      let noteText = '';
      if (header.noteCol) {
        noteText = cellText(row.getCell(header.noteCol));
      } else {
        for (let c = 6; c <= sheet.columnCount; c++) {
          const t = cellText(row.getCell(c));
          if (t.includes('Windows') || t.includes('SCADA') || t.includes('전원') || t.includes('포함')) {
            noteText = t;
            break;
          }
        }
      }

      const spec = buildDetailedSpec(sheet.name.trim(), name, specParts, noteText);

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
  const direct = QUOTE_PRODUCT_ITEMS.find((item) => item.id === name);
  if (direct) return direct;

  const normalizeName = (value: string) => value
    .trim()
    .toUpperCase()
    .replace(/\\s+/g, ' ')
    .replace(/\\s*\\([^)]*\\)\\s*$/, '')
    .replace(/^CM03-(\\d+)(\\/)/, (_, digits, suffix) => \`CM03-\${digits.padStart(4, '0')}\${suffix}\`);
  const normalized = normalizeName(name);
  const aliases: Record<string, string> = {
    'CM0-SCB15I': 'CM0-SCB15IR',
  };
  const candidates = [normalized, aliases[normalized]].filter(Boolean);
  const matched = QUOTE_PRODUCT_ITEMS.find((item) => {
    const itemName = normalizeName(item.name);
    return candidates.some((candidate) => itemName === candidate || itemName === \`CM-\${candidate}\` || itemName.endsWith(candidate));
  });
  if (matched) return matched;

  // 베이스 모델명 스마트 매칭 (예: iNT519 -> CM-iNT519-A, iNT(iNP)519-A/D -> CM-iNT519-A)
  const baseMatch = name.match(/^(?:CM-)?([A-Za-z0-9]+)/i);
  if (baseMatch) {
    const prefix = normalizeName(baseMatch[1]);
    return QUOTE_PRODUCT_ITEMS.find((item) => {
      const itemName = normalizeName(item.name);
      return itemName.includes(prefix);
    });
  }

  return undefined;
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
