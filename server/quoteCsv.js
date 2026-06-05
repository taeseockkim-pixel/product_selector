/** 견적서 CSV 생성 — 견적관리대장 + 상세 품목 포함 */

export function generateQuoteCsv(quote) {
  const { client, author, details, items, subtotal, vatTotal, quoteNumber, createdAt } = quote;

  const d = new Date(createdAt);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  const productSummary = items.length > 1
    ? `${items[0].name} 외 ${items.length - 1}건`
    : (items[0]?.name ?? '');

  const rows = [];

  // ── 견적 헤더 정보 ──
  rows.push(['[견적 정보]']);
  rows.push(['견적번호', quoteNumber]);
  rows.push(['년도', year]);
  rows.push(['월', month]);
  rows.push(['견적일자', details.quoteDate]);
  rows.push([]);
  rows.push(['[고객 정보]']);
  rows.push(['업체명', client.company]);
  rows.push(['담당자', client.contact]);
  rows.push(['연락처', client.phone]);
  rows.push(['이메일', client.email]);
  rows.push([]);
  rows.push(['[거래 조건]']);
  rows.push(['납품장소', details.deliveryLocation]);
  rows.push(['납품기한', details.deliveryDeadline]);
  rows.push(['결제조건', details.paymentTerms]);
  rows.push(['유효기간', details.validityPeriod]);
  rows.push(['포장', details.packing]);
  rows.push([]);
  rows.push(['[작성자]']);
  rows.push(['이름', author.name]);
  rows.push(['연락처', author.phone]);
  rows.push(['이메일', author.email]);
  rows.push([]);

  // ── 제품 상세 ──
  rows.push(['[제품 목록]']);
  rows.push(['NO', '구분', '제품명', '규격', '수량', '단가', '금액']);
  items.forEach((item) => {
    rows.push([item.no, item.type, item.name, item.spec ?? '', item.quantity, item.unitPrice, item.totalPrice]);
  });
  rows.push([]);
  rows.push(['', '', '', '', '공급가액 합계', '', subtotal]);
  rows.push(['', '', '', '', '총 견적금액(VAT포함)', '', vatTotal]);
  rows.push([]);

  if (details.notes) {
    rows.push(['[비고]']);
    rows.push([details.notes]);
    rows.push([]);
  }

  // ── 견적관리대장 형식 (하단) ──
  rows.push(['[견적관리대장]']);
  rows.push(['NO', '년도', '월', '견적번호', '업체명', '고객명', '연락처', '이메일', '제품항목', '제품명', '견적금액', '비고']);
  rows.push([1, year, month, quoteNumber, client.company, client.contact, client.phone, client.email, items[0]?.type ?? '', productSummary, vatTotal, details.notes ?? '']);

  return rows.map(row => row.map(cell => csvCell(cell)).join(',')).join('\r\n');
}

function csvCell(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
