import { useCallback, useEffect, useState } from 'react';
import { useT } from '../context/LangContext';
import { UI } from '../i18n/ui';

interface LedgerRow {
  values: string[];
  links: Array<string | null>;
}

interface LedgerResult {
  success: boolean;
  headers?: string[];
  rows?: LedgerRow[];
  message?: string;
}

interface LedgerBridgeResponse {
  source?: string;
  type?: string;
  requestId?: string;
  result?: LedgerResult;
  error?: string;
}

const FOLDER_BROWSER_URL = 'http://172.35.12.36:8790/';

function fileNameFromLink(value: string) {
  try {
    const url = new URL(value);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    return lastPart ? decodeURIComponent(lastPart) : value;
  } catch {
    const lastPart = value.split(/[\\/]/).filter(Boolean).pop();
    return lastPart || value;
  }
}

function loadLedgerViaParent(): Promise<LedgerResult> {
  return new Promise((resolve, reject) => {
    const requestId = `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error('견적관리대장 응답 시간이 초과되었습니다.'));
    }, 30000);

    function handleMessage(event: MessageEvent<LedgerBridgeResponse>) {
      const data = event.data;
      if (data?.source !== 'cimon-appscript-bridge' || data.type !== 'LOAD_QUOTE_LEDGER_RESULT' || data.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timer);
      window.removeEventListener('message', handleMessage);
      if (data.error) reject(new Error(data.error));
      else resolve(data.result ?? { success: false, message: '견적관리대장 응답이 비어 있습니다.' });
    }

    window.addEventListener('message', handleMessage);
    window.parent.postMessage(
      { source: 'cimon-quote-app', type: 'LOAD_QUOTE_LEDGER', requestId },
      '*',
    );
  });
}

interface Props {
  onBack: () => void;
  onNewQuote: () => void;
}

export default function QuoteListPage({ onBack, onNewQuote }: Props) {
  const t = useT();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadLedgerViaParent();
      if (!result.success) throw new Error(result.message || '견적관리대장을 불러오지 못했습니다.');
      setHeaders(result.headers ?? []);
      setRows(result.rows ?? []);
    } catch (err) {
      setError(String(err));
      setHeaders([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadQuotes(); }, [loadQuotes]);

  return (
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
          <button onClick={() => void loadQuotes()} className="px-3 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#e6e2dc] transition-colors">
            {t(UI.quoteRefresh)}
          </button>
          <a
            href={FOLDER_BROWSER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#e6e2dc] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            {t(UI.quoteFolderBtn)}
          </a>
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
          <p className="text-[#999999] text-sm">{t(UI.quoteListLoading)}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-8 text-center">
          <p className="text-red-600 text-sm font-medium mb-2">{t(UI.quoteLoadErrorTitle)}</p>
          <p className="text-red-500 text-xs">{error}</p>
          <p className="text-[#999999] text-xs mt-3">Apps Script 운영 주소에서 접속했는지 확인해 주세요.</p>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] p-16 text-center">
          <p className="text-[#999999] text-sm">{t(UI.quoteListEmpty)}</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="bg-white rounded-xl border border-[#ddd9d2] overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-[#f0ede8]">
              <tr>
                {headers.map((header, index) => (
                  <th key={`${header}-${index}`} className="text-left whitespace-nowrap px-4 py-3 font-semibold text-[#555555] text-xs">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${row.values.join('|')}-${rowIndex}`} className="border-t border-[#f0ede8] hover:bg-[#fafaf9]">
                  {headers.map((_, cellIndex) => {
                    const value = row.values[cellIndex] ?? '';
                    const link = row.links[cellIndex];
                    const href = link ?? (/^https?:\/\//i.test(value) ? value : null);
                    const displayValue = href ? fileNameFromLink(href) : value;
                    return (
                      <td key={cellIndex} className="px-4 py-3 whitespace-nowrap text-[#555555]">
                        {href ? (
                          <a href={href} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline" title={displayValue}>
                            {displayValue || '열기'}
                          </a>
                        ) : value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
