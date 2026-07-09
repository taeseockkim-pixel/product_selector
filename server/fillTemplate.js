import ExcelJS from 'exceljs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, '..', 'Quote_manage', '기본자료', '견적서 샘플.xlsx');

/**
 * 견적서 샘플.xlsx 템플릿에 데이터를 채워 outPath에 XLSX 저장
 * 셀 매핑 (견적서 샘플.xlsx 분석 결과):
 *   C3=업체명, F3=연락처, I3=견적번호
 *   C4=담당자, F4=이메일,  I4=견적일자
 *   C9=납품장소, C10=납품기한, C11=결제조건, C12=유효기간, C13=포장
 *   A16~: NO/제품명/규격/수량/단가/금액 (행 반복)
 *   A30=총 견적 금액 문자열
 *   B34=비고
 *   H37=작성자, H38=연락처, H39=이메일
 */
const MAX_ITEMS = 14; // 템플릿 품목 행이 16~29행(14행)까지만 준비되어 있음 — 초과 시 총액 행(A30)을 덮어씀

export async function fillQuoteTemplate(quote, outPath) {
  if (quote.items.length > MAX_ITEMS) {
    throw new Error(`품목은 최대 ${MAX_ITEMS}개까지 견적서에 담을 수 있습니다. (현재 ${quote.items.length}개)`);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  const ws = wb.worksheets[0];

  const set = (cell, value) => {
    const c = ws.getCell(cell);
    c.value = value;
  };

  // 고객 정보
  set('C3', quote.client.company);
  set('F3', quote.client.phone);
  set('I3', quote.quoteNumber);
  set('C4', quote.client.contact);
  set('F4', quote.client.email);
  set('I4', quote.details.quoteDate);

  // 거래 조건
  set('C9',  quote.details.deliveryLocation);
  set('C10', quote.details.deliveryDeadline);
  set('C11', quote.details.paymentTerms);
  set('C12', quote.details.validityPeriod);
  set('C13', quote.details.packing);

  // 제품 목록 (16행부터)
  const START_ROW = 16;
  quote.items.forEach((item, i) => {
    const row = START_ROW + i;
    set(`A${row}`, i + 1);
    set(`B${row}`, item.name);
    set(`D${row}`, item.spec ?? '');
    set(`G${row}`, item.quantity);
    set(`H${row}`, item.unitPrice);
    set(`I${row}`, item.totalPrice);
  });

  // 총 견적 금액 (A30)
  const vatStr = `총 견적 금액(VAT포함): ${Math.round(quote.vatTotal).toLocaleString('ko-KR')} 원`;
  set('A30', vatStr);

  // 비고 (B34)
  if (quote.details.notes) set('B34', quote.details.notes);

  // 작성자 (H37~H39)
  set('H37', quote.author.name);
  set('H38', quote.author.phone);
  set('H39', quote.author.email);

  await wb.xlsx.writeFile(outPath);
}
