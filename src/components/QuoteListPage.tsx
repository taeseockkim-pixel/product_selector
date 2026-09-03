import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { useT } from '../context/LangContext';
import { UI } from '../i18n/ui';
import { fetchLedger, type LedgerRow } from '../utils/appsScriptBridge';

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

function compareCellValues(left: string, right: string) {
  const leftText = left.trim();
  const rightText = right.trim();
  const leftNumber = Number(leftText.replace(/[^\d.-]/g, ''));
  const rightNumber = Number(rightText.replace(/[^\d.-]/g, ''));
  const numeric = leftText !== '' && rightText !== '' && Number.isFinite(leftNumber) && Number.isFinite(rightNumber);
  if (numeric) return leftNumber - rightNumber;
  return leftText.localeCompare(rightText, 'ko', { numeric: true, sensitivity: 'base' });
}

function ledgerValue(headers: string[], row: LedgerRow, labels: string[]) {
  const index = headers.findIndex((header) => labels.some((label) => header.includes(label)));
  return index >= 0 ? row.values[index] ?? '' : '';
}

interface Props {
  onBack: () => void;
  onNewQuote: () => void;
}

export default function QuoteListPage({ onBack, onNewQuote }: Props) {
  const t = useT();
  const currentYear = new Date().getFullYear();
  const ledgerYears = Array.from({ length: 11 }, (_, index) => currentYear - index);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortIndex, setSortIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchPickerRows, setSearchPickerRows] = useState<LedgerRow[] | null>(null);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLedger(selectedYear);
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
  }, [selectedYear]);

  useEffect(() => { void loadQuotes(); }, [loadQuotes]);

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('ko-KR');
  const searchedRows = rows
    .filter((row) => !normalizedSearch || row.values.some((value) => value.toLocaleLowerCase('ko-KR').includes(normalizedSearch)))
  const visibleRows = [...searchedRows]
    .sort((left, right) => {
      if (sortIndex === null) return 0;
      const compared = compareCellValues(left.values[sortIndex] ?? '', right.values[sortIndex] ?? '');
      return sortDirection === 'asc' ? compared : -compared;
    })
    .filter((row) => !searchPickerRows || searchPickerRows.includes(row));

  function handleSort(index: number) {
    if (sortIndex === index) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortIndex(index);
      setSortDirection('asc');
    }
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    setSearchPickerRows(null);
  }

  function handleYearChange(year: number) {
    setSelectedYear(year);
    setSearchPickerRows(null);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || !normalizedSearch) return;
    const matches = rows.filter((row) => !normalizedSearch || row.values.some((value) => value.toLocaleLowerCase('ko-KR').includes(normalizedSearch)));
    if (matches.length > 1) setSearchPickerRows(matches);
  }

  return (
    <div className="max-w-[1800px] mx-auto w-full px-4 sm:px-6 py-6">
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
          <label className="flex items-center gap-1.5">
            <span className="sr-only">{t(UI.quoteYear)}</span>
            <select
              value={selectedYear}
              onChange={(event) => handleYearChange(Number(event.target.value))}
              className="border border-[#ddd9d2] rounded-lg px-2.5 py-1.5 text-sm bg-white text-[#555555] focus:outline-none focus:border-[#191919]"
            >
              {ledgerYears.map((year) => <option key={year} value={year}>{year}{t(UI.quoteYearSuffix)}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => void loadQuotes()} className="px-3 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#e6e2dc] transition-colors">
            {t(UI.quoteRefresh)}
          </button>
          <div className="relative w-44 sm:w-60">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={searchTerm}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t(UI.quoteSearchPlaceholder)}
              className="w-full border border-[#ddd9d2] rounded-lg pl-9 pr-3 py-1.5 text-sm bg-white focus:outline-none focus:border-[#191919]"
            />
          </div>
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

      {searchPickerRows && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-blue-600 text-white">
              <div>
                <h2 className="text-sm font-bold">{t(UI.quoteSearchSelectTitle)}</h2>
                <p className="text-xs text-blue-100 mt-1">{t(UI.quoteSearchSelectHint)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSearchPickerRows(null)}
                className="text-blue-100 hover:text-white text-xl leading-none"
                aria-label={t(UI.close)}
              >
                x
              </button>
            </div>
            <div className="p-5 space-y-2 max-h-[65vh] overflow-y-auto">
              {searchPickerRows.map((row, index) => (
                <button
                  type="button"
                  key={`${row.values.join('|')}-${index}`}
                  onClick={() => {
                    const quoteNumber = ledgerValue(headers, row, ['견적번호']);
                    setSearchTerm(quoteNumber || searchTerm);
                    setSearchPickerRows(null);
                  }}
                  className="w-full text-left rounded-lg border border-[#ddd9d2] px-4 py-3 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span><strong className="text-[#555555]">{t(UI.quoteNumber)}:</strong> {ledgerValue(headers, row, ['견적번호']) || '-'}</span>
                    <span><strong className="text-[#555555]">{t(UI.quoteCompany)}:</strong> {ledgerValue(headers, row, ['업체명', '회사명']) || '-'}</span>
                    <span><strong className="text-[#555555]">{t(UI.quoteContact)}:</strong> {ledgerValue(headers, row, ['고객명', '담당자']) || '-'}</span>
                    <span><strong className="text-[#555555]">{t(UI.quoteDate)}:</strong> {ledgerValue(headers, row, ['견적일자', '일']) || '-'}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end px-5 py-4 bg-[#f0ede8] border-t border-[#ddd9d2]">
              <button
                type="button"
                onClick={() => setSearchPickerRows(null)}
                className="px-4 py-2 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-white transition-colors"
              >
                {t(UI.quoteCancel)}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className="bg-white rounded-xl border border-[#ddd9d2] overflow-hidden">
          <table className="w-full table-fixed text-xs">
            <thead className="bg-[#f0ede8]">
              <tr>
                {headers.map((header, index) => (
                  <th key={`${header}-${index}`} className="text-left whitespace-normal break-words px-2 lg:px-3 py-3 font-semibold text-[#555555] text-xs">
                    <button
                      type="button"
                      onClick={() => handleSort(index)}
                      className="inline-flex w-full items-center gap-1 text-left hover:text-[#191919]"
                      title={sortIndex === index && sortDirection === 'desc' ? t(UI.quoteSortAsc) : t(UI.quoteSortDesc)}
                      aria-label={`${header} ${sortIndex === index && sortDirection === 'desc' ? t(UI.quoteSortAsc) : t(UI.quoteSortDesc)}`}
                    >
                      <span>{header}</span>
                      <span className="text-[#999999]" aria-hidden="true">
                        {sortIndex === index ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIndex) => (
                <tr key={`${row.values.join('|')}-${rowIndex}`} className="border-t border-[#f0ede8] hover:bg-[#fafaf9]">
                  {headers.map((_, cellIndex) => {
                    const value = row.values[cellIndex] ?? '';
                    const link = row.links[cellIndex];
                    const href = link ?? (/^https?:\/\//i.test(value) ? value : null);
                    const displayValue = href ? fileNameFromLink(href) : value;
                    return (
                      <td key={cellIndex} className="px-2 lg:px-3 py-3 whitespace-normal break-words text-[#555555]">
                        {href ? (
                          <a href={href} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline break-all" title={displayValue}>
                            {displayValue || '열기'}
                          </a>
                        ) : value}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!loading && !error && visibleRows.length === 0 && rows.length > 0 && (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-[#999999]">
                    {t(UI.quoteSearchNoResults)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
