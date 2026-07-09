import ExcelJS from 'exceljs';
import { existsSync } from 'fs';

const HEADERS = ['NO', '년도', '월', '견적번호', '업체명', '고객명', '연락처', '이메일', '제품 항목', '제품명', '견적 금액', '비고', '파일링크'];

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

  const d = new Date(quote.createdAt);
  const row = ws.addRow([
    lastNo + 1,
    d.getFullYear(),
    d.getMonth() + 1,
    quote.quoteNumber,
    quote.client.company,
    quote.client.contact,
    quote.client.phone,
    quote.client.email,
    quote.items[0]?.type ?? '',
    productSummary(quote.items),
    quote.vatTotal,
    quote.details.notes ?? '',
  ]);
  row.getCell(13).value = { text: '열기', hyperlink: xlsxPath };

  await wb.xlsx.writeFile(ledgerPath);
}
