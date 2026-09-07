import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { useT } from '../context/LangContext';
import { UI } from '../i18n/ui';
import {
  fetchLedger,
  createOrderDraft,
  type OrderDraftFile,
  type LedgerRow,
} from '../utils/appsScriptBridge';
import AiSearchPanel from './AiSearchPanel';

const FOLDER_BROWSER_URL = 'http://172.35.12.36:8790/';

interface OrderEmailFile {
  name: string;
  size: number;
  url: string;
}

function mimeForFile(name: string) {
  const ext = String(name).split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    hwp: 'application/x-hwp',
    hwpx: 'application/x-hwp',
    zip: 'application/zip',
  };
  return map[ext] ?? 'application/octet-stream';
}

async function fetchFileBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`파일 다운로드 실패 (HTTP ${res.status})`);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

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

function quoteRowKey(headers: string[], row: LedgerRow) {
  return ledgerValue(headers, row, ['견적번호']).trim() || row.values.join('|');
}

function isOrderMarked(value: string) {
  return ['발주', '완료', '예', 'Y', 'O', 'TRUE'].includes(value.trim().toUpperCase());
}

function formatAmountValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const numeric = Number(trimmed.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(numeric)) return value;
  return `${numeric.toLocaleString('ko-KR')} 원`;
}

function columnWidth(header: string) {
  if (header.includes('NO')) return 48;
  if (header.includes('연도') || header.includes('년도')) return 56;
  if (header === '월' || header === '일') return 42;
  if (header.includes('발주')) return 78;
  if (header.includes('견적번호')) return 128;
  if (header.includes('업체명') || header.includes('회사명')) return 100;
  if (header.includes('고객명') || header.includes('담당자')) return 92;
  if (header.includes('연락처')) return 104;
  if (header.includes('이메일')) return 148;
  if (header.includes('제품 항목') || header.includes('제품군')) return 106;
  if (header.includes('제품명')) return 160;
  if (header.includes('견적 금액') || header.includes('금액')) return 112;
  if (header.includes('비고')) return 130;
  if (header.includes('파일링크')) return 220;
  return 110;
}

const ACTION_COLUMN_WIDTH = 144;

function uploadUrl(
  year: number,
  department: string,
  quoteNumber: string,
  company: string,
  authorEmail?: string,
  authorName?: string,
) {
  const params = new URLSearchParams({
    year: String(year),
    department,
    quoteNumber,
    company,
  });
  if (authorEmail) params.set('authorEmail', authorEmail);
  if (authorName) params.set('authorName', authorName);
  return `${FOLDER_BROWSER_URL}upload?${params.toString()}`;
}

function sendActivityLog(account: string, eventType: string, detail: string) {
  try {
    void fetch(`${FOLDER_BROWSER_URL}api/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, eventType, detail }),
    }).catch(() => { /* 로깅 실패가 주요 기능 동작을 방해하지 않음 */ });
  } catch {
    // noop
  }
}

interface Props {
  onBack: () => void;
  onNewQuote: () => void;
  onEditQuote: (year: number, quoteNumber: string, department?: string) => void;
  onOrderChange: (year: number, quoteNumber: string, ordered: boolean, department?: string) => Promise<void>;
  department: string;
  isAdmin?: boolean;
  availableDepartments?: string[];
  authorEmail?: string;
  authorName?: string;
}

export default function QuoteListPage({
  onBack,
  onNewQuote,
  onEditQuote,
  onOrderChange,
  department,
  isAdmin,
  availableDepartments,
  authorEmail,
  authorName,
}: Props) {
  const t = useT();
  const currentYear = new Date().getFullYear();
  const deptList = availableDepartments?.length ? availableDepartments : ['기술영업', '영업', '프로젝트'];
  const [currentDepartment, setCurrentDepartment] = useState(department || '기술영업');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [ledgerYears, setLedgerYears] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortIndex, setSortIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchPickerRows, setSearchPickerRows] = useState<LedgerRow[] | null>(null);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<Record<string, boolean>>({});
  const [orderUpdatingKey, setOrderUpdatingKey] = useState<string | null>(null);

  // ── 발주등록 요청 메일 작성 모달 상태 ──
  const [orderEmailOpen, setOrderEmailOpen] = useState(false);
  const [orderEmailRow, setOrderEmailRow] = useState<LedgerRow | null>(null);
  const [orderEmailFiles, setOrderEmailFiles] = useState<OrderEmailFile[]>([]);
  const [orderEmailSelected, setOrderEmailSelected] = useState<Set<string>>(new Set());
  const [orderEmailAddress, setOrderEmailAddress] = useState('');
  const [orderEmailError, setOrderEmailError] = useState('');
  const [orderEmailLoading, setOrderEmailLoading] = useState(false);
  const [orderEmailFetching, setOrderEmailFetching] = useState(false);

  useEffect(() => {
    if (department && !isAdmin) {
      setCurrentDepartment(department);
    }
  }, [department, isAdmin]);

  const loadQuotes = useCallback(async (targetYear = selectedYear, targetDept = currentDepartment) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLedger(targetYear, targetDept);
      if (!result.success) throw new Error(result.message || '견적관리대장을 불러오지 못했습니다.');
      const availableYears = (result.availableYears ?? [targetYear])
        .filter((year) => Number.isInteger(year) && year >= 2000 && year <= currentYear)
        .sort((left, right) => right - left);
      setLedgerYears(availableYears);
      if (availableYears.length > 0 && !availableYears.includes(targetYear)) {
        setSelectedYear(availableYears[0]);
      }
      setHeaders(result.headers ?? []);
      setRows(result.rows ?? []);
    } catch (err) {
      setError(String(err));
      setHeaders([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [currentYear, selectedYear, currentDepartment]);

  useEffect(() => {
    void loadQuotes(selectedYear, currentDepartment);
  }, [loadQuotes, selectedYear, currentDepartment]);

  useEffect(() => {
    const nextStatus: Record<string, boolean> = {};
    rows.forEach((row) => {
      nextStatus[quoteRowKey(headers, row)] = isOrderMarked(ledgerValue(headers, row, ['발주']));
    });
    setOrderStatus(nextStatus);
  }, [headers, rows]);

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

  function handleDepartmentChange(nextDept: string) {
    if (nextDept === currentDepartment) return;
    setCurrentDepartment(nextDept);
    setSearchPickerRows(null);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || !normalizedSearch) return;
    const matches = rows.filter((row) => !normalizedSearch || row.values.some((value) => value.toLocaleLowerCase('ko-KR').includes(normalizedSearch)));
    if (matches.length > 1) setSearchPickerRows(matches);
  }

  /** 발주 상태를 실제로 기록/해제하고 활동 로그를 남긴다 */
  async function applyOrderChange(row: LedgerRow, ordered: boolean) {
    const quoteNumber = ledgerValue(headers, row, ['견적번호']).trim();
    if (!quoteNumber) return;
    const key = quoteRowKey(headers, row);
    const previous = orderStatus[key] ?? false;
    setOrderStatus((current) => ({ ...current, [key]: ordered }));
    setOrderUpdatingKey(key);
    try {
      await onOrderChange(selectedYear, quoteNumber, ordered, currentDepartment);
      sendActivityLog(
        authorEmail || authorName || currentDepartment,
        '발주',
        `견적번호: ${quoteNumber} | 상태: ${ordered ? '발주 완료(체크)' : '발주 취소(체크 해제)'} | 부서: ${currentDepartment}`,
      );
    } catch (err) {
      setOrderStatus((current) => ({ ...current, [key]: previous }));
      alert(`${t(UI.quoteOrderUpdateFailed)}: ${String(err)}`);
    } finally {
      setOrderUpdatingKey(null);
    }
  }

  /** 발주 체크박스 토글: 미발주 → 메일 작성 확인/모달, 발주됨 → 해제 확인 */
  function handleOrderToggle(row: LedgerRow, checked: boolean) {
    if (!checked) {
      if (!window.confirm(t(UI.quoteOrderReleaseAsk))) return;
      void applyOrderChange(row, false);
      return;
    }
    if (!window.confirm(t(UI.quoteOrderEmailAsk))) return;
    setOrderEmailRow(row);
    setOrderEmailAddress('');
    setOrderEmailSelected(new Set());
    setOrderEmailFiles([]);
    setOrderEmailError('');
    setOrderEmailOpen(true);
    void loadOrderEmailFiles(row);
  }

  /** 견적 폴더에서 발주 메일 첨부용 파일 목록을 가져온다 */
  async function loadOrderEmailFiles(row: LedgerRow) {
    const quoteNumber = ledgerValue(headers, row, ['견적번호']).trim();
    const company = ledgerValue(headers, row, ['업체명', '회사명']).trim();
    if (!quoteNumber || !company) return;
    setOrderEmailFetching(true);
    setOrderEmailError('');
    try {
      const params = new URLSearchParams({
        year: String(selectedYear),
        department: currentDepartment,
        quoteNumber,
        company,
      });
      const res = await fetch(`${FOLDER_BROWSER_URL}api/files?${params.toString()}`);
      let data: { success: boolean; files?: OrderEmailFile[]; message?: string } = { success: false };
      try { data = (await res.json()) as typeof data; } catch { /* noop */ }
      if (!res.ok || !data.success) {
        throw new Error(data.message || '파일 목록 조회 실패');
      }
      setOrderEmailFiles(data.files ?? []);
    } catch (err) {
      setOrderEmailFiles([]);
      setOrderEmailError(`${t(UI.quoteOrderFileLoadFailed)}: ${String(err)}`);
    } finally {
      setOrderEmailFetching(false);
    }
  }

  function toggleOrderEmailFile(name: string) {
    const next = new Set(orderEmailSelected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setOrderEmailSelected(next);
  }

  /** 모달에서 임시보관함 작성 → 발주 메일 초안 생성 + 발주 체크 반영 */
  async function handleOrderDraftSubmit() {
    if (orderEmailLoading) return;
    const address = orderEmailAddress.trim();
    if (!address) {
      alert(t(UI.quoteOrderAddressRequired));
      return;
    }
    if (orderEmailSelected.size === 0) {
      alert(t(UI.quoteOrderFileRequired));
      return;
    }
    const row = orderEmailRow;
    if (!row) return;
    setOrderEmailLoading(true);
    setOrderEmailError('');
    try {
      const quoteNumber = ledgerValue(headers, row, ['견적번호']).trim();
      const clientName = ledgerValue(headers, row, ['업체명', '회사명']).trim();
      const productName = ledgerValue(headers, row, ['제품명']).trim();
      const contactName = ledgerValue(headers, row, ['고객명', '담당자']).trim();
      const contactPhone = ledgerValue(headers, row, ['연락처']).trim();

      const files: OrderDraftFile[] = [];
      for (const file of orderEmailFiles) {
        if (!orderEmailSelected.has(file.name)) continue;
        const base64 = await fetchFileBase64(file.url);
        files.push({ name: file.name, mimeType: mimeForFile(file.name), base64 });
      }

      const result = await createOrderDraft({
        year: selectedYear,
        department: currentDepartment,
        quoteNumber,
        clientName,
        productName,
        contactName,
        contactPhone,
        deliveryAddress: address,
        files,
      });
      if (!result.success) throw new Error(result.message || t(UI.quoteOrderCreateFailed));

      setOrderEmailOpen(false);
      await applyOrderChange(row, true);
      sendActivityLog(
        authorEmail || authorName || currentDepartment,
        '발주 메일',
        `견적번호: ${quoteNumber} | 업체명: ${clientName} | 주소: ${address} | 첨부 ${files.length}개 | 임시보관함 초안 생성`,
      );
      alert(result.message || '발주등록 요청 메일 초안이 생성되었습니다.');
      window.open('https://mail.google.com/mail/u/0/#drafts', '_blank', 'noopener,noreferrer');
    } catch (err) {
      setOrderEmailError(`${t(UI.quoteOrderCreateFailed)}: ${String(err)}`);
    } finally {
      setOrderEmailLoading(false);
    }
  }

  return (
    <div className="max-w-[1800px] mx-auto w-full px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-wrap items-center gap-3">
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
          {isAdmin ? (
            <div className="flex items-center gap-2 rounded-full bg-blue-50 pl-3 pr-2 py-1 border border-blue-200 shadow-sm">
              <span className="text-sm font-bold text-blue-700">
                {t(UI.quoteDepartment)}:
              </span>
              <select
                value={currentDepartment}
                onChange={(event) => handleDepartmentChange(event.target.value)}
                className="bg-transparent text-sm font-bold text-blue-700 focus:outline-none cursor-pointer pr-1"
                aria-label={t(UI.quoteDepartment)}
              >
                {deptList.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                Admin
              </span>
            </div>
          ) : (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-lg font-bold text-blue-700">
              {t(UI.quoteDepartment)}: {currentDepartment || '-'}
            </span>
          )}
          {ledgerYears.length > 0 && (
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
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setAiSearchOpen((open) => !open)}
            aria-expanded={aiSearchOpen}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            {t(UI.quoteAiSearchBtn)}
          </button>
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

      <AiSearchPanel open={aiSearchOpen} year={selectedYear} department={currentDepartment} headers={headers} rows={rows} />

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

      {orderEmailOpen && orderEmailRow && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-start justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-blue-600 text-white">
              <div>
                <h2 className="text-sm font-bold">{t(UI.quoteOrderEmailTitle)}</h2>
                <p className="text-xs text-blue-100 mt-1">
                  {ledgerValue(headers, orderEmailRow, ['견적번호']) || '-'} · {ledgerValue(headers, orderEmailRow, ['업체명', '회사명']) || '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderEmailOpen(false)}
                className="text-blue-100 hover:text-white text-xl leading-none"
                aria-label={t(UI.close)}
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 고객 정보 요약 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span><strong className="text-[#555555]">{t(UI.quoteCompany)}:</strong> {ledgerValue(headers, orderEmailRow, ['업체명', '회사명']) || '-'}</span>
                <span><strong className="text-[#555555]">{t(UI.quoteProductName)}:</strong> {ledgerValue(headers, orderEmailRow, ['제품명']) || '-'}</span>
                <span><strong className="text-[#555555]">{t(UI.quoteContact)}:</strong> {ledgerValue(headers, orderEmailRow, ['고객명', '담당자']) || '-'}</span>
                <span><strong className="text-[#555555]">{t(UI.quoteOrderAddress)}:</strong> {orderEmailAddress || '-'}</span>
              </div>

              {/* 주소 입력 (필수) */}
              <label className="block">
                <span className="block text-xs font-medium text-[#555555] mb-1">
                  {t(UI.quoteOrderAddress)} <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={orderEmailAddress}
                  onChange={(event) => setOrderEmailAddress(event.target.value)}
                  placeholder={t(UI.quoteOrderAddressPlaceholder)}
                  className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]"
                />
              </label>

              {/* 첨부 파일 선택 */}
              <div>
                <span className="block text-xs font-medium text-[#555555] mb-1">
                  {t(UI.quoteOrderAttachFiles)} <span className="text-red-500">*</span>
                </span>
                <p className="text-[11px] text-[#999999] mb-2">{t(UI.quoteOrderAttachHint)}</p>
                {orderEmailFetching ? (
                  <p className="text-xs text-[#999999]">{t(UI.quoteListLoading)}</p>
                ) : orderEmailFiles.length === 0 ? (
                  <p className="text-xs text-[#999999]">{orderEmailError || t(UI.quoteOrderNoFiles)}</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto border border-[#ddd9d2] rounded-lg">
                    {orderEmailFiles.map((file) => (
                      <label key={file.name} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#f0ede8]">
                        <input
                          type="checkbox"
                          checked={orderEmailSelected.has(file.name)}
                          onChange={() => toggleOrderEmailFile(file.name)}
                        />
                        <span className="truncate flex-1 text-[#333333]">{file.name}</span>
                        <span className="text-[11px] text-[#999999]">
                          {file.size > 0 ? `${Math.max(1, Math.round(file.size / 1024)).toLocaleString('ko-KR')} KB` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {orderEmailError && orderEmailFiles.length > 0 && (
                <p className="text-red-500 text-xs">{orderEmailError}</p>
              )}
            </div>

            <div className="flex justify-end px-5 py-4 bg-[#f0ede8] border-t border-[#ddd9d2] gap-2">
              <button
                type="button"
                onClick={() => setOrderEmailOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-white transition-colors"
              >
                {t(UI.quoteOrderModalCancel)}
              </button>
              <button
                type="button"
                disabled={orderEmailLoading || orderEmailFetching}
                onClick={() => void handleOrderDraftSubmit()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {orderEmailLoading ? t(UI.quoteOrderCreating) : t(UI.quoteOrderCreateDraft)}
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
          <div className="overflow-x-auto">
          <table className="table-fixed text-xs" style={{ width: `${headers.reduce((sum, header) => sum + columnWidth(header), 0) + ACTION_COLUMN_WIDTH}px` }}>
            <colgroup>
              {headers.map((header, index) => (
                <col key={`${header}-${index}`} style={{ width: `${columnWidth(header)}px` }} />
              ))}
              <col style={{ width: `${ACTION_COLUMN_WIDTH}px` }} />
            </colgroup>
            <thead className="bg-[#f0ede8]">
              <tr>
                  {headers.map((header, index) => (
                  <th key={`${header}-${index}`} className={`${header.includes('금액') ? 'text-right' : 'text-left'} px-2 lg:px-3 py-3 font-semibold text-[#555555] text-xs ${header.includes('연도') || header.includes('년도') ? 'whitespace-nowrap' : 'whitespace-normal break-words'}`}>
                    <button
                      type="button"
                      onClick={() => handleSort(index)}
                      className={`inline-flex w-full items-center gap-1 hover:text-[#191919] ${header.includes('금액') ? 'justify-end text-right' : 'text-left'}`}
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
                <th className="text-left whitespace-normal break-words px-2 lg:px-3 py-3 font-semibold text-[#555555] text-xs">
                  {t(UI.quoteAction)}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIndex) => {
                const quoteNumber = ledgerValue(headers, row, ['견적번호']).trim();
                const company = ledgerValue(headers, row, ['업체명', '회사명']).trim();
                const rowKey = quoteRowKey(headers, row);
                return (
                  <tr key={`${row.values.join('|')}-${rowIndex}`} className="border-t border-[#f0ede8] hover:bg-[#fafaf9]">
                    {headers.map((header, cellIndex) => {
                      const value = row.values[cellIndex] ?? '';
                      const link = row.links[cellIndex];
                      const href = link ?? (/^https?:\/\//i.test(value) ? value : null);
                      const displayValue = href ? fileNameFromLink(href) : value;
                      const isOrderColumn = header.includes('발주');
                      const isYearColumn = header.includes('연도') || header.includes('년도');
                      const isAmountColumn = header.includes('금액');
                      const checked = orderStatus[rowKey] ?? isOrderMarked(value);
                      return (
                        <td key={cellIndex} className={`${isAmountColumn ? 'text-right' : 'text-left'} px-2 lg:px-3 py-3 text-[#555555] ${isYearColumn ? 'whitespace-nowrap' : 'whitespace-normal break-words'}`}>
                          {isOrderColumn ? (
                            <label className="inline-flex items-center gap-1.5 font-medium text-[#555555]">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!quoteNumber || orderUpdatingKey === rowKey}
                                onChange={(event) => handleOrderToggle(row, event.target.checked)}
                              />
                              <span>{checked ? t(UI.quoteOrderMarked) : t(UI.quoteOrder)}</span>
                            </label>
                          ) : href ? (
                            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline break-all" title={displayValue}>
                              {displayValue || '열기'}
                            </a>
                          ) : isAmountColumn ? formatAmountValue(value) : value}
                        </td>
                      );
                    })}
                    <td className="px-2 lg:px-3 py-3 whitespace-normal break-words">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={!quoteNumber}
                          onClick={() => onEditQuote(selectedYear, quoteNumber, currentDepartment)}
                          className="w-14 rounded border border-blue-200 px-1 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 text-center"
                        >
                          {t(UI.quoteEditBtn)}
                        </button>
                        <a
                          href={quoteNumber && company ? uploadUrl(selectedYear, currentDepartment, quoteNumber, company, authorEmail, authorName) : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => { if (!quoteNumber || !company) event.preventDefault(); }}
                          className="w-14 rounded border border-green-200 px-1 py-1 text-[11px] font-medium text-green-700 hover:bg-green-50 aria-disabled:pointer-events-none aria-disabled:opacity-40 text-center"
                          aria-disabled={!quoteNumber || !company}
                        >
                          {t(UI.quoteUploadBtn)}
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !error && visibleRows.length === 0 && rows.length > 0 && (
                <tr>
                  <td colSpan={headers.length + 1} className="px-4 py-8 text-center text-sm text-[#999999]">
                    {t(UI.quoteSearchNoResults)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
