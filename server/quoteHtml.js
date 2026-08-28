/** 견적서 HTML — src/utils/quoteHtml.ts와 동일한 템플릿 */

export function generateQuoteHtml(quote) {
  const { client, author, details, items, vatTotal, quoteNumber } = quote;

  const itemRows = items.map((item, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td class="l b">${esc(item.name)}</td>
      <td class="l sm">${esc(item.spec ?? '')}</td>
      <td class="c">${item.quantity}</td>
      <td class="r">${fmt(item.unitPrice)}</td>
      <td class="r">${fmtMultiplier(item.multiplier)}</td>
      <td class="r b">${fmt(item.totalPrice)}</td>
    </tr>`).join('');

  const emptyRows = Math.max(0, 10 - items.length);
  const emptyRowHtml = `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`.repeat(emptyRows);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
@page { size: A4; margin: 12mm 15mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Malgun Gothic','맑은 고딕',sans-serif; font-size: 10pt; color: #111; background: white; }
.wrap { width: 100%; }
.title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.title { font-size: 22pt; font-weight: bold; letter-spacing: .5em; }
.logo { font-size: 13pt; font-weight: bold; color: #1a1a2e; border: 2px solid #1a1a2e; padding: 4px 12px; letter-spacing: 2px; }
.tbl { width: 100%; border-collapse: collapse; margin-bottom: 7px; font-size: 9.5pt; }
.tbl td { border: 1px solid #888; padding: 4px 6px; }
.lbl { background: #efefef; font-weight: bold; white-space: nowrap; }
.qnum { font-weight: bold; color: #1a3a8a; }
.greeting { font-size: 9pt; margin: 5px 0; }
.cond td { border: 1px solid #888; padding: 3px 6px; }
.cond .lbl { width: 110px; }
.unit { text-align: right; font-size: 8pt; color: #555; margin-bottom: 2px; }
.itbl { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 7px; }
.itbl th { background: #e8e8e8; border: 1px solid #888; padding: 4px; text-align: center; font-weight: bold; white-space: nowrap; }
.itbl td { border: 1px solid #bbb; padding: 3px 4px; vertical-align: middle; }
.itbl th:nth-child(1), .itbl td:nth-child(1) { width: 5%; }
.itbl th:nth-child(2), .itbl td:nth-child(2) { width: 18%; }
.itbl th:nth-child(3), .itbl td:nth-child(3) { width: 39%; }
.itbl th:nth-child(4), .itbl td:nth-child(4) { width: 7%; }
.itbl th:nth-child(5), .itbl td:nth-child(5) { width: 14%; }
.itbl th:nth-child(6), .itbl td:nth-child(6) { width: 7%; }
.itbl th:nth-child(7), .itbl td:nth-child(7) { width: 10%; }
.c { text-align: center; }
.r { text-align: right; }
.l { text-align: left; }
.b { font-weight: 600; }
.sm { font-size: 8pt; }
.total { border: 2px solid #222; text-align: right; padding: 5px 8px; font-size: 11pt; font-weight: bold; margin-bottom: 7px; }
.note { border: 1px solid #888; padding: 5px 8px; min-height: 34px; font-size: 9pt; margin-bottom: 14px; }
.footer { display: flex; justify-content: space-between; align-items: flex-end; }
.co { font-size: 9pt; line-height: 1.7; }
.co-name { font-size: 12pt; font-weight: bold; margin-bottom: 3px; }
.atbl { border-collapse: collapse; font-size: 9.5pt; }
.atbl td { border: 1px solid #888; padding: 3px 8px; }
.atbl .lbl { background: #efefef; font-weight: bold; width: 55px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="title-row">
    <div class="title">견 적 서</div>
    <div class="logo">CIMON</div>
  </div>

  <table class="tbl">
    <tr>
      <td class="lbl" style="width:14%">업체명</td>
      <td style="width:20%">${esc(client.company)}</td>
      <td class="lbl" style="width:12%">연락처</td>
      <td style="width:18%">${esc(client.phone)}</td>
      <td class="lbl" style="width:12%">견적번호</td>
      <td class="qnum">${esc(quoteNumber)}</td>
    </tr>
    <tr>
      <td class="lbl">담당자</td>
      <td>${esc(client.contact)}</td>
      <td class="lbl">이메일</td>
      <td>${esc(client.email)}</td>
      <td class="lbl">견적일자</td>
      <td>${esc(details.quoteDate)}</td>
    </tr>
  </table>

  <p class="greeting">아래의 거래 조건과 같이 견적서를 송부하오니 업무에 참조하시기 바랍니다.</p>

  <table class="tbl cond">
    <tr><td class="lbl">1. 납품장소</td><td>${esc(details.deliveryLocation)}</td></tr>
    <tr><td class="lbl">2. 납품기한</td><td>${esc(details.deliveryDeadline)}</td></tr>
    <tr><td class="lbl">3. 결제조건</td><td>${esc(details.paymentTerms)}</td></tr>
    <tr><td class="lbl">4. 유효기간</td><td>${esc(details.validityPeriod)}</td></tr>
    <tr><td class="lbl">5. 포장</td><td>${esc(details.packing)}</td></tr>
  </table>

  <p class="unit">(단위 : 원, 부가세 별도)</p>

  <table class="itbl">
    <thead>
      <tr><th>NO.</th><th>제품명</th><th>규격</th><th>수량</th><th>단가</th><th>배율</th><th>금액</th></tr>
    </thead>
    <tbody>
      ${itemRows}
      ${emptyRowHtml}
    </tbody>
  </table>

  <div class="total">총 견적 금액(VAT포함) : ${fmt(vatTotal)} 원</div>

  <div class="note"><strong>비고:</strong> ${esc(details.notes ?? '')}</div>

  <div class="footer">
    <div class="co">
      <div class="co-name">(주) 싸이몬</div>
      <div>경기도 성남시 수정구 창업로 42 (시흥동)</div>
      <div>TEL: 031-739-0600 / FAX: 031-739-0699</div>
    </div>
    <table class="atbl">
      <tr><td class="lbl">작성자</td><td>${esc(author.name)}</td></tr>
      <tr><td class="lbl">연락처</td><td>${esc(author.phone)}</td></tr>
      <tr><td class="lbl">이메일</td><td>${esc(author.email)}</td></tr>
    </table>
  </div>
</div>
</body>
</html>`;
}

function fmt(n) { return Math.round(n ?? 0).toLocaleString('ko-KR'); }
function fmtMultiplier(n) {
  const value = Number(n ?? 1);
  return Number.isFinite(value) && value > 0 ? String(Number(value.toFixed(4))) : '1';
}
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
