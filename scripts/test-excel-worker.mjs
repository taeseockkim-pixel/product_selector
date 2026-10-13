import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillQuoteTemplate } from '../server/fillTemplate.js';
import { excelToPdf } from '../server/excelToPdf.js';
import { ExcelPdfWorker, excelToPdfBatchWarm, shutdownExcelPdfWorker } from '../server/excelPdfWorker.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = join(root, 'agent', 'templates', '견적서 샘플.xlsx');
const tempRoot = join(process.env.LOCALAPPDATA || 'C:/Users/CIMON/AppData/Local', 'Temp', 'opencode');
await mkdir(tempRoot, { recursive: true });
const tempDir = await mkdtemp(join(tempRoot, 'excel-worker-'));
const worker = new ExcelPdfWorker({ idleMs: 60000 });

function pageCount(buffer) {
  return (buffer.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
}

async function buildQuote(name) {
  const xlsx = join(tempDir, `${name}.xlsx`);
  await fillQuoteTemplate({
    client: { company: `워커 시험 ${name}`, contact: '담당자', phone: '010-0000-0000', email: 'test@example.com' },
    quoteNumber: `기술영업 WORKER-${name}`,
    details: { quoteDate: '2026년 10월 13일', deliveryLocation: '테스트', deliveryDeadline: '협의', paymentTerms: '협의', validityPeriod: '30일', packing: '제조사 기본', notes: '워커 시험 비고' },
    items: [{ name: 'CM-HNT515-A', spec: 'Intel CPU / 내장 한글 규격 시험', quantity: 1, unitPrice: 100000, totalPrice: 100000 }],
    vatTotal: 110000,
    author: { name: '테스트 작성자', phone: '010-0000-0000', email: 'test@example.com' },
  }, xlsx, templatePath);
  return { xlsx, pdf: join(tempDir, `${name}.pdf`) };
}

try {
  const oneShot = await buildQuote('oneshot');
  const oneShotStartedAt = Date.now();
  excelToPdf(oneShot.xlsx, oneShot.pdf);
  const oneShotMs = Date.now() - oneShotStartedAt;

  const cold = await buildQuote('cold');
  const coldStartedAt = Date.now();
  await worker.convert([{ xlsxPath: cold.xlsx, pdfPath: cold.pdf }]);
  const coldMs = Date.now() - coldStartedAt;

  const warm = await buildQuote('warm');
  const warmStartedAt = Date.now();
  await worker.convert([{ xlsxPath: warm.xlsx, pdfPath: warm.pdf }]);
  const warmMs = Date.now() - warmStartedAt;

  const multiA = await buildQuote('multi-a');
  const multiB = await buildQuote('multi-b');
  await worker.convert([
    { xlsxPath: multiA.xlsx, pdfPath: multiA.pdf },
    { xlsxPath: multiB.xlsx, pdfPath: multiB.pdf },
  ]);

  for (const target of [oneShot, cold, warm, multiA, multiB]) {
    const pdf = await readFile(target.pdf);
    assert.equal(pdf.subarray(0, 4).toString('latin1'), '%PDF', `PDF 헤더가 올바르지 않습니다: ${target.pdf}`);
    assert.equal(pageCount(pdf), 1, `견적서 PDF는 1페이지여야 합니다: ${target.pdf}`);
  }

  // 같은 입력이면 일회성 변환과 워커 변환의 텍스트 레이아웃이 같아야 한다(PDF 바이너리는 날짜·ID가 달라 비교하지 않는다).
  const oneShotText = (await readFile(oneShot.pdf)).toString('latin1').match(/\/MediaBox\s*\[[^\]]+\]/)?.[0];
  const warmText = (await readFile(warm.pdf)).toString('latin1').match(/\/MediaBox\s*\[[^\]]+\]/)?.[0];
  assert.equal(warmText, oneShotText, '워커 PDF의 용지 크기가 일회성 변환과 같아야 합니다.');

  // 존재하지 않는 파일은 오류로 보고되지만 워커는 계속 사용할 수 있어야 한다.
  await assert.rejects(
    worker.convert([{ xlsxPath: join(tempDir, '없는파일.xlsx'), pdfPath: join(tempDir, '없는파일.pdf') }]),
    undefined,
    '없는 XLSX 변환은 오류여야 합니다.',
  );
  const recover = await buildQuote('recover');
  await worker.convert([{ xlsxPath: recover.xlsx, pdfPath: recover.pdf }]);
  assert.equal(pageCount(await readFile(recover.pdf)), 1, '오류 뒤에도 워커가 정상 변환해야 합니다.');

  // Excel 프로세스가 사라진 뒤에도 다음 요청에서 자동 복구되어야 한다.
  worker.kill();
  const restarted = await buildQuote('restarted');
  await worker.convert([{ xlsxPath: restarted.xlsx, pdfPath: restarted.pdf }]);
  assert.equal(pageCount(await readFile(restarted.pdf)), 1, '워커 종료 뒤 재시작해 변환해야 합니다.');

  // 공용 진입점도 정상 동작해야 한다.
  const warmApi = await buildQuote('api');
  const apiResult = await excelToPdfBatchWarm([{ xlsxPath: warmApi.xlsx, pdfPath: warmApi.pdf }], { warn() {} });
  assert.ok(['worker', 'fallback'].includes(apiResult.mode));
  assert.equal(pageCount(await readFile(warmApi.pdf)), 1);

  const digest = createHash('sha256').update(await readFile(warm.pdf)).digest('hex').slice(0, 12);
  console.log(`✅ Excel 상시 변환 시험 통과 (일회성 ${oneShotMs}ms / 워커 첫 변환 ${coldMs}ms / 워커 재사용 ${warmMs}ms, 시작 ${worker.status().lastStartMs}ms, 샘플 ${digest})`);
  assert.ok(warmMs < oneShotMs, `재사용 변환(${warmMs}ms)이 일회성 변환(${oneShotMs}ms)보다 빨라야 합니다.`);
} finally {
  await worker.stop().catch(() => {});
  shutdownExcelPdfWorker();
  await rm(tempDir, { recursive: true, force: true });
}
