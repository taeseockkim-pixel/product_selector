import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { fillQuoteTemplate } from '../server/fillTemplate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = join(root, 'agent', 'templates', '견적서 샘플.xlsx');
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
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
