import { useState, useEffect } from 'react';
import type { QuoteSummary, Quote } from '../types/quote';
import { useT, useLang } from '../context/LangContext';
import { UI } from '../i18n/ui';
import QuotePrintView from './QuotePrintView';

function formatKRW(n: number) { return Math.round(n).toLocaleString('ko-KR'); }
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

interface Props {
  onBack: () => void;
  onNewQuote: () => void;
}

export default function QuoteListPage({ onBack, onNewQuote }: Props) {
  const t = useT();
  const { lang } = useLang();
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printQuote, setPrintQuote] = useState<Quote | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadQuotes(); }, []);

  async function loadQuotes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quotes');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { quotes: QuoteSummary[] };
      setQuotes(data.quotes);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleView(id: string) {
    try {
      const res = await fetch(`/api/quotes/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const quote = await res.json() as Quote;
      setPrintQuote(quote);
    } catch (err) {
      alert(`조회 실패: ${String(err)}`);
    }
  }

  async function handleDelete(id: string, quoteNumber: string) {
    if (!confirm(`견적번호 ${quoteNumber}를 삭제하시겠습니까?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      alert(`삭제 실패: ${String(err)}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {printQuote && <QuotePrintView quote={printQuote} onClose={() => setPrintQuote(null)} />}

      <div className="max-w-screen-xl mx-auto w-full px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191919] text-white text-sm font-medium hover:bg-[#333333] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {t(UI.back)}
            </button>
            <h1 className="text-lg font-bold text-[#191919]">{t(UI.quoteListTitle)}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={loadQuotes} className="px-3 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#e6e2dc] transition-colors">
              새로고침
            </button>
            <button
              onClick={onNewQuote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191919] text-white text-sm font-medium hover:bg-[#333333] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t(UI.quoteNewBtn)}
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] p-16 text-center">
            <p className="text-[#999999] text-sm">견적 목록을 불러오는 중...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-8 text-center">
            <p className="text-red-600 text-sm font-medium mb-2">데이터를 불러올 수 없습니다</p>
            <p className="text-red-400 text-xs">{error}</p>
            <p className="text-[#999999] text-xs mt-3">Vercel Blob 스토어가 설정되지 않았을 수 있습니다. BLOB_READ_WRITE_TOKEN 환경변수를 확인하세요.</p>
          </div>
        )}

        {!loading && !error && quotes.length === 0 && (
          <div className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] p-16 text-center">
            <p className="text-[#999999] text-sm">{t(UI.quoteListEmpty)}</p>
            <button onClick={onNewQuote} className="mt-4 text-sm text-[#555555] hover:text-[#191919]">
              {t(UI.quoteNewBtn)}
            </button>
          </div>
        )}

        {!loading && !error && quotes.length > 0 && (
          <div className="bg-white rounded-xl border border-[#ddd9d2] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#f0ede8]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-[#555555] text-xs">견적번호</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#555555] text-xs w-24">날짜</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#555555] text-xs">업체명</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#555555] text-xs w-24">담당자</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#555555] text-xs w-32">
                    {lang === 'ko' ? '견적금액(VAT포함)' : 'Total (VAT)'}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[#555555] text-xs w-24">작성자</th>
                  <th className="text-center px-4 py-3 font-semibold text-[#555555] text-xs w-28">액션</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-t border-[#f0ede8] hover:bg-[#fafaf9]">
                    <td className="px-4 py-3 font-medium text-blue-700">{q.quoteNumber}</td>
                    <td className="px-4 py-3 text-[#555555] text-xs">{formatDate(q.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-[#191919]">{q.clientCompany}</td>
                    <td className="px-4 py-3 text-[#555555]">{q.clientContact}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#191919]">{formatKRW(q.vatTotal)} 원</td>
                    <td className="px-4 py-3 text-[#555555] text-xs">{q.authorName}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleView(q.id)}
                          className="px-2 py-1 rounded border border-[#ddd9d2] text-xs text-[#555555] hover:bg-[#e6e2dc] transition-colors"
                        >
                          {t(UI.quoteViewBtn)}
                        </button>
                        <button
                          onClick={() => handleDelete(q.id, q.quoteNumber)}
                          disabled={deletingId === q.id}
                          className="px-2 py-1 rounded border border-red-200 text-xs text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {t(UI.quoteDeleteBtn)}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
