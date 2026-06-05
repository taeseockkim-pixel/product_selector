/** 견적서 HTML 템플릿 — 견적서 샘플.xlsx 셀 구조 기반 */

export function generateQuoteHtml(quote) {
  const { client, author, details, items, subtotal, vatTotal, quoteNumber } = quote;

  const itemRows = items.map((item, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td class="left bold">${item.name}</td>
      <td class="left small">${item.spec ?? ''}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">${fmt(item.unitPrice)}</td>
      <td class="right bold">${fmt(item.totalPrice)}</td>
    </tr>`).join('');

  // 빈 행 패딩 (최소 10행)
  const emptyRows = Math.max(0, 10 - items.length);
  const emptyRowHtml = `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`.repeat(emptyRows);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 12mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 10pt; color: #111; background: white; }
  .page { width: 100%; padding: 0; }

  /* 타이틀 */
  .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .title { font-size: 22pt; font-weight: bold; letter-spacing: 0.5em; }
  .logo { font-size: 13pt; font-weight: bold; color: #1a1a2e; border: 2px solid #1a1a2e; padding: 4px 10px; letter-spacing: 2px; }

  /* 고객 정보 테이블 */
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9.5pt; }
  .info-table td { border: 1px solid #888; padding: 4px 6px; }
  .info-table .label { background: #f0f0f0; font-weight: bold; width: 14%; white-space: nowrap; }
  .info-table .value { width: 20%; }
  .info-table .qnum { font-weight: bold; color: #1a3a8a; }

  /* 인사말 */
  .greeting { font-size: 9pt; margin: 6px 0; }

  /* 거래조건 */
  .cond-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9pt; }
  .cond-table td { border: 1px solid #888; padding: 3px 6px; }
  .cond-table .label { background: #f0f0f0; font-weight: bold; width: 20%; white-space: nowrap; }

  /* 단위 */
  .unit-row { text-align: right; font-size: 8pt; color: #555; margin-bottom: 2px; }

  /* 제품 테이블 */
  .item-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 8px; }
  .item-table th { background: #e8e8e8; border: 1px solid #888; padding: 4px 4px; text-align: center; font-weight: bold; white-space: nowrap; }
  .item-table td { border: 1px solid #bbb; padding: 3px 4px; vertical-align: middle; }
  .item-table .center { text-align: center; }
  .item-table .right { text-align: right; }
  .item-table .left { text-align: left; }
  .item-table .bold { font-weight: 600; }
  .item-table .small { font-size: 8pt; }
  .item-table th:nth-child(1) { width: 5%; }
  .item-table th:nth-child(2) { width: 18%; }
  .item-table th:nth-child(3) { width: 42%; }
  .item-table th:nth-child(4) { width: 7%; }
  .item-table th:nth-child(5) { width: 14%; }
  .item-table th:nth-child(6) { width: 14%; }

  /* 합계 */
  .total-box { border: 2px solid #222; text-align: right; padding: 5px 8px; font-size: 11pt; font-weight: bold; margin-bottom: 8px; }

  /* 비고 */
  .note-box { border: 1px solid #888; padding: 5px 8px; min-height: 36px; font-size: 9pt; margin-bottom: 12px; }

  /* 하단: 회사 + 작성자 */
  .footer-row { display: flex; justify-content: space-between; align-items: flex-end; }
  .company-info { font-size: 9pt; line-height: 1.7; }
  .company-name { font-size: 12pt; font-weight: bold; margin-bottom: 3px; }
  .author-table { border-collapse: collapse; font-size: 9.5pt; }
  .author-table td { border: 1px solid #888; padding: 3px 8px; }
  .author-table .label { background: #f0f0f0; font-weight: bold; width: 60px; }
</style>
</head>
<body>
<div class="page">

  <!-- 타이틀 -->
  <div class="title-row">
    <div class="title">견 적 서</div>
    <div class="logo">CIMON</div>
  </div>

  <!-- 고객 정보 (A3:I4) -->
  <table class="info-table">
    <tr>
      <td class="label">업체명</td>
      <td class="value">${esc(client.company)}</td>
      <td class="label">연락처</td>
      <td class="value">${esc(client.phone)}</td>
      <td class="label">견적번호</td>
      <td class="value qnum">${esc(quoteNumber)}</td>
    </tr>
    <tr>
      <td class="label">담당자</td>
      <td class="value">${esc(client.contact)}</td>
      <td class="label">이메일</td>
      <td class="value">${esc(client.email)}</td>
      <td class="label">견적일자</td>
      <td class="value">${esc(details.quoteDate)}</td>
    </tr>
  </table>

  <!-- 인사말 (A7) -->
  <p class="greeting">아래의 거래 조건과 같이 견적서를 송부하오니 업무에 참조하시기 바랍니다.</p>

  <!-- 거래 조건 (A9~A13) -->
  <table class="cond-table">
    <tr><td class="label">1. 납품장소</td><td>${esc(details.deliveryLocation)}</td></tr>
    <tr><td class="label">2. 납품기한</td><td>${esc(details.deliveryDeadline)}</td></tr>
    <tr><td class="label">3. 결제조건</td><td>${esc(details.paymentTerms)}</td></tr>
    <tr><td class="label">4. 유효기간</td><td>${esc(details.validityPeriod)}</td></tr>
    <tr><td class="label">5. 포장</td><td>${esc(details.packing)}</td></tr>
  </table>

  <!-- 단위 (J14) -->
  <p class="unit-row">(단위 : 원, 부가세 별도)</p>

  <!-- 제품 목록 (A15~) -->
  <table class="item-table">
    <thead>
      <tr>
        <th>NO.</th>
        <th>제품명</th>
        <th>규격</th>
        <th>수량</th>
        <th>단가</th>
        <th>금액</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${emptyRowHtml}
    </tbody>
  </table>

  <!-- 합계 (A30) -->
  <div class="total-box">총 견적 금액(VAT포함) : ${fmt(vatTotal)} 원</div>

  <!-- 비고 (A34) -->
  <div class="note-box"><strong>비고:</strong> ${esc(details.notes ?? '')}</div>

  <!-- 하단 (G37~G39) -->
  <div class="footer-row">
    <div class="company-info">
      <div class="company-name">(주) 싸이몬</div>
      <div>경기도 성남시 수정구 창업로 42 (시흥동)</div>
      <div>TEL: 031-739-0600 / FAX: 031-739-0699</div>
    </div>
    <table class="author-table">
      <tr><td class="label">작성자</td><td>${esc(author.name)}</td></tr>
      <tr><td class="label">연락처</td><td>${esc(author.phone)}</td></tr>
      <tr><td class="label">이메일</td><td>${esc(author.email)}</td></tr>
    </table>
  </div>

</div>
</body>
</html>`;
}

function fmt(n) {
  return Math.round(n ?? 0).toLocaleString('ko-KR');
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
