import type { Quote } from '../types/quote';

function formatKRW(n: number) {
  return Math.round(n).toLocaleString('ko-KR');
}

interface Props {
  quote: Quote;
  onClose: () => void;
}

export default function QuotePrintView({ quote, onClose }: Props) {
  return (
    <>
      {/* 인쇄 전용 전역 스타일 */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #quote-print-root { display: block !important; position: fixed; inset: 0; background: white; z-index: 99999; }
          @page { size: A4 portrait; margin: 12mm 15mm; }
        }
      `}</style>

      {/* 화면 오버레이 */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
          {/* 오버레이 헤더 (인쇄 시 숨김) */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#ddd9d2] print:hidden">
            <span className="text-sm font-semibold text-[#191919]">견적서 미리보기</span>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#191919] text-white text-sm font-medium hover:bg-[#333333] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                인쇄 / PDF 저장
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#f0ede8] transition-colors"
              >
                닫기
              </button>
            </div>
          </div>

          {/* 견적서 본문 */}
          <div id="quote-print-root" className="px-8 py-6 text-[#191919]" style={{ fontFamily: 'Malgun Gothic, 맑은 고딕, sans-serif' }}>
            {/* 타이틀 */}
            <div className="flex items-start justify-between mb-6">
              <h1 className="text-3xl font-bold tracking-[0.5em]">견 적 서</h1>
              <img src="/products/CIMON_Logo.png" alt="CIMON" className="h-10 object-contain" />
            </div>

            {/* 고객 / 견적 정보 */}
            <table className="w-full border-collapse text-sm mb-4">
              <tbody>
                <tr>
                  <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-1.5 w-20">업체명</td>
                  <td className="border border-gray-400 px-3 py-1.5 w-48">{quote.client.company}</td>
                  <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-1.5 w-20">연락처</td>
                  <td className="border border-gray-400 px-3 py-1.5 w-44">{quote.client.phone}</td>
                  <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-1.5 w-24">견적번호</td>
                  <td className="border border-gray-400 px-3 py-1.5 font-semibold text-blue-700">{quote.quoteNumber}</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-1.5">담당자</td>
                  <td className="border border-gray-400 px-3 py-1.5">{quote.client.contact}</td>
                  <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-1.5">이메일</td>
                  <td className="border border-gray-400 px-3 py-1.5">{quote.client.email}</td>
                  <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-1.5">견적일자</td>
                  <td className="border border-gray-400 px-3 py-1.5">{quote.details.quoteDate}</td>
                </tr>
              </tbody>
            </table>

            {/* 인사말 */}
            <p className="text-sm mb-3">아래의 거래 조건과 같이 견적서를 송부하오니 업무에 참조하시기 바랍니다.</p>

            {/* 거래 조건 */}
            <table className="w-full border-collapse text-sm mb-4">
              <tbody>
                {[
                  ['납품장소', quote.details.deliveryLocation],
                  ['납품기한', quote.details.deliveryDeadline],
                  ['결제조건', quote.details.paymentTerms],
                  ['유효기간', quote.details.validityPeriod],
                  ['포장',     quote.details.packing],
                ].map(([label, value], i) => (
                  <tr key={i}>
                    <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-1.5 w-24">{i + 1}. {label}</td>
                    <td className="border border-gray-400 px-3 py-1.5">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 단위 표시 */}
            <p className="text-right text-xs text-gray-500 mb-1">(단위 : 원, 부가세 별도)</p>

            {/* 제품 목록 */}
            <table className="w-full border-collapse text-sm mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-2 py-1.5 text-center w-8">NO.</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left w-36">제품명</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-left">규격</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center w-12">수량</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-right w-24">단가</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-right w-28">금액</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.no}>
                    <td className="border border-gray-400 px-2 py-1.5 text-center">{item.no}</td>
                    <td className="border border-gray-400 px-2 py-1.5 font-medium">{item.name}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-xs">{item.spec}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-center">{item.quantity}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-right">{formatKRW(item.unitPrice)}</td>
                    <td className="border border-gray-400 px-2 py-1.5 text-right font-medium">{formatKRW(item.totalPrice)}</td>
                  </tr>
                ))}
                {/* 빈 행 패딩 (최소 5행) */}
                {Array.from({ length: Math.max(0, 5 - quote.items.length) }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="border border-gray-400 px-2 py-2" colSpan={6}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 총 견적 금액 */}
            <div className="border-2 border-gray-800 rounded px-4 py-2 text-right text-base font-bold mb-4">
              총 견적 금액(VAT포함) : {formatKRW(quote.vatTotal)} 원
            </div>

            {/* 비고 */}
            {quote.details.notes && (
              <div className="border border-gray-400 px-3 py-2 text-sm mb-4 min-h-[48px]">
                <span className="font-semibold">비고: </span>{quote.details.notes}
              </div>
            )}

            {/* 하단: 회사 + 작성자 */}
            <div className="flex justify-between items-end mt-6">
              <div className="text-sm text-gray-600">
                <p className="font-bold text-base text-[#191919]">(주) 싸이몬</p>
                <p>경기도 성남시 수정구 창업로 42 (시흥동)</p>
                <p>TEL: 031-739-0600</p>
              </div>
              <table className="border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-1.5 w-16">작성자</td>
                    <td className="border border-gray-400 px-3 py-1.5 w-40">{quote.author.name}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-1.5">연락처</td>
                    <td className="border border-gray-400 px-3 py-1.5">{quote.author.phone}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-400 bg-gray-100 font-semibold px-3 py-1.5">이메일</td>
                    <td className="border border-gray-400 px-3 py-1.5">{quote.author.email}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
