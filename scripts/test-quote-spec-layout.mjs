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
  const longSpec = 'Intel Celeron Quad-Core J6412 SoC (FANLESS) / DDR4 SDRAM 8GB (Max. 32GB) / SSD 120 Gbyte / Windows 10 IoT Enterprise / Development + Runtime Keylock / Dual Ethernet / 내장 한글 글꼴 확인 / extended product configuration';

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
    client: { company: 'ㅅㄷㄴㅅ1', contact: '테스트 담당자 ㅅㄷㄴㅅ2', phone: 'ㅅㄷㄴㅅ3', email: 'test@example.com' },
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
  assert.equal(stressSheet.getCell('B34').value, stressNotes, '비고 원문 300자 전체를 보존해야 합니다.');
  assert.equal(stressSheet.getCell('B34').alignment.wrapText, true, '비고 셀은 자동 줄바꿈이어야 합니다.');
  assert.equal(stressSheet.getCell('B34').alignment.vertical, 'top', '비고는 위쪽 정렬이어야 합니다.');
  assert.ok(stressSheet.getCell('B34').font.size >= 7, '비고 글꼴은 7pt 미만으로 축소하면 안 됩니다.');
  assert.ok(stressSheet.getCell('B34').font.size <= 9, '비고 글꼴은 9pt를 넘지 않아야 합니다.');
  assert.equal(stressSheet.getCell('C3').font.name, 'Malgun Gothic', '자모가 포함된 업체명은 한글 글꼴이어야 합니다.');
  assert.equal(stressSheet.getCell('C4').font.name, 'Malgun Gothic', '자모가 포함된 담당자명은 한글 글꼴이어야 합니다.');
  assert.equal(stressSheet.getCell('F3').font.name, 'Malgun Gothic', '자모가 포함된 연락처는 한글 글꼴이어야 합니다.');
  assert.equal(stressSheet.getCell('F4').font.name, 'Arial', '영문 전용 이메일 셀의 기존 글꼴은 유지해야 합니다.');
  assert.equal(stressSheet.getCell('I3').font.name, 'Malgun Gothic', '한글 견적번호는 한글 글꼴이어야 합니다.');
  assert.equal(stressSheet.getCell('B16').font.name, 'Arial', '영문 전용 제품명은 기존 글꼴을 유지해야 합니다.');
  assert.equal(stressSheet.getCell('D16').font.name, 'Malgun Gothic', '한글이 포함된 규격은 한글 글꼴이어야 합니다.');
  assert.equal(stressSheet.getCell('B34').font.name, 'Malgun Gothic', '한글 비고는 한글 글꼴이어야 합니다.');
  assert.equal(stressSheet.getCell('C3').font.size, 11, '업체명 글꼴 크기는 변경하지 않아야 합니다.');
  assert.equal(stressSheet.getCell('C3').font.bold, true, '업체명 굵기는 변경하지 않아야 합니다.');
  let authorCell = null;
  stressSheet.eachRow((row) => row.eachCell((cell) => {
    if (cell.value === '테스트 작성자' && (
      !authorCell || cell.row < authorCell.row || (cell.row === authorCell.row && cell.col < authorCell.col)
    )) authorCell = cell;
  }));
  assert.ok(authorCell, '작성자 값을 기록한 셀을 찾아야 합니다.');
  assert.equal(authorCell.font.name, 'Malgun Gothic', '한글 작성자 정보는 한글 글꼴이어야 합니다.');
  assert.equal(stressSheet.pageSetup.fitToPage, true, 'Excel 인쇄는 페이지 맞춤이 활성화되어야 합니다.');
  assert.equal(stressSheet.pageSetup.fitToWidth, 1, 'Excel 인쇄 너비는 1페이지여야 합니다.');
  assert.equal(stressSheet.pageSetup.fitToHeight, 1, 'Excel 인쇄 높이는 1페이지여야 합니다.');
  assert.equal(stressSheet.pageSetup.printArea, 'A1:J42', '인쇄 범위는 양식 사용 영역으로 제한되어야 합니다.');

  await excelToPdf(stressOutputPath, stressPdfPath);
  const stressPdf = await readFile(stressPdfPath);
  const stressPdfPageCount = (stressPdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
  assert.equal(stressPdfPageCount, 1, `극단 조건 PDF는 반드시 1페이지여야 합니다. (현재 ${stressPdfPageCount}페이지)`);
  assert.match(stressPdf.toString('latin1'), /MalgunGothic/i, 'PDF에 맑은 고딕 글꼴이 포함되어야 합니다.');
  console.log(`✅ Excel COM 극단 조건 1페이지 PDF 검증 통과 (14개 긴 품목 + ${MAX_QUOTE_NOTES_LENGTH}자 비고)`);

  await assert.rejects(
    fillQuoteTemplate({ ...stressQuote, details: { ...stressQuote.details, notes: '비'.repeat(MAX_QUOTE_NOTES_LENGTH + 1) } }, join(tempDir, 'too-long-notes.xlsx'), templatePath),
    /비고는 300자까지 입력할 수 있습니다/,
    '301자 비고는 서버 XLSX 생성 단계에서 거부되어야 합니다.',
  );

  // 메일 첨부도 에이전트가 만든 Excel PDF를 그대로 쓰므로, 입력 제한(300자)이 화면·Apps Script·서버에서 같은지만 확인한다.
  // (Google 시트 임시 PDF 경로는 제거되었으며 메일 초안 흐름은 test-quote-draft-flow.mjs가 검증한다.)
  const scriptText = await readFile(appsScriptPath, 'utf8');
  const quoteFormText = await readFile(join(root, 'src', 'components', 'QuoteFormPage.tsx'), 'utf8');
  assert.match(scriptText, /const MAX_QUOTE_NOTES_LENGTH = 300;/, 'Apps Script의 비고 최대 길이는 300자여야 합니다.');
  assert.match(quoteFormText, /const MAX_QUOTE_NOTES_LENGTH = 300;/, '견적 입력 화면의 비고 최대 길이는 300자여야 합니다.');
  assert.equal(MAX_QUOTE_NOTES_LENGTH, 300, '서버 XLSX 생성의 비고 최대 길이는 300자여야 합니다.');
  console.log('✅ 비고 300자 제한이 화면·Apps Script·서버에서 일치합니다.');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
