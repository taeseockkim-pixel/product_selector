import { useEffect, useRef } from 'react';
import type { Quote } from '../types/quote';
import { generateQuoteHtml } from '../utils/quoteHtml';

interface Props {
  quote: Quote;
  onClose: () => void;
}

export default function QuotePrintView({ quote, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string>('');

  useEffect(() => {
    const html = generateQuoteHtml(quote);
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;
    if (iframeRef.current) iframeRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [quote]);

  function handlePrint() {
    iframeRef.current?.contentWindow?.print();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ minHeight: '90vh' }}>
        {/* 상단 버튼 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#ddd9d2] flex-none">
          <span className="text-sm font-semibold text-[#191919]">견적서 미리보기</span>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
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

        {/* iframe 미리보기 */}
        <iframe
          ref={iframeRef}
          className="flex-1 w-full rounded-b-2xl"
          style={{ minHeight: '80vh', border: 'none' }}
          title="견적서 미리보기"
        />
      </div>
    </div>
  );
}
