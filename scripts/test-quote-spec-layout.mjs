import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { fillQuoteTemplate } from '../server/fillTemplate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = join(root, 'agent', 'templates', '견적서 샘플.xlsx');
const appsScriptPath = join(root, 'APPS_SCRIPT_Code_gs_전체교체코드.txt');
const tempRoot = join(process.env.LOCALAPPDATA || 'C:/Users/CIMON/AppData/Local', 'Temp', 'opencode');
await mkdir(tempRoot, { recursive: true });
const tempDir = await mkdtemp(join(tempRoot, 'quote-spec-layout-'));

try {
  const outputPath = join(tempDir, 'spec-row-height.xlsx');
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
  ].map(extractFunction).join('\n\n');
  const sizeRows = new Function(
    'SpreadsheetApp',
    `${helpers}\nreturn sizeQuotePdfItemRows_;`,
  )({ WrapStrategy: { WRAP: 'WRAP' } });
  const rowHeights = new Map([[16, 36], [17, 36]]);
  const wrapCalls = [];
  const columnWidths = { 2: 75, 3: 70, 4: 160, 5: 90, 6: 120 };
  const mockSheet = {
    getRange: (row, column) => ({
      setWrapStrategy: (strategy) => wrapCalls.push({ row, column, strategy }),
      getFontSize: () => 10,
      getMergedRanges: () => {
        if (column === 2) return [{ getRow: () => row, getLastRow: () => row, getColumn: () => 2, getLastColumn: () => 3 }];
        if (column === 4) return [{ getRow: () => row, getLastRow: () => row, getColumn: () => 4, getLastColumn: () => 6 }];
        return [];
      },
    }),
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
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
