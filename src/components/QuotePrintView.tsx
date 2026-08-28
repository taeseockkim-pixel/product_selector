import { useEffect, useRef } from 'react';
import type { Quote } from '../types/quote';
import { generateQuoteHtml } from '../utils/quoteHtml';
import { useT, useLang } from '../context/LangContext';
import { UI } from '../i18n/ui';

interface Props {
  quote: Quote;
  onClose: () => void;
  onGenerate?: () => void | Promise<void>;
  onEmail?: () => void;
  generating?: boolean;
  emailing?: boolean;
  /** 실제 양식으로 채운 PDF의 blob URL. 있으면 이 PDF를 그대로 보여주고, 없으면 HTML 미리보기로 폴백 */
  pdfUrl?: string;
  /** pdfUrl을 아직 만드는 중인지 (true면 iframe 대신 로딩 표시) */
  loading?: boolean;
}

export default function QuotePrintView({ quote, onClose, onGenerate, onEmail, generating, emailing, pdfUrl, loading }: Props) {
  const t = useT();
  const { lang } = useLang();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const actionPreview = Boolean(onGenerate || onEmail);
  const supplyTotal = quote.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');
  const fmtMultiplier = (n: number | undefined) => {
    const value = Number(n ?? 1);
    return Number.isFinite(value) && value > 0 ? String(Number(value.toFixed(4))) : '1';
  };

  useEffect(() => {
    if (actionPreview) return;
    if (loading) return;
    if (pdfUrl) {
      if (iframeRef.current) iframeRef.current.src = pdfUrl;
      return;
    }
    const html = generateQuoteHtml(quote, lang);
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    if (iframeRef.current) iframeRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [quote, pdfUrl, loading, lang, actionPreview]);

  function handlePrint() {
    iframeRef.current?.contentWindow?.print();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-4 px-3">
      <div className={`bg-white shadow-2xl w-full flex flex-col overflow-hidden ${actionPreview ? 'max-w-4xl rounded-lg' : 'max-w-3xl rounded-2xl'}`} style={{ minHeight: actionPreview ? 'auto' : '90vh' }}>
        <div className={`flex items-center justify-between px-5 py-3 border-b flex-none ${actionPreview ? 'bg-indigo-600 text-white border-indigo-600' : 'border-[#ddd9d2]'}`}>
          <span className={`text-sm font-semibold ${actionPreview ? 'text-white' : 'text-[#191919]'}`}>
            {actionPreview ? `▣ ${t(UI.quotePreviewTitle)}` : t(UI.quotePreviewTitle)}
          </span>
          <div className="flex gap-2">
            {!actionPreview && onGenerate && (
              <button
                onClick={onGenerate}
                disabled={generating || emailing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:bg-[#999999] transition-colors"
              >
                {generating ? t(UI.quoteProcessing) : t(UI.quoteSaveBtn)}
              </button>
            )}
            {!actionPreview && onEmail && (
              <button
                onClick={onEmail}
                disabled={generating || emailing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-[#999999] transition-colors"
              >
                {emailing ? t(UI.quoteProcessing) : t(UI.quoteEmailBtn)}
              </button>
            )}
            {!onGenerate && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#191919] text-white text-sm font-medium hover:bg-[#333333] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {t(UI.quotePrintSavePdf)}
              </button>
            )}
            <button
              onClick={onClose}
              className={actionPreview ? 'text-white hover:text-indigo-100 text-2xl leading-none px-1' : 'px-3 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#f0ede8] transition-colors'}
            >
              {actionPreview ? 'x' : onGenerate ? t(UI.quoteCancel) : t(UI.close)}
            </button>
          </div>
        </div>

        {actionPreview ? (
          <>
            <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section>
                  <h3 className="text-sm font-bold text-indigo-700 border-b-2 border-indigo-100 pb-2 mb-3">수신 (고객)</h3>
                  <dl className="grid grid-cols-[90px_1fr] gap-y-2 text-sm">
                    <dt className="text-[#777777]">업체명</dt><dd className="font-semibold">{quote.client.company}</dd>
                    <dt className="text-[#777777]">담당자</dt><dd className="font-semibold">{quote.client.contact}</dd>
                    <dt className="text-[#777777]">연락처</dt><dd>{quote.client.phone}</dd>
                    <dt className="text-[#777777]">이메일</dt><dd>{quote.client.email}</dd>
                  </dl>
                </section>
                <section>
                  <h3 className="text-sm font-bold text-indigo-700 border-b-2 border-indigo-100 pb-2 mb-3">발신 (작성자)</h3>
                  <dl className="grid grid-cols-[90px_1fr] gap-y-2 text-sm">
                    <dt className="text-[#777777]">작성자</dt><dd className="font-semibold">{quote.author.name}</dd>
                    <dt className="text-[#777777]">연락처</dt><dd>{quote.author.phone}</dd>
                    <dt className="text-[#777777]">이메일</dt><dd>{quote.author.email}</dd>
                    <dt className="text-[#777777]">견적번호</dt><dd className="font-semibold text-blue-700">{quote.quoteNumber || '(저장 시 자동 생성)'}</dd>
                  </dl>
                </section>
              </div>

              <section>
                <h3 className="text-sm font-bold text-indigo-700 border-b-2 border-indigo-100 pb-2 mb-3">견적 품목</h3>
                <div className="border border-[#ddd9d2] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f7f6f3] text-[#555555]">
                      <tr>
                        <th className="w-12 px-3 py-2 text-center">No</th>
                        <th className="px-3 py-2 text-left">품명/제품명</th>
                        <th className="px-3 py-2 text-left">규격</th>
                        <th className="w-16 px-3 py-2 text-right">수량</th>
                        <th className="w-28 px-3 py-2 text-right">단가</th>
                        <th className="w-20 px-3 py-2 text-right">배율</th>
                        <th className="w-28 px-3 py-2 text-right">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items.map((item, index) => (
                        <tr key={`${item.name}-${index}`} className="border-t border-[#e5e1da]">
                          <td className="px-3 py-3 text-center text-[#777777]">{index + 1}</td>
                          <td className="px-3 py-3 font-medium">{item.name}</td>
                          <td className="px-3 py-3 text-xs leading-relaxed">{item.spec}</td>
                          <td className="px-3 py-3 text-right">{item.quantity}</td>
                          <td className="px-3 py-3 text-right">{fmt(item.unitPrice)}</td>
                          <td className="px-3 py-3 text-right">{fmtMultiplier(item.multiplier)}</td>
                          <td className="px-3 py-3 text-right font-semibold">{fmt(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-indigo-50">
                      <tr className="border-t border-indigo-100">
                        <td colSpan={6} className="px-3 py-3 text-right font-semibold">공급가액 합계</td>
                        <td className="px-3 py-3 text-right font-semibold">{fmt(supplyTotal)} 원</td>
                      </tr>
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-right text-lg font-bold text-indigo-700">총 견적 금액 (VAT포함)</td>
                        <td className="px-3 py-4 text-right text-lg font-bold text-indigo-700">{fmt(quote.vatTotal)} 원</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-indigo-700 border-b-2 border-indigo-100 pb-2 mb-3">납품 조건</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 bg-[#f7f6f3] rounded-lg p-4 text-sm">
                  <div><span className="text-[#777777] mr-2">납품장소:</span><span className="font-medium">{quote.details.deliveryLocation}</span></div>
                  <div><span className="text-[#777777] mr-2">납품기한:</span><span className="font-medium">{quote.details.deliveryDeadline}</span></div>
                  <div><span className="text-[#777777] mr-2">결제조건:</span><span className="font-medium">{quote.details.paymentTerms}</span></div>
                  <div><span className="text-[#777777] mr-2">유효기간:</span><span className="font-medium">{quote.details.validityPeriod}</span></div>
                </div>
              </section>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 bg-[#f0ede8] border-t border-[#ddd9d2]">
              <button onClick={onClose} className="px-5 py-2 rounded-lg bg-[#6b7280] text-white text-sm font-semibold hover:bg-[#4b5563] transition-colors">
                {t(UI.quoteCancel)}
              </button>
              {onGenerate && (
                <button onClick={onGenerate} disabled={generating || emailing} className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:bg-[#999999] transition-colors">
                  {generating ? t(UI.quoteProcessing) : t(UI.quoteSaveBtn)}
                </button>
              )}
              {onEmail && (
                <button onClick={onEmail} disabled={generating || emailing} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-[#999999] transition-colors">
                  {emailing ? t(UI.quoteProcessing) : t(UI.quoteEmailBtn)}
                </button>
              )}
            </div>
          </>
        ) : loading ? (
          <div className="flex-1 w-full flex items-center justify-center text-sm text-[#999999]" style={{ minHeight: '80vh' }}>
            {t(UI.quoteFillingTemplate)}
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            className="flex-1 w-full rounded-b-2xl"
            style={{ minHeight: '80vh', border: 'none' }}
            title={t(UI.quotePreviewTitle)}
          />
        )}
      </div>
    </div>
  );
}
