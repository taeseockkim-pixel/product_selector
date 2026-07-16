import ExcelJS from 'exceljs';
import { existsSync } from 'fs';

const HEADERS = ['NO', '년도', '월', '일', '견적번호', '업체명', '고객명', '연락처', '이메일', '제품 항목', '제품명', '견적 금액', '비고', '파일링크'];

const PRODUCT_CATEGORIES = [
  ['SCADA PRO', /SCADA\s*PRO/i],
  ['SCADA', /SCADA/i],
  ['TOUCH MONITOR', /TOUCH\s*MONITOR/i],
  ['BOX PC', /BOX\s*PC|\bNB\d/i],
  ['Hybird', /HYBRID|HYBIRD/i],
  ['Accessory', /ACCESSORY|ACCESSARY|액세서리/i],
  ['eXT', /\beXT\d*\b/i],
  ['XPANEL', /XPANEL/i],
  ['PLC', /\bPLC\b|\bCM[013]\b|NET\/RIO|CIMON-NET|REMOTE\s*IO|\bRIO\b/i],
  ['TOUCH', /TOUCH|50000_70000|5000SERIES|500SERIES|\biN[TP]\d/i],
];

function quoteDateParts(quote) {
  const numbers = String(quote.details?.quoteDate ?? '').match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length >= 3) return { year: numbers[0], month: numbers[1], day: numbers[2] };
  const date = new Date(quote.createdAt);
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function productCategories(items) {
  const matched = new Set();
  for (const item of items) {
    const source = `${item.type ?? ''} ${item.name ?? ''}`;
    const category = PRODUCT_CATEGORIES.find(([, pattern]) => pattern.test(source));
    if (category) matched.add(category[0]);
  }
  return [...matched].join(', ');
}

function productSummary(items) {
  if (items.length > 1) return `${items[0].name} 외 ${items.length - 1}건`;
  return items[0]?.name ?? '';
}

/** 견적서 생성 시 {year}_견적관리대장.xlsx에 한 행을 순서대로 추가 */
export async function appendToLedger(quote, ledgerPath, xlsxPath) {
  const wb = new ExcelJS.Workbook();
  let ws;

  if (existsSync(ledgerPath)) {
    await wb.xlsx.readFile(ledgerPath);
    ws = wb.worksheets[0];
  } else {
    ws = wb.addWorksheet('견적관리대장');
    ws.addRow(HEADERS);
    ws.getRow(1).font = { bold: true };
  }

  const lastRow = ws.getRow(ws.rowCount);
  const lastNo = ws.rowCount > 1 ? Number(lastRow.getCell(1).value) || 0 : 0;

  const { year, month, day } = quoteDateParts(quote);
  const row = ws.addRow([
    lastNo + 1,
    year,
    month,
    day,
    quote.quoteNumber,
    quote.client.company,
    quote.client.contact,
    quote.client.phone,
    quote.client.email,
    productCategories(quote.items),
    productSummary(quote.items),
    quote.vatTotal,
    quote.details.notes ?? '',
  ]);
  row.getCell(14).value = { text: '열기', hyperlink: xlsxPath };

  await wb.xlsx.writeFile(ledgerPath);
}
