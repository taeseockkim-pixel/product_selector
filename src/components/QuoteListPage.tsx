import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useT } from '../context/LangContext';
import { UI } from '../i18n/ui';
import {
  fetchLedger,
  createOrderDraft,
  fetchQuoteFiles,
  deleteQuote,
  restoreQuote,
  updateQuoteSite,
  type OrderDraftRequest,
  type LedgerRow,
} from '../utils/appsScriptBridge';
import AiSearchPanel from './AiSearchPanel';

const FOLDER_BROWSER_URL = 'http://172.35.12.36:8790/';
const FOLDER_BROWSER_ORIGIN = new URL(FOLDER_BROWSER_URL).origin;
const COLUMN_CONFIG_STORAGE_KEY = 'cimon-quote-column-config';

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
  if (header.includes('제품명')) return 180;
  if (header.includes('적용현장') || header.includes('현장')) return 140;
  if (header.includes('견적 금액') || header.includes('금액')) return 104;
  if (header.includes('비고')) return 130;
  if (header.includes('파일링크')) return 220;
  return 110;
}

const ACTION_COLUMN_KEY = '__action__';
const ACTION_COLUMN_WIDTH = 200;

function uploadUrl(
  year: number,
  department: string,
  quoteNumber: string,
  company: string,
  authorEmail?: string,
  authorName?: string,
  folderName?: string,
) {
  const params = new URLSearchParams({
    year: String(year),
    department,
    quoteNumber,
    company,
  });
  if (authorEmail) params.set('authorEmail', authorEmail);
  if (authorName) params.set('authorName', authorName);
  // 대장 파일링크에서 추출한 실제 폴더명이 있으면 함께 전달해 폴더 탐색 실패를 방지한다.
  if (folderName) params.set('folder', folderName);
  return `${FOLDER_BROWSER_URL}upload?${params.toString()}`;
}

/** 대장 파일링크 URL에서 실제 견적 폴더명을 추출한다 (예: /files/기술영업/2026/기술영업 2609-001_싸이몬/...pdf → 기술영업 2609-001_싸이몬) */
function folderNameFromLink(value: string): string {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    const folder = parts.length >= 2 ? parts[parts.length - 2] : '';
    return folder ? decodeURIComponent(folder) : '';
  } catch {
    return '';
  }
}

function orderEmailUrl(
  year: number,
  department: string,
  quoteNumber: string,
  company: string,
  productName: string,
  contactName: string,
  contactPhone: string,
  authorEmail?: string,
  authorName?: string,
  folderName?: string,
) {
  const params = new URLSearchParams({
    year: String(year),
    department,
    quoteNumber,
    company,
    productName,
    contactName,
    contactPhone,
  });
  if (authorEmail) params.set('authorEmail', authorEmail);
  if (authorName) params.set('authorName', authorName);
  if (folderName) params.set('folder', folderName);
  return `${FOLDER_BROWSER_URL}order-email?${params.toString()}`;
}

interface Props {
  onBack: () => void;
  onNewQuote: () => void;
  onDashboard?: () => void;
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
  onDashboard,
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchPickerRows, setSearchPickerRows] = useState<LedgerRow[] | null>(null);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<Record<string, boolean>>({});
  const [orderUpdatingKey, setOrderUpdatingKey] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // ── 대장 항목(열) 표시/숨김 및 순서 설정 상태 ──
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(COLUMN_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.order)) return parsed.order;
      }
    } catch { /* noop */ }
    return [];
  });
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(COLUMN_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.hidden)) return new Set(parsed.hidden);
      }
    } catch { /* noop */ }
    return new Set();
  });

  // ── 발주 처리 방식 선택 모달 상태 ──
  const [orderActionRow, setOrderActionRow] = useState<LedgerRow | null>(null);

  // ── 견적 삭제 다이얼로그 상태 ──
  const [deleteDialogRow, setDeleteDialogRow] = useState<LedgerRow | null>(null);
  const [deleteMode, setDeleteMode] = useState<'permanent' | 'strikethrough'>('strikethrough');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [restoreLoadingKey, setRestoreLoadingKey] = useState<string | null>(null);

  // ── 적용 현장 수정 모달 상태 ──
  const [siteModalRow, setSiteModalRow] = useState<LedgerRow | null>(null);
  const [siteInputValue, setSiteInputValue] = useState('');
  const [siteSaving, setSiteSaving] = useState(false);

  // ── 발주등록 요청 메일 작성 모달 상태 ──
  const [orderEmailOpen, setOrderEmailOpen] = useState(false);
  const [orderEmailRow] = useState<LedgerRow | null>(null);
  const [orderEmailFiles, setOrderEmailFiles] = useState<Array<{ name: string; size: number }>>([]);
  const [orderEmailSelected, setOrderEmailSelected] = useState<Set<string>>(new Set());
  const [orderEmailAddress, setOrderEmailAddress] = useState('');
  const [orderEmailError, setOrderEmailError] = useState('');
  const [orderEmailLoading, setOrderEmailLoading] = useState(false);
  const [orderEmailFetching, setOrderEmailFetching] = useState(false);
  const orderEmailProcessingRef = useRef(false);

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

  // 로컬 에이전트의 /order-email 페이지가 선택 파일을 postMessage로 반환하면,
  // 현재 로그인 사용자의 Apps Script 세션에서 Gmail 초안을 만들고 발주 상태를 기록한다.
  useEffect(() => {
    function handleAgentOrderEmail(event: MessageEvent) {
      if (event.origin !== FOLDER_BROWSER_ORIGIN) return;
      if (event.data?.source !== 'cimon-order-email-agent' || event.data.type !== 'ORDER_EMAIL_SUBMIT') return;
      if (orderEmailProcessingRef.current) return;
      orderEmailProcessingRef.current = true;
      const payload = event.data.payload as OrderDraftRequest;
      void (async () => {
        let message = '';
        let success = false;
        try {
          const result = await createOrderDraft(payload);
          if (!result.success) throw new Error(result.message || t(UI.quoteOrderCreateFailed));
          await onOrderChange(payload.year, payload.quoteNumber, true, payload.department);
          success = true;
          message = result.message || '발주등록 요청 메일 초안이 생성되었습니다.';
          await loadQuotes(payload.year, payload.department);
          alert(message);
          window.open('https://mail.google.com/mail/u/0/#drafts', '_blank', 'noopener,noreferrer');
        } catch (err) {
          message = `${t(UI.quoteOrderCreateFailed)}: ${String(err)}`;
          alert(message);
        } finally {
          const source = event.source;
          if (source) {
            (source as Window).postMessage({
              source: 'cimon-quote-app',
              type: 'ORDER_EMAIL_RESULT',
              success,
              message,
            }, event.origin);
          }
          orderEmailProcessingRef.current = false;
        }
      })();
    }
    window.addEventListener('message', handleAgentOrderEmail);
    return () => window.removeEventListener('message', handleAgentOrderEmail);
  }, [loadQuotes, onOrderChange, t]);

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('ko-KR');
  const searchedRows = rows.filter((row) => {
    if (!normalizedSearch) return true;
    const matchValue = row.values.some((value) => value.toLocaleLowerCase('ko-KR').includes(normalizedSearch));
    const matchAuthor = Boolean(row.authorName && row.authorName.toLocaleLowerCase('ko-KR').includes(normalizedSearch));
    return matchValue || matchAuthor;
  });

  const quoteColIndex = headers.findIndex((h) => h.includes('견적번호'));
  const activeSortIndex = sortIndex !== null ? sortIndex : (quoteColIndex >= 0 ? quoteColIndex : null);
  const activeSortDirection = sortIndex !== null ? sortDirection : 'desc';

  const sortedRows = [...searchedRows]
    .sort((left, right) => {
      if (activeSortIndex === null) return 0;
      const compared = compareCellValues(left.values[activeSortIndex] ?? '', right.values[activeSortIndex] ?? '');
      return activeSortDirection === 'asc' ? compared : -compared;
    })
    .filter((row) => !searchPickerRows || searchPickerRows.includes(row));

  // 페이징 계산: 440건 이상일 때도 50건씩 렌더링하여 DOM 폭발 및 렌더링 랙 완전 제거
  const totalItems = sortedRows.length;
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleRows = pageSize === 0
    ? sortedRows
    : sortedRows.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  // ── 대장 항목 순서 및 표시 헤더 도출 (액션 열 포함) ──
  const allOrderedHeaders = useMemo(() => {
    if (headers.length === 0) return [];
    const baseList = [...headers, ACTION_COLUMN_KEY];
    const ordered: string[] = [];
    columnOrder.forEach((h) => {
      if (baseList.includes(h)) ordered.push(h);
    });
    baseList.forEach((h) => {
      if (!ordered.includes(h)) ordered.push(h);
    });
    return ordered;
  }, [headers, columnOrder]);

  const activeHeaders = useMemo(() => {
    return allOrderedHeaders.filter((h) => !hiddenColumns.has(h));
  }, [allOrderedHeaders, hiddenColumns]);

  function saveColumnConfig(newOrder: string[], newHidden: Set<string>) {
    setColumnOrder(newOrder);
    setHiddenColumns(newHidden);
    try {
      localStorage.setItem(COLUMN_CONFIG_STORAGE_KEY, JSON.stringify({
        order: newOrder,
        hidden: [...newHidden],
      }));
    } catch { /* noop */ }
  }

  function toggleColumnVisibility(colName: string) {
    const nextHidden = new Set(hiddenColumns);
    if (nextHidden.has(colName)) {
      nextHidden.delete(colName);
    } else {
      if (allOrderedHeaders.length - nextHidden.size <= 1) {
        alert('최소 1개 이상의 항목은 표시되어야 합니다.');
        return;
      }
      nextHidden.add(colName);
    }
    saveColumnConfig(allOrderedHeaders, nextHidden);
  }

  function moveColumn(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= allOrderedHeaders.length) return;
    const nextOrder = [...allOrderedHeaders];
    const [moved] = nextOrder.splice(index, 1);
    nextOrder.splice(targetIndex, 0, moved);
    saveColumnConfig(nextOrder, hiddenColumns);
  }

  function resetColumnConfig() {
    setColumnOrder([...headers, ACTION_COLUMN_KEY]);
    setHiddenColumns(new Set());
    try {
      localStorage.removeItem(COLUMN_CONFIG_STORAGE_KEY);
    } catch { /* noop */ }
  }

  function handleSort(index: number) {
    const currentActiveIndex = sortIndex !== null ? sortIndex : quoteColIndex;
    const currentActiveDir = sortIndex !== null ? sortDirection : 'desc';
    if (currentActiveIndex === index) {
      setSortIndex(index);
      setSortDirection(currentActiveDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortIndex(index);
      setSortDirection('asc');
    }
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    setSearchPickerRows(null);
    setCurrentPage(1);
  }

  function handleYearChange(year: number) {
    setSelectedYear(year);
    setSearchPickerRows(null);
    setCurrentPage(1);
  }

  function handleDepartmentChange(nextDept: string) {
    if (nextDept === currentDepartment) return;
    setCurrentDepartment(nextDept);
    setSearchPickerRows(null);
    setCurrentPage(1);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || !normalizedSearch) return;
    const matches = rows.filter((row) => {
      const matchVal = row.values.some((v) => v.toLocaleLowerCase('ko-KR').includes(normalizedSearch));
      const matchAuthor = Boolean(row.authorName && row.authorName.toLocaleLowerCase('ko-KR').includes(normalizedSearch));
      return matchVal || matchAuthor;
    });
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
    } catch (err) {
      setOrderStatus((current) => ({ ...current, [key]: previous }));
      alert(`${t(UI.quoteOrderUpdateFailed)}: ${String(err)}`);
    } finally {
      setOrderUpdatingKey(null);
    }
  }

  /** 발주 체크박스 토글: 미발주 → 처리 방식 선택 모달(메일 작성 vs 메일 없이 등록), 발주됨 → 해제 확인 */
  function handleOrderToggle(row: LedgerRow, checked: boolean) {
    if (!checked) {
      if (!window.confirm(t(UI.quoteOrderReleaseAsk))) return;
      void applyOrderChange(row, false);
      return;
    }
    setOrderActionRow(row);
  }

  /** 발주등록 요청 메일 작성 창 열기 */
  function handleOrderWithEmail(row: LedgerRow) {
    setOrderActionRow(null);
    const quoteNumber = ledgerValue(headers, row, ['견적번호']).trim();
    const company = ledgerValue(headers, row, ['업체명', '회사명']).trim();
    const productName = ledgerValue(headers, row, ['제품명']).trim();
    const contactName = ledgerValue(headers, row, ['고객명', '담당자']).trim();
    const contactPhone = ledgerValue(headers, row, ['연락처']).trim();
    const linkIndex = headers.findIndex((header) => header.includes('파일링크'));
    const folderName = linkIndex >= 0 ? folderNameFromLink(row.links[linkIndex] ?? '') : '';
    const url = orderEmailUrl(
      selectedYear,
      currentDepartment,
      quoteNumber,
      company,
      productName,
      contactName,
      contactPhone,
      authorEmail,
      authorName,
      folderName,
    );
    // opener가 있어야 에이전트 페이지가 선택 파일을 postMessage로 반환할 수 있다.
    const popup = window.open(url, '_blank');
    if (!popup) alert('발주등록 메일 작성 창을 열 수 없습니다. 브라우저의 팝업 차단을 해제해 주세요.');
  }

  /** 메일 발송 없이 대장에 발주 완료만 즉시 등록 */
  function handleOrderDirect(row: LedgerRow) {
    setOrderActionRow(null);
    void applyOrderChange(row, true);
  }

  /** 견적 삭제 실행 (영구삭제 또는 라인삭제) */
  async function handleDeleteQuote(mode: 'permanent' | 'strikethrough') {
    const row = deleteDialogRow;
    if (!row) return;
    const quoteNumber = ledgerValue(headers, row, ['견적번호']).trim();
    if (!quoteNumber) return;
    setDeleteLoading(true);
    try {
      const result = await deleteQuote({ year: selectedYear, department: currentDepartment, quoteNumber, mode });
      if (!result.success) throw new Error(result.message || t(UI.quoteDeleteFailed));
      setDeleteDialogRow(null);
      await loadQuotes(selectedYear, currentDepartment);
      alert(result.message || '삭제되었습니다.');
    } catch (err) {
      alert(`${t(UI.quoteDeleteFailed)}: ${String(err)}`);
    } finally {
      setDeleteLoading(false);
    }
  }

  /** 모달의 확인 버튼 클릭 시 "삭제하시겠습니까?" 팝업을 띄우고 재확인 후 실행 */
  function onConfirmDeleteClick() {
    const row = deleteDialogRow;
    if (!row) return;
    const quoteNumber = ledgerValue(headers, row, ['견적번호']).trim();
    const company = ledgerValue(headers, row, ['업체명', '회사명']).trim();
    const modeLabel = deleteMode === 'permanent' ? t(UI.quoteDeletePermanent) : t(UI.quoteDeleteLine);
    const modeDetail = deleteMode === 'permanent'
      ? t(UI.quoteDeletePermanentHint)
      : t(UI.quoteDeleteLineHint);

    const askMessage = `[${quoteNumber} - ${company}]\n\n삭제 방식: ${modeLabel}\n(${modeDetail})\n\n${t(UI.quoteDeleteAskPopup)}`;
    if (!window.confirm(askMessage)) {
      return;
    }
    void handleDeleteQuote(deleteMode);
  }

  /** 라인삭제(취소선) 해제 */
  async function handleRestoreQuote(row: LedgerRow) {
    const quoteNumber = ledgerValue(headers, row, ['견적번호']).trim();
    if (!quoteNumber) return;
    const key = quoteRowKey(headers, row);
    setRestoreLoadingKey(key);
    try {
      const result = await restoreQuote({ year: selectedYear, department: currentDepartment, quoteNumber });
      if (!result.success) throw new Error(result.message || t(UI.quoteRestoreFailed));
      await loadQuotes(selectedYear, currentDepartment);
    } catch (err) {
      alert(`${t(UI.quoteRestoreFailed)}: ${String(err)}`);
    } finally {
      setRestoreLoadingKey(null);
    }
  }

  /** 적용 현장 수정 모달 열기 */
  function openSiteModal(row: LedgerRow, currentValue: string) {
    setSiteModalRow(row);
    setSiteInputValue(currentValue);
  }

  /** 적용 현장 저장 실행 (확인 클릭 시 대장에 기록) */
  async function handleSaveSite() {
    const row = siteModalRow;
    if (!row) return;
    const quoteNumber = ledgerValue(headers, row, ['견적번호']).trim();
    if (!quoteNumber) return;

    if (!window.confirm(t(UI.quoteSiteConfirmAsk))) {
      return;
    }

    setSiteSaving(true);
    try {
      const siteText = siteInputValue.trim();
      const result = await updateQuoteSite({
        year: selectedYear,
        department: currentDepartment,
        quoteNumber,
        siteName: siteText,
      });
      if (!result.success) throw new Error(result.message || t(UI.quoteSiteSaveFailed));

      // 화면에 즉시 반영
      const siteColIndex = headers.findIndex((h) => /적용\s*현장|현장명|^현장$/.test(h.trim()));
      if (siteColIndex >= 0) {
        row.values[siteColIndex] = siteText;
        setRows([...rows]);
      } else {
        await loadQuotes(selectedYear, currentDepartment);
      }
      setSiteModalRow(null);
    } catch (err) {
      alert(`${t(UI.quoteSiteSaveFailed)}: ${String(err)}`);
    } finally {
      setSiteSaving(false);
    }
  }

  /** 견적 폴더(구글 드라이브 미러 '문서')에서 발주 메일 첨부용 파일 목록을 가져온다 */
  async function loadOrderEmailFiles(row: LedgerRow) {
    const quoteNumber = ledgerValue(headers, row, ['견적번호']).trim();
    const company = ledgerValue(headers, row, ['업체명', '회사명']).trim();
    if (!quoteNumber || !company) return;
    setOrderEmailFetching(true);
    setOrderEmailError('');
    try {
      const result = await fetchQuoteFiles({
        year: selectedYear,
        department: currentDepartment,
        quoteNumber,
        company,
      });
      if (!result.success) throw new Error(result.message || '파일 목록 조회 실패');
      setOrderEmailFiles(result.files ?? []);
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

  /** 모달 안 "업로드" 버튼이 열 업로드 페이지 URL (해당 견적 폴더 기준) */
  function orderEmailUploadUrl(): string {
    if (!orderEmailRow) return '#';
    const quoteNumber = ledgerValue(headers, orderEmailRow, ['견적번호']).trim();
    const company = ledgerValue(headers, orderEmailRow, ['업체명', '회사명']).trim();
    if (!quoteNumber || !company) return '#';
    const linkIndex = headers.findIndex((header) => header.includes('파일링크'));
    const folderName = linkIndex >= 0 ? folderNameFromLink(orderEmailRow.links[linkIndex] ?? '') : '';
    return uploadUrl(selectedYear, currentDepartment, quoteNumber, company, authorEmail, authorName, folderName);
  }

  // 업로드 탭에서 작업 후 모달로 돌아오면 파일 목록을 자동으로 갱신한다.
  const loadOrderEmailFilesRef = useRef(loadOrderEmailFiles);
  loadOrderEmailFilesRef.current = loadOrderEmailFiles;
  useEffect(() => {
    if (!orderEmailOpen || !orderEmailRow) return;
    function onFocus() {
      if (loadOrderEmailFilesRef.current && orderEmailRow) {
        void loadOrderEmailFilesRef.current(orderEmailRow);
      }
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [orderEmailOpen, orderEmailRow]);

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

      const result = await createOrderDraft({
        year: selectedYear,
        department: currentDepartment,
        quoteNumber,
        clientName,
        productName,
        contactName,
        contactPhone,
        deliveryAddress: address,
        files: [],
      });
      if (!result.success) throw new Error(result.message || t(UI.quoteOrderCreateFailed));

      setOrderEmailOpen(false);
      await applyOrderChange(row, true);
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
          {onDashboard && (
            <button
              type="button"
              onClick={onDashboard}
              className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              {t(UI.quoteDashboard)}
            </button>
          )}
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
          <button
            type="button"
            onClick={() => setColumnSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#e6e2dc] transition-colors"
            title={t(UI.quoteColumnSettingsTitle)}
          >
            <svg className="w-4 h-4 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{t(UI.quoteColumnSettings)}</span>
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
                    <span><strong className="text-[#555555]">작성자:</strong> {row.authorName || '-'}</span>
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

      {/* 견적 삭제 방식 선택 다이얼로그 */}
      {deleteDialogRow && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-red-600 text-white">
              <h2 className="text-sm font-bold">{t(UI.quoteDeleteTitle)}</h2>
              <button
                type="button"
                onClick={() => setDeleteDialogRow(null)}
                className="text-red-100 hover:text-white text-xl leading-none"
                aria-label={t(UI.close)}
              >
                x
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3 text-xs">
                <span className="font-bold text-[#0f172a] text-sm block">
                  {ledgerValue(headers, deleteDialogRow, ['견적번호']) || '-'}
                </span>
                <span className="text-[#64748b] mt-0.5 block">
                  {ledgerValue(headers, deleteDialogRow, ['업체명', '회사명']) || '-'}
                </span>
              </div>

              <p className="text-xs font-semibold text-[#64748b] pt-1">
                {t(UI.quoteDeleteSelectHint)}
              </p>

              {/* 옵션 1: 라인삭제 (기본 권장) */}
              <button
                type="button"
                onClick={() => setDeleteMode('strikethrough')}
                className={`w-full rounded-xl border p-3.5 text-left transition-all flex items-start gap-3 ${
                  deleteMode === 'strikethrough'
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-300'
                    : 'border-[#e2e8f0] bg-white hover:bg-[#f8fafc]'
                }`}
              >
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  deleteMode === 'strikethrough' ? 'border-amber-600 bg-amber-600 text-white' : 'border-[#cbd5e1]'
                }`}>
                  {deleteMode === 'strikethrough' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <div>
                  <span className="block text-sm font-bold text-[#1e293b]">{t(UI.quoteDeleteLine)}</span>
                  <span className="block text-[11px] text-[#64748b] mt-0.5">{t(UI.quoteDeleteLineHint)}</span>
                </div>
              </button>

              {/* 옵션 2: 영구삭제 */}
              <button
                type="button"
                onClick={() => setDeleteMode('permanent')}
                className={`w-full rounded-xl border p-3.5 text-left transition-all flex items-start gap-3 ${
                  deleteMode === 'permanent'
                    ? 'border-red-500 bg-red-50/70 ring-2 ring-red-300'
                    : 'border-[#e2e8f0] bg-white hover:bg-[#f8fafc]'
                }`}
              >
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  deleteMode === 'permanent' ? 'border-red-600 bg-red-600 text-white' : 'border-[#cbd5e1]'
                }`}>
                  {deleteMode === 'permanent' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <div>
                  <span className="block text-sm font-bold text-red-700">{t(UI.quoteDeletePermanent)}</span>
                  <span className="block text-[11px] text-red-600 mt-0.5">{t(UI.quoteDeletePermanentHint)}</span>
                </div>
              </button>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-[#f8fafc] border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setDeleteDialogRow(null)}
                className="px-4 py-2 rounded-lg border border-[#cbd5e1] text-sm font-semibold text-[#475569] hover:bg-white transition-colors"
              >
                {t(UI.quoteDeleteCancel)}
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={onConfirmDeleteClick}
                className="px-5 py-2 rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {deleteLoading ? '...' : t(UI.quoteDeleteConfirmBtn)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 적용 현장 작성/수정 모달 */}
      {siteModalRow && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-blue-600 text-white">
              <h2 className="text-sm font-bold">{t(UI.quoteSiteModalTitle)}</h2>
              <button
                type="button"
                onClick={() => setSiteModalRow(null)}
                className="text-blue-100 hover:text-white text-xl leading-none"
                aria-label={t(UI.close)}
              >
                x
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void handleSaveSite(); }}>
              <div className="p-5 space-y-3.5">
                <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3 text-xs">
                  <span className="font-bold text-[#0f172a] text-sm block">
                    {ledgerValue(headers, siteModalRow, ['견적번호']) || '-'}
                  </span>
                  <span className="text-[#64748b] mt-0.5 block">
                    {ledgerValue(headers, siteModalRow, ['업체명', '회사명']) || '-'} · {ledgerValue(headers, siteModalRow, ['제품명']) || '-'}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    {t(UI.quoteSite)}
                  </label>
                  <input
                    type="text"
                    value={siteInputValue}
                    onChange={(e) => setSiteInputValue(e.target.value)}
                    placeholder={t(UI.quoteSiteInputPlaceholder)}
                    className="w-full rounded-lg border border-[#cbd5e1] px-3.5 py-2.5 text-xs text-[#1e293b] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <p className="mt-1.5 text-[11px] text-[#94a3b8]">
                    확인을 누르면 견적관리대장에 즉시 저장됩니다.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-4 bg-[#f8fafc] border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setSiteModalRow(null)}
                  className="px-4 py-2 rounded-lg border border-[#cbd5e1] text-sm font-semibold text-[#475569] hover:bg-white transition-colors"
                >
                  {t(UI.quoteDeleteCancel)}
                </button>
                <button
                  type="submit"
                  disabled={siteSaving}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {siteSaving ? '저장 중...' : t(UI.quoteDeleteConfirmBtn)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 발주 처리 방식 선택 모달 */}
      {orderActionRow && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-blue-600 text-white">
              <h2 className="text-sm font-bold">{t(UI.quoteOrderActionTitle)}</h2>
              <button
                type="button"
                onClick={() => setOrderActionRow(null)}
                className="text-blue-100 hover:text-white text-xl leading-none"
                aria-label={t(UI.close)}
              >
                x
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3 text-xs">
                <span className="font-bold text-[#0f172a] text-sm block">
                  {ledgerValue(headers, orderActionRow, ['견적번호']) || '-'}
                </span>
                <span className="text-[#64748b] mt-0.5 block">
                  {ledgerValue(headers, orderActionRow, ['업체명', '회사명']) || '-'} · {ledgerValue(headers, orderActionRow, ['제품명']) || '-'}
                </span>
              </div>

              <p className="text-xs text-[#64748b] pt-1">
                발주 처리 방식을 선택해 주세요.
              </p>

              {/* 옵션 1: 발주등록 요청 메일 작성 */}
              <button
                type="button"
                onClick={() => handleOrderWithEmail(orderActionRow)}
                className="w-full rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-left hover:bg-blue-100/80 transition-all flex items-start gap-3 group"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold">
                  ✉
                </span>
                <div>
                  <span className="block text-sm font-bold text-blue-900 group-hover:text-blue-950">
                    {t(UI.quoteOrderActionEmailBtn)}
                  </span>
                  <span className="block text-[11px] text-blue-700 mt-0.5">
                    {t(UI.quoteOrderActionEmailHint)}
                  </span>
                </div>
              </button>

              {/* 옵션 2: 메일 발송 없이 발주만 등록 */}
              <button
                type="button"
                onClick={() => handleOrderDirect(orderActionRow)}
                className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-left hover:bg-[#edf2f7] transition-all flex items-start gap-3 group"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold">
                  ✓
                </span>
                <div>
                  <span className="block text-sm font-bold text-[#1e293b] group-hover:text-emerald-800">
                    {t(UI.quoteOrderActionDirectBtn)}
                  </span>
                  <span className="block text-[11px] text-[#64748b] mt-0.5">
                    {t(UI.quoteOrderActionDirectHint)}
                  </span>
                </div>
              </button>
            </div>

            <div className="flex justify-end px-5 py-3.5 bg-[#f8fafc] border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setOrderActionRow(null)}
                className="px-4 py-2 rounded-lg border border-[#cbd5e1] text-sm font-semibold text-[#475569] hover:bg-white transition-colors"
              >
                {t(UI.quoteDeleteCancel)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 대장 항목(열) 표시 및 순서 설정 모달 */}
      {columnSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-blue-600 text-white shrink-0">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>⚙</span>
                <span>{t(UI.quoteColumnSettingsTitle)}</span>
              </h2>
              <button
                type="button"
                onClick={() => setColumnSettingsOpen(false)}
                className="text-blue-100 hover:text-white text-xl leading-none"
                aria-label={t(UI.close)}
              >
                x
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#64748b]">
                  {t(UI.quoteColumnSettingsDesc)}
                </p>
                <button
                  type="button"
                  onClick={() => saveColumnConfig(allOrderedHeaders, new Set())}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  {t(UI.quoteColumnShowAll)}
                </button>
              </div>

              <div className="space-y-1.5">
                {allOrderedHeaders.map((colName, index) => {
                  const isVisible = !hiddenColumns.has(colName);
                  return (
                    <div
                      key={colName}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-xs transition-colors ${
                        isVisible ? 'border-[#e2e8f0] bg-white' : 'border-[#f1f5f9] bg-[#f8fafc] opacity-60'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 font-semibold text-[#1e293b]">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => toggleColumnVisibility(colName)}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                        />
                        <span className={isVisible ? 'font-bold text-[#0f172a]' : 'text-[#94a3b8]'}>
                          {colName === ACTION_COLUMN_KEY ? `${t(UI.quoteAction)} (수정·업로드·삭제)` : colName}
                        </span>
                      </label>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveColumn(index, -1)}
                          className="px-2 py-1 rounded bg-[#f1f5f9] hover:bg-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-[#475569]"
                          title={t(UI.quoteColumnMoveUp)}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={index === allOrderedHeaders.length - 1}
                          onClick={() => moveColumn(index, 1)}
                          className="px-2 py-1 rounded bg-[#f1f5f9] hover:bg-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-[#475569]"
                          title={t(UI.quoteColumnMoveDown)}
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8fafc] border-t border-[#e2e8f0] shrink-0">
              <button
                type="button"
                onClick={resetColumnConfig}
                className="px-3 py-1.5 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#64748b] hover:bg-white transition-colors"
              >
                ↺ {t(UI.quoteColumnResetDefault)}
              </button>
              <button
                type="button"
                onClick={() => setColumnSettingsOpen(false)}
                className="px-5 py-1.5 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                {t(UI.close)}
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
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[#555555]">
                    {t(UI.quoteOrderAttachFiles)} <span className="text-red-500">*</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={orderEmailUploadUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded border border-green-200 text-[11px] font-medium text-green-700 hover:bg-green-50"
                    >
                      {t(UI.quoteUploadBtn)}
                    </a>
                    <button
                      type="button"
                      disabled={orderEmailFetching}
                      onClick={() => { if (orderEmailRow) void loadOrderEmailFiles(orderEmailRow); }}
                      className="px-2 py-1 rounded border border-[#ddd9d2] text-[11px] text-[#555555] hover:bg-[#e6e2dc] disabled:opacity-50"
                    >
                      {t(UI.quoteRefresh)}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#999999] mb-2">{t(UI.quoteOrderAttachHint)} {t(UI.quoteOrderUploadRefreshHint)}</p>
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
          <table className="table-fixed text-xs" style={{ width: `${activeHeaders.reduce((sum, h) => sum + (h === ACTION_COLUMN_KEY ? ACTION_COLUMN_WIDTH : columnWidth(h)), 0)}px` }}>
            <colgroup>
              {activeHeaders.map((header, index) => (
                <col
                  key={`${header}-${index}`}
                  style={{ width: `${header === ACTION_COLUMN_KEY ? ACTION_COLUMN_WIDTH : columnWidth(header)}px` }}
                />
              ))}
            </colgroup>
            <thead className="bg-[#f0ede8]">
              <tr>
                {activeHeaders.map((header, index) => {
                  if (header === ACTION_COLUMN_KEY) {
                    return (
                      <th
                        key="action-header"
                        className="text-left whitespace-normal break-words px-2 lg:px-3 py-3 font-semibold text-[#555555] text-xs"
                      >
                        {t(UI.quoteAction)}
                      </th>
                    );
                  }
                  const origIndex = headers.indexOf(header);
                  return (
                    <th key={`${header}-${index}`} className={`${header.includes('금액') ? 'text-right' : 'text-left'} px-2 lg:px-3 py-3 font-semibold text-[#555555] text-xs ${header.includes('연도') || header.includes('년도') ? 'whitespace-nowrap' : 'whitespace-normal break-words'}`}>
                      <button
                        type="button"
                        onClick={() => handleSort(origIndex)}
                        className={`inline-flex w-full items-center gap-1 hover:text-[#191919] ${header.includes('금액') ? 'justify-end text-right' : 'text-left'}`}
                        title={activeSortIndex === origIndex && activeSortDirection === 'desc' ? t(UI.quoteSortAsc) : t(UI.quoteSortDesc)}
                        aria-label={`${header} ${activeSortIndex === origIndex && activeSortDirection === 'desc' ? t(UI.quoteSortAsc) : t(UI.quoteSortDesc)}`}
                      >
                        <span>{header}</span>
                        <span className={activeSortIndex === origIndex ? 'text-blue-600 font-bold' : 'text-[#999999]'} aria-hidden="true">
                          {activeSortIndex === origIndex ? (activeSortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIndex) => {
                const quoteNumber = ledgerValue(headers, row, ['견적번호']).trim();
                const company = ledgerValue(headers, row, ['업체명', '회사명']).trim();
                const rowKey = quoteRowKey(headers, row);
                const linkIndex = headers.findIndex((header) => header.includes('파일링크'));
                const linkValue = linkIndex >= 0 ? (row.links[linkIndex] ?? '') : '';
                const quoteFolderName = folderNameFromLink(linkValue);
                return (
                  <tr key={`${row.values.join('|')}-${rowIndex}`} className={`border-t border-[#f0ede8] hover:bg-[#fafaf9] ${row.struck ? 'opacity-60' : ''}`}>
                    {activeHeaders.map((header, displayIndex) => {
                      if (header === ACTION_COLUMN_KEY) {
                        return (
                          <td key="action-cell" className="px-2 lg:px-3 py-3 whitespace-normal break-words">
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
                                href={quoteNumber && company ? uploadUrl(selectedYear, currentDepartment, quoteNumber, company, authorEmail, authorName, quoteFolderName) : '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(event) => { if (!quoteNumber || !company) event.preventDefault(); }}
                                className="w-14 rounded border border-green-200 px-1 py-1 text-[11px] font-medium text-green-700 hover:bg-green-50 aria-disabled:pointer-events-none aria-disabled:opacity-40 text-center"
                                aria-disabled={!quoteNumber || !company}
                              >
                                {t(UI.quoteUploadBtn)}
                              </a>
                              {row.struck ? (
                                <button
                                  type="button"
                                  disabled={!quoteNumber || restoreLoadingKey === rowKey}
                                  onClick={() => void handleRestoreQuote(row)}
                                  className="w-14 rounded border border-amber-200 px-1 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 text-center"
                                >
                                  {restoreLoadingKey === rowKey ? '...' : t(UI.quoteRestoreBtn)}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!quoteNumber}
                                  onClick={() => {
                                    setDeleteMode('strikethrough');
                                    setDeleteDialogRow(row);
                                  }}
                                  className="w-14 rounded border border-red-200 px-1 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 text-center"
                                >
                                  {t(UI.quoteDeleteBtn)}
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }

                      const cellIndex = headers.indexOf(header);
                      const value = cellIndex >= 0 ? (row.values[cellIndex] ?? '') : '';
                      const link = cellIndex >= 0 ? row.links[cellIndex] : null;
                      const href = link ?? (/^https?:\/\//i.test(value) ? value : null);
                      const displayValue = href ? fileNameFromLink(href) : value;
                      const isOrderColumn = header.includes('발주');
                      const isSiteColumn = /적용\s*현장|현장명|^현장$/.test(header.trim());
                      const isYearColumn = header.includes('연도') || header.includes('년도');
                      const isAmountColumn = header.includes('금액');
                      const checked = orderStatus[rowKey] ?? isOrderMarked(value);
                      return (
                        <td key={`${header}-${displayIndex}`} className={`${isAmountColumn ? 'text-right' : 'text-left'} px-2 lg:px-3 py-3 text-[#555555] ${isYearColumn ? 'whitespace-nowrap' : 'whitespace-normal break-words'} ${row.struck ? 'line-through decoration-[#333333] decoration-2' : ''}`}>
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
                          ) : isSiteColumn ? (
                            <div className="flex items-center">
                              {value ? (
                                <button
                                  type="button"
                                  disabled={!quoteNumber}
                                  onClick={() => openSiteModal(row, value)}
                                  className="text-left font-medium text-[#1e293b] hover:text-blue-600 hover:underline flex items-center gap-1 group transition-colors"
                                  title="클릭하여 적용 현장 수정"
                                >
                                  <span className="truncate max-w-[130px]">{value}</span>
                                  <span className="text-[10px] text-gray-400 opacity-50 group-hover:opacity-100">✎</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!quoteNumber}
                                  onClick={() => openSiteModal(row, '')}
                                  className="text-left text-[#94a3b8] hover:text-blue-600 hover:border-blue-400 border border-dashed border-[#cbd5e1] rounded px-2 py-0.5 text-[11px] transition-colors"
                                  title="클릭하여 적용 현장 작성"
                                >
                                  {t(UI.quoteSiteAddBtn)}
                                </button>
                              )}
                            </div>
                          ) : href ? (
                            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline break-all" title={displayValue}>
                              {displayValue || '열기'}
                            </a>
                          ) : isAmountColumn ? (
                            formatAmountValue(value)
                          ) : (
                            <span title={value} className="break-words">
                              {value}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {!loading && !error && visibleRows.length === 0 && rows.length > 0 && (
                <tr>
                  <td colSpan={activeHeaders.length + 1} className="px-4 py-8 text-center text-sm text-[#999999]">
                    {t(UI.quoteSearchNoResults)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {/* 440건 이상일 때도 가볍게 탐색할 수 있는 페이징 및 행 수 컨트롤러 */}
          {rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#faf9f7] border-t border-[#ddd9d2] text-xs text-[#666]">
              <div className="flex items-center gap-2">
                <span>총 <strong className="text-[#191919]">{totalItems.toLocaleString('ko-KR')}</strong>건</span>
                {searchTerm && <span className="text-[#999]">(검색 필터 적용됨)</span>}
                <span className="text-[#ccc]">|</span>
                <span>페이지당:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-[#ccc] bg-white px-2 py-0.5 text-xs text-[#333] font-medium"
                >
                  <option value={30}>30건씩</option>
                  <option value={50}>50건씩</option>
                  <option value={100}>100건씩</option>
                  <option value={0}>전체 보기</option>
                </select>
              </div>

              {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-[#ddd9d2] bg-white text-xs font-semibold hover:bg-[#f0ede8] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  <span className="px-2 text-xs font-bold text-[#333]">
                    {safeCurrentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded border border-[#ddd9d2] bg-white text-xs font-semibold hover:bg-[#f0ede8] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
