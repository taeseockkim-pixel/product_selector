import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { excelToPdf } from '../server/excelToPdf.js';
import { fillQuoteTemplate, MAX_QUOTE_NOTES_LENGTH } from '../server/fillTemplate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = join(root, 'agent', 'templates', '견적서 샘플.xlsx');
const appsScriptPath = join(root, 'APPS_SCRIPT_Code_gs_전체교체코드.txt');
const tempRoot = join(process.env.LOCALAPPDATA || 'C:/Users/CIMON/AppData/Local', 'Temp', 'opencode');
await mkdir(tempRoot, { recursive: true });
const tempDir = await mkdtemp(join(tempRoot, 'quote-spec-layout-'));

try {
  const outputPath = join(tempDir, 'spec-row-height.xlsx');
  const stressOutputPath = join(tempDir, 'one-page-stress.xlsx');
  const stressPdfPath = join(tempDir, 'one-page-stress.pdf');
  const longSpec = 'Intel Celeron Quad-Core J6412 SoC (FANLESS) / DDR4 SDRAM 8GB (Max. 32GB) / SSD 120 Gbyte / Windows 10 IoT Enterprise / Development + Runtime Keylock / Dual Ethernet / extended product configuration';

  await fillQuoteTemplate({
    client: { company: '규격 줄바꿈 테스트', contact: '테스트', phone: '000', email: 'test@example.com' },
    quoteNumber: '기술영업 2610-TEST',
    details: {
      quoteDate: '2026년 10월 12일',
      deliveryLocation: '테스트',
      deliveryDeadline: '협의',
      paymentTerms: '협의',
      validityPeriod: '30일',
      packing: '제조사 기본',
      notes: '',
    },
    items: [
      { name: 'CM-HNT515-A', spec: longSpec, quantity: 1, unitPrice: 100000, totalPrice: 100000 },
      { name: '단축 규격 제품', spec: '기본 규격', quantity: 1, unitPrice: 1000, totalPrice: 1000 },
    ],
    vatTotal: 111100,
    author: { name: '테스트 작성자', phone: '000', email: 'test@example.com' },
  }, outputPath, templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputPath);
  const worksheet = workbook.worksheets[0];
  const longRow = worksheet.getRow(16);
  const shortRow = worksheet.getRow(17);

  assert.equal(worksheet.getCell('D16').alignment.wrapText, true, '규격 셀은 줄바꿈이어야 합니다.');
  assert.ok(longRow.height >= 60, `긴 규격 행 높이가 부족합니다: ${longRow.height}`);
  assert.ok(longRow.height > shortRow.height, '긴 규격 행은 짧은 규격 행보다 높아야 합니다.');

  console.log(`✅ 규격 자동 줄바꿈/행 높이 검증 통과 (긴 규격 ${longRow.height}pt, 짧은 규격 ${shortRow.height}pt)`);

  const stressNotes = '비'.repeat(MAX_QUOTE_NOTES_LENGTH);
  const stressQuote = {
    client: { company: '한 장 출력 검증', contact: '테스트 담당자', phone: '000-0000-0000', email: 'test@example.com' },
    quoteNumber: '기술영업 2610-STRESS',
    details: {
      quoteDate: '2026년 10월 13일',
      deliveryLocation: '테스트',
      deliveryDeadline: '협의',
      paymentTerms: '협의',
      validityPeriod: '30일',
      packing: '제조사 기본',
      notes: stressNotes,
    },
    items: Array.from({ length: 14 }, (_, index) => ({
      name: `CM-HNT515-A-LONG-NAME-${index + 1}`,
      spec: longSpec,
      quantity: 1,
      unitPrice: 100000,
      totalPrice: 100000,
    })),
    vatTotal: 1540000,
    author: { name: '테스트 작성자', phone: '000-0000-0000', email: 'test@example.com' },
  };
  await fillQuoteTemplate(stressQuote, stressOutputPath, templatePath);

  const stressWorkbook = new ExcelJS.Workbook();
  await stressWorkbook.xlsx.readFile(stressOutputPath);
  const stressSheet = stressWorkbook.worksheets[0];
  assert.equal(stressSheet.getCell('B34').value, stressNotes, '비고 원문 150자 전체를 보존해야 합니다.');
  assert.equal(stressSheet.getCell('B34').alignment.wrapText, true, '비고 셀은 자동 줄바꿈이어야 합니다.');
  assert.equal(stressSheet.getCell('B34').alignment.vertical, 'top', '비고는 위쪽 정렬이어야 합니다.');
  assert.ok(stressSheet.getCell('B34').font.size >= 7, '비고 글꼴은 7pt 미만으로 축소하면 안 됩니다.');
  assert.ok(stressSheet.getCell('B34').font.size <= 9, '비고 글꼴은 9pt를 넘지 않아야 합니다.');
  assert.equal(stressSheet.pageSetup.fitToPage, true, 'Excel 인쇄는 페이지 맞춤이 활성화되어야 합니다.');
  assert.equal(stressSheet.pageSetup.fitToWidth, 1, 'Excel 인쇄 너비는 1페이지여야 합니다.');
  assert.equal(stressSheet.pageSetup.fitToHeight, 1, 'Excel 인쇄 높이는 1페이지여야 합니다.');
  assert.equal(stressSheet.pageSetup.printArea, 'A1:J42', '인쇄 범위는 양식 사용 영역으로 제한되어야 합니다.');

  await excelToPdf(stressOutputPath, stressPdfPath);
  const stressPdf = await readFile(stressPdfPath);
  const stressPdfPageCount = (stressPdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
  assert.equal(stressPdfPageCount, 1, `극단 조건 PDF는 반드시 1페이지여야 합니다. (현재 ${stressPdfPageCount}페이지)`);
  console.log(`✅ Excel COM 극단 조건 1페이지 PDF 검증 통과 (14개 긴 품목 + 150자 비고)`);

  await assert.rejects(
    fillQuoteTemplate({ ...stressQuote, details: { ...stressQuote.details, notes: '비'.repeat(MAX_QUOTE_NOTES_LENGTH + 1) } }, join(tempDir, 'too-long-notes.xlsx'), templatePath),
    /비고는 150자까지 입력할 수 있습니다/,
    '151자 비고는 서버 XLSX 생성 단계에서 거부되어야 합니다.',
  );

  // Gmail 첨부용 Apps Script PDF 경로도 병합 셀 폭에 맞춰 행 높이를 조정하는지 별도 검증한다.
  const scriptText = await readFile(appsScriptPath, 'utf8');
  function extractFunction(name) {
    const start = scriptText.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `Apps Script 함수가 없습니다: ${name}`);
    const next = scriptText.indexOf('\nfunction ', start + 10);
    return scriptText.slice(start, next < 0 ? scriptText.length : next);
  }
  const helpers = [
    'mergedSheetCellWidthPx_',
    'quoteTextDisplayUnits_',
    'estimateQuoteCellLines_',
    'sizeQuotePdfItemRows_',
    'sizeQuotePdfNotes_',
  ].map(extractFunction).join('\n\n');
  const sizeRows = new Function(
    'SpreadsheetApp', 'CELL_MAP', 'MAX_QUOTE_PDF_ITEM_ROW_HEIGHT_PX',
    `${helpers}\nreturn sizeQuotePdfItemRows_;`,
  )({ WrapStrategy: { WRAP: 'WRAP' } }, { notes: 'B34' }, 120);
  const sizeNotes = new Function(
    'SpreadsheetApp', 'CELL_MAP',
    `${helpers}\nreturn sizeQuotePdfNotes_;`,
  )({ WrapStrategy: { WRAP: 'WRAP' } }, { notes: 'B34' });
  const rowHeights = new Map([[16, 36], [17, 36]]);
  const wrapCalls = [];
  const columnWidths = { 2: 75, 3: 70, 4: 160, 5: 90, 6: 120 };
  const fontSizes = new Map();
  const noteStyle = { wrap: false, vertical: 'middle', fontSize: 9 };
  const mockSheet = {
    getRange: (row, column) => {
      if (typeof row === 'string') {
        return {
          setWrap: (value) => { noteStyle.wrap = value; return this; },
          setVerticalAlignment: (value) => { noteStyle.vertical = value; return this; },
          setFontSize: (value) => { noteStyle.fontSize = value; return this; },
        };
      }
      const key = `${row}:${column}`;
      return {
        setWrapStrategy: (strategy) => wrapCalls.push({ row, column, strategy }),
        getFontSize: () => fontSizes.get(key) || (row >= 34 ? 9 : 10),
        setFontSize: (value) => fontSizes.set(key, value),
        setWrap: (value) => { noteStyle.wrap = value; return this; },
        setVerticalAlignment: (value) => { noteStyle.vertical = value; return this; },
        getMergedRanges: () => {
          if (column === 2 && row === 34) return [{ getRow: () => 34, getLastRow: () => 40, getColumn: () => 2, getLastColumn: () => 6 }];
          if (column === 2) return [{ getRow: () => row, getLastRow: () => row, getColumn: () => 2, getLastColumn: () => 3 }];
          if (column === 4) return [{ getRow: () => row, getLastRow: () => row, getColumn: () => 4, getLastColumn: () => 6 }];
          return [];
        },
      };
    },
    getColumnWidth: (column) => columnWidths[column] || 80,
    getRowHeight: (row) => rowHeights.get(row) || 36,
    setRowHeight: (row, height) => rowHeights.set(row, height),
  };
  sizeRows(mockSheet, [
    { name: 'CM-INP515-A', spec: longSpec },
    { name: 'SHORT', spec: '기본 규격' },
  ], 16);
  assert.ok(rowHeights.get(16) > rowHeights.get(17), '메일 첨부용 PDF도 긴 규격 행을 확장해야 합니다.');
  assert.equal(wrapCalls.length, 2, '제품명과 규격 셀 모두 줄바꿈이 설정되어야 합니다.');
  console.log(`✅ 메일 첨부용 Google Sheets PDF 행 높이 검증 통과 (${rowHeights.get(16)}px / ${rowHeights.get(17)}px)`);

  for (let row = 34; row <= 40; row += 1) rowHeights.set(row, 12);
  sizeNotes(mockSheet, stressNotes);
  assert.equal(noteStyle.wrap, true, '메일 첨부 PDF 비고 셀은 자동 줄바꿈이어야 합니다.');
  assert.equal(noteStyle.vertical, 'top', '메일 첨부 PDF 비고 셀은 위쪽 정렬이어야 합니다.');
  assert.ok(noteStyle.fontSize >= 7 && noteStyle.fontSize <= 9, '메일 첨부 PDF 비고 글꼴은 7~9pt 범위여야 합니다.');
  assert.match(scriptText, /scale=4/, 'Google Sheets PDF 내보내기는 페이지 맞춤(scale=4)을 지정해야 합니다.');
  assert.match(scriptText, /r1=0&c1=0&r2=42&c2=10/, 'Google Sheets PDF 인쇄 범위는 A1:J42여야 합니다.');
  console.log(`✅ 메일 첨부용 비고 150자 줄바꿈/글꼴 검증 통과 (${noteStyle.fontSize}pt)`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
