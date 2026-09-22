/**
 * 견적통계 모듈 — 로컬 견적 XLSX 파일들을 읽어 부서별 통계 Workbook과 JSON을 생성한다.
 *
 * 출력:
 *  1. {storageRoot}/{부서}/{견적통계.xlsx}  — 부서 폴더 안 통계 시트 (열어서 필터·피벗 가능)
 *  2. {agentFolder}/stats/{부서}.json        — Drive 동기화 폴더의 경량 JSON (Apps Script 대시보드용)
 */
import ExcelJS from 'exceljs';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { basename, dirname, extname, join, sep } from 'path';

// 견적서 샘플.xlsx 셀 매핑 (fillTemplate.js와 동일)
const CELL = {
  company: 'C3', phone: 'F3', quoteNumber: 'I3',
  contact: 'C4', email: 'F4', quoteDate: 'I4',
  deliveryLocation: 'C9', deliveryDeadline: 'C10',
  paymentTerms: 'C11', validityPeriod: 'C12', packing: 'C13',
  totalStr: 'A30', notes: 'B34',
  authorName: 'H37', authorPhone: 'H38', authorEmail: 'H39',
};
const ITEMS_START_ROW = 16;
const ITEMS_MAX_ROWS = 14; // 16~29행

function cellString(ws, addr) {
  try {
    const value = ws.getCell(addr).value;
    if (value == null) return '';
    if (typeof value === 'object') {
      if (value.result !== undefined) return String(value.result ?? '');
      if (value.richText) return value.richText.map((r) => r.text).join('');
      return String(value);
    }
    return String(value);
  } catch {
    return '';
  }
}

function cellNumber(ws, addr) {
  const raw = ws.getCell(addr).value;
  const num = Number(typeof raw === 'object' && raw !== null ? raw.result : raw);
  return Number.isFinite(num) ? num : null;
}

/** 하나의 견적 XLSX를 읽어 견적 + 품목 목록을 반환한다. */
export async function readQuoteFromXlsx(xlsxPath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.worksheets[0];
  if (!ws) return null;

  const items = [];
  for (let row = ITEMS_START_ROW; row < ITEMS_START_ROW + ITEMS_MAX_ROWS; row += 1) {
    const name = cellString(ws, `B${row}`).trim();
    if (!name) break;
    const quantity = cellNumber(ws, `G${row}`) ?? 0;
    const unitPrice = cellNumber(ws, `H${row}`) ?? 0;
    const totalPrice = cellNumber(ws, `I${row}`) ?? 0;
    items.push({
      name,
      spec: cellString(ws, `D${row}`).trim(),
      quantity,
      unitPrice,
      totalPrice,
    });
  }

  const folderName = basename(dirname(xlsxPath));
  const fileName = basename(xlsxPath);

  return {
    quoteNumber: cellString(ws, CELL.quoteNumber).trim() || fileName.replace(/_견적서\.xlsx$/i, ''),
    quoteDate: cellString(ws, CELL.quoteDate).trim(),
    company: cellString(ws, CELL.company).trim(),
    contact: cellString(ws, CELL.contact).trim(),
    phone: cellString(ws, CELL.phone).trim(),
    email: cellString(ws, CELL.email).trim(),
    deliveryLocation: cellString(ws, CELL.deliveryLocation).trim(),
    deliveryDeadline: cellString(ws, CELL.deliveryDeadline).trim(),
    paymentTerms: cellString(ws, CELL.paymentTerms).trim(),
    validityPeriod: cellString(ws, CELL.validityPeriod).trim(),
    packing: cellString(ws, CELL.packing).trim(),
    notes: cellString(ws, CELL.notes).trim(),
    authorName: cellString(ws, CELL.authorName).trim(),
    authorPhone: cellString(ws, CELL.authorPhone).trim(),
    authorEmail: cellString(ws, CELL.authorEmail).trim(),
    items,
    itemAmount: items.reduce((sum, item) => sum + item.totalPrice, 0),
    fileName,
    folderName,
    fileModifiedAt: (() => { try { return statSync(xlsxPath).mtime.toISOString(); } catch { return ''; } })(),
  };
}

/** 부서 폴더 안 모든 연도 폴더를 스캔해 견적 데이터 목록을 만든다. */
export async function scanDepartmentQuotes(storageRoot, department) {
  const deptDir = join(storageRoot, department);
  if (!existsSync(deptDir)) return [];

  const quotes = [];
  const years = readdirSync(deptDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name))
    .map((e) => e.name)
    .sort();

  for (const year of years) {
    const yearDir = join(deptDir, year);
    const folders = readdirSync(yearDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();

    for (const folderName of folders) {
      const folder = join(yearDir, folderName);
      let files = [];
      try { files = readdirSync(folder); } catch { continue; }
      for (const fileName of files) {
        if (!fileName.endsWith('_견적서.xlsx')) continue;
        if (/_Rev\d+_/.test(fileName)) continue; // Rev 파일은 원본 행에 별도 반영하지 않는다
        try {
          const quote = await readQuoteFromXlsx(join(folder, fileName));
          if (quote) { quote.year = Number(year); quotes.push(quote); }
        } catch { /* 손상된 파일은 건너뛴다 */ }
      }
    }
  }
  return quotes;
}

const SUMMARY_HEADERS = [
  '견적번호', '견적일자', '연도', '업체명', '담당자', '연락처', '이메일',
  '납품장소', '납품기한', '결제조건', '유효기간', '포장', '비고',
  '작성자', '작성자연락처', '작성자이메일', '품목수', '공급가액', '품목금액계',
  '폴더명', '파일명', '수정일시',
];

const DETAIL_HEADERS = [
  '견적번호', '견적일자', '업체명', 'NO', '제품명', '규격', '수량', '단가', '금액',
];

function styleHeaderRow(ws) {
  const row = ws.getRow(1);
  row.font = { bold: true };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

/** 부서 통계 Workbook(XLSX)을 만들어 저장한다. */
export async function writeStatsWorkbook(storageRoot, department, quotes) {
  if (!quotes || quotes.length === 0) return;
  const wb = new ExcelJS.Workbook();

  // ── 시트1: 견적 요약 ──
  const summary = wb.addWorksheet('견적요약');
  summary.addRow(SUMMARY_HEADERS);
  styleHeaderRow(summary);
  quotes.forEach((q) => {
    summary.addRow([
      q.quoteNumber, q.quoteDate, q.year ?? '', q.company, q.contact, q.phone, q.email,
      q.deliveryLocation, q.deliveryDeadline, q.paymentTerms, q.validityPeriod, q.packing, q.notes,
      q.authorName, q.authorPhone, q.authorEmail, q.items.length, '', q.itemAmount,
      q.folderName, q.fileName, q.fileModifiedAt,
    ]);
  });
  summary.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: SUMMARY_HEADERS.length } };
  [1, 18, 19].forEach((col) => { summary.getColumn(col).width = 22; });
  summary.getColumn(2).width = 14;

  // ── 시트2: 품목 상세 ──
  const detail = wb.addWorksheet('품목상세');
  detail.addRow(DETAIL_HEADERS);
  styleHeaderRow(detail);
  quotes.forEach((q) => {
    q.items.forEach((item, index) => {
      detail.addRow([
        q.quoteNumber, q.quoteDate, q.company, index + 1,
        item.name, item.spec, item.quantity, item.unitPrice, item.totalPrice,
      ]);
    });
  });
  detail.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: DETAIL_HEADERS.length } };
  detail.getColumn(1).width = 22;
  detail.getColumn(5).width = 28;
  detail.getColumn(6).width = 32;

  // ── 시트3: 업체별 요약 ──
  const clientMap = new Map();
  quotes.forEach((q) => {
    const prev = clientMap.get(q.company) || { quotes: 0, amount: 0, lastDate: '' };
    prev.quotes += 1;
    prev.amount += q.itemAmount;
    if (q.quoteDate > prev.lastDate) prev.lastDate = q.quoteDate;
    clientMap.set(q.company, prev);
  });
  const clientSheet = wb.addWorksheet('업체별요약');
  clientSheet.addRow(['업체명', '견적 건수', '총 금액', '최근 견적일']);
  styleHeaderRow(clientSheet);
  [...clientMap.entries()]
    .map(([company, data]) => ({ company, ...data }))
    .sort((a, b) => b.amount - a.amount)
    .forEach((row) => clientSheet.addRow([row.company, row.quotes, row.amount, row.lastDate]));
  clientSheet.getColumn(1).width = 24;
  clientSheet.getColumn(3).width = 18;

  // ── 시트4: 제품별 요약 ──
  const productMap = new Map();
  quotes.forEach((q) => q.items.forEach((item) => {
    const prev = productMap.get(item.name) || { count: 0, quantity: 0, amount: 0 };
    prev.count += 1;
    prev.quantity += item.quantity;
    prev.amount += item.totalPrice;
    productMap.set(item.name, prev);
  }));
  const productSheet = wb.addWorksheet('제품별요약');
  productSheet.addRow(['제품명', '등장 횟수', '총 수량', '총 금액']);
  styleHeaderRow(productSheet);
  [...productMap.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.amount - a.amount)
    .forEach((row) => productSheet.addRow([row.name, row.count, row.quantity, row.amount]));
  productSheet.getColumn(1).width = 28;
  productSheet.getColumn(4).width = 18;

  const deptDir = join(storageRoot, department);
  mkdirSync(deptDir, { recursive: true });
  await wb.xlsx.writeFile(join(deptDir, '견적통계.xlsx'));
}

/** 부서 통계 JSON을 Drive 동기화 폴더에 기록한다 (Apps Script 대시보드용). */
export function writeStatsJson(agentFolder, department, quotes) {
  const statsDir = join(agentFolder, 'stats');
  mkdirSync(statsDir, { recursive: true });

  const records = (quotes || []).map((q) => ({
    quoteNumber: q.quoteNumber,
    quoteDate: q.quoteDate,
    year: q.year,
    company: q.company,
    contact: q.contact,
    phone: q.phone,
    email: q.email,
    authorName: q.authorName,
    authorEmail: q.authorEmail,
    amount: q.itemAmount,
    items: (q.items || []).map((item) => ({
      name: item.name,
      spec: item.spec,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    folderName: q.folderName,
    fileName: q.fileName,
  }));

  writeFileSync(
    join(statsDir, `${department}.json`),
    JSON.stringify({ department, generatedAt: new Date().toISOString(), records }),
    'utf8',
  );
}

/** 부서 전체 견적을 스캔해 통계 Workbook + JSON을 갱신한다. */
export async function refreshDepartmentStats(storageRoot, agentFolder, department) {
  try {
    const quotes = await scanDepartmentQuotes(storageRoot, department);
    await writeStatsWorkbook(storageRoot, department, quotes);
    writeStatsJson(agentFolder, department, quotes);
    console.log(`[통계] ${department} 갱신 완료: ${quotes.length}건`);
    return quotes.length;
  } catch (err) {
    console.error(`[통계] ${department} 갱신 실패: ${err.message}`);
    return 0;
  }
}

/** 저장 직후 단일 견적을 통계 JSON에 반영한다 (전체 재스캔 없이). */
export function appendQuoteToStatsJson(agentFolder, department, quoteData) {
  try {
    const statsDir = join(agentFolder, 'stats');
    mkdirSync(statsDir, { recursive: true });
    const jsonPath = join(statsDir, `${department}.json`);

    let payload = { department, generatedAt: new Date().toISOString(), records: [] };
    try { payload = JSON.parse(readFileSync(jsonPath, 'utf8')); } catch { /* 첫 생성 */ }

    // 같은 견적번호의 기존 기록이 있으면 교체한다 (Rev 재처리 대비).
    payload.records = (payload.records || []).filter(
      (record) => String(record.quoteNumber || '').trim() !== String(quoteData.quoteNumber || '').trim(),
    );

    payload.records.push({
      quoteNumber: quoteData.quoteNumber ?? '',
      quoteDate: quoteData.quoteDate ?? '',
      year: Number(quoteData.year) || new Date().getFullYear(),
      company: quoteData.clientName ?? '',
      contact: quoteData.clientContactPerson ?? '',
      phone: quoteData.clientPhone ?? '',
      email: quoteData.clientEmail ?? '',
      authorName: quoteData.authorName ?? '',
      authorEmail: quoteData.authorEmail ?? '',
      amount: quoteData.itemAmount ?? 0,
      items: (quoteData.items || []).map((item) => ({
        name: item.name ?? '',
        spec: item.spec ?? '',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0,
      })),
      folderName: quoteData.folderName ?? '',
      fileName: '',
    });
    payload.generatedAt = new Date().toISOString();

    writeFileSync(jsonPath, JSON.stringify(payload), 'utf8');
    console.log(`[통계] ${department} JSON 갱신: ${quoteData.quoteNumber ?? ''}`);
  } catch (err) {
    console.error(`[통계] JSON 갱신 실패: ${err.message}`);
  }
}
