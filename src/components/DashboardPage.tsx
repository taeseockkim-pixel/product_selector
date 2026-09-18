import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../context/LangContext';
import { UI } from '../i18n/ui';
import {
  fetchLedger,
  fetchDashboardStats,
  fetchAuthors,
  fetchOrderHistory,
  type DashboardStatsRecord,
  type OrderHistoryResult,
  type LedgerRow,
} from '../utils/appsScriptBridge';

type DashboardTab = 'quotes' | 'orders';
type Metric = 'count' | 'amount';
type PeriodMode = 'all' | 'month' | 'week' | 'custom';

interface Props {
  onBack: () => void;
  departments: string[];
  department: string;
  isAdmin: boolean;
}

interface QuoteRecord {
  department: string;
  year: number;
  month: number;
  day: number;
  dateStr: string; // "YYYY-MM-DD"
  quoteNumber: string;
  company: string;
  product: string;
  category: string;
  amount: number;
  ordered: boolean;
  authorName: string;
}

interface AggregatedItem {
  label: string;
  count: number;
  amount: number;
}

interface HoverTooltipState {
  x: number;
  y: number;
  label: string;
  value: string;
  flipDown: boolean;
  align: 'left' | 'center' | 'right';
}

// 4대 제품군 외 모든 항목(TOUCH, ACCESSORY, Hybird, 기술지원비 등)을 '기타'로 포함하여 451건이 누락 없이 100% 집계되도록 함
const CATEGORY_OPTIONS = ['PLC', 'IPC / IAC', 'SCADA', 'XPANEL', '기타'];

function findColumn(headers: string[], labels: string[]) {
  return headers.findIndex((header) => labels.some((label) => header.includes(label)));
}

function valueAt(row: LedgerRow, index: number) {
  return index >= 0 ? row.values[index] ?? '' : '';
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function orderedValue(value: string) {
  return ['발주', '완료', '예', 'Y', 'O', 'TRUE'].includes(value.trim().toUpperCase());
}

/** 억/만 단위 포맷팅 (영업용 가독성 요약) */
function formatWon(value: number) {
  if (value >= 100_000_000) {
    const eok = Math.floor(value / 100_000_000);
    const rest = Math.round((value % 100_000_000) / 10_000);
    return rest > 0
      ? `${eok.toLocaleString('ko-KR')}억 ${rest.toLocaleString('ko-KR')}만 원`
      : `${eok.toLocaleString('ko-KR')}억 원`;
  }
  if (value >= 10_000) {
    const man = Math.round(value / 10_000);
    return `${man.toLocaleString('ko-KR')}만 원`;
  }
  return `${Math.round(value).toLocaleString('ko-KR')} 원`;
}

/** 전체 원화 포맷팅 */
function formatWonFull(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')} 원`;
}

function normalizeCategory(value: string) {
  const text = value.toUpperCase();
  if (text.includes('IPC') || text.includes('IAC') || text.includes('BOX PC')) return 'IPC / IAC';
  if (text.includes('SCADA')) return 'SCADA';
  if (text.includes('XPANEL')) return 'XPANEL';
  if (text.includes('PLC') || text.includes('CM0') || text.includes('CM1') || text.includes('CM3')) return 'PLC';
  return '기타';
}

function buildRecords(
  department: string,
  year: number,
  headers: string[],
  rows: LedgerRow[],
  quoteAuthorMap?: Map<string, string>,
  emailAuthorMap?: Map<string, string>,
): QuoteRecord[] {
  const quoteIndex = findColumn(headers, ['견적번호']);
  const yearIndex = findColumn(headers, ['연도', '년도']);
  const monthIndex = findColumn(headers, ['월']);
  const dayIndex = findColumn(headers, ['일', '일자', '견적일']);
  const companyIndex = findColumn(headers, ['업체명', '회사명']);
  const productIndex = findColumn(headers, ['제품명', '품명', '모델명']);
  const categoryIndex = findColumn(headers, ['제품 항목', '제품군', '카테고리']);
  const amountIndex = findColumn(headers, ['견적 금액', '견적금액', '총 견적금액', '금액']);
  const orderIndex = findColumn(headers, ['발주']);
  // 대장의 10열 '이메일'은 고객사 이메일이므로 절대 '이메일'을 검색어로 넣지 않는다!
  const authorIndex = findColumn(headers, ['작성자명', '작성자', '담당영업', '영업담당', '작성자 성명']);

  return rows
    .filter((row) => !row.struck) // 취소선(라인삭제)된 건은 통계 집계에서 제외
    .map((row) => {
      const recYear = Number(valueAt(row, yearIndex)) || year;
      const month = Number(valueAt(row, monthIndex).replace(/\D/g, ''));
      const rawDay = Number(valueAt(row, dayIndex).replace(/\D/g, ''));
      const day = rawDay >= 1 && rawDay <= 31 ? rawDay : 1;
      const validMonth = month >= 1 && month <= 12 ? month : 0;
      const dateStr = validMonth > 0
        ? `${recYear}-${String(validMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        : '';

      const quoteNumber = valueAt(row, quoteIndex).trim();
      let authorName = authorIndex >= 0 ? valueAt(row, authorIndex).trim() : '';
      if (!authorName && quoteAuthorMap) {
        authorName = quoteAuthorMap.get(quoteNumber) || quoteAuthorMap.get(quoteNumber.replace(/_Rev\d+$/i, '')) || '';
      }
      if (authorName.includes('@') && emailAuthorMap) {
        authorName = emailAuthorMap.get(authorName.toLowerCase()) || authorName.split('@')[0];
      }

      return {
        department,
        year: recYear,
        month: validMonth,
        day,
        dateStr,
        quoteNumber,
        company: valueAt(row, companyIndex).trim() || '미입력',
        product: valueAt(row, productIndex).trim() || '미입력',
        category: normalizeCategory(valueAt(row, categoryIndex)),
        amount: parseAmount(valueAt(row, amountIndex)),
        ordered: orderedValue(valueAt(row, orderIndex)),
        authorName,
      };
    })
    .filter((record) => record.quoteNumber || record.company !== '미입력');
}

function aggregate(records: QuoteRecord[], key: 'company' | 'product' | 'category' | 'authorName') {
  const map = new Map<string, AggregatedItem>();
  records.forEach((record) => {
    const label = record[key] || '미입력';
    const previous = map.get(label) ?? { label, count: 0, amount: 0 };
    map.set(label, { label, count: previous.count + 1, amount: previous.amount + record.amount });
  });
  return [...map.values()];
}

function metricValue(item: AggregatedItem, metric: Metric) {
  return metric === 'amount' ? item.amount : item.count;
}

/** 포인트 좌표 계산 — top 패딩 48px 확보하여 피크점 호버 시 툴팁 상단 짤림 원천 방지 */
function linePoints(values: number[], width = 760, height = 240) {
  const max = Math.max(...values, 1);
  const left = 36;
  const right = 28;
  const top = 48; // 천장과 충분한 거리 유지
  const bottom = 32;
  return values.map((value, index) => {
    const x = left + (index * (width - left - right)) / Math.max(values.length - 1, 1);
    const y = height - bottom - (value / max) * (height - top - bottom);
    return { x, y, value };
  });
}

function monthTotals(records: QuoteRecord[], metric: Metric) {
  return Array.from({ length: 12 }, (_, index) => records
    .filter((record) => record.month === index + 1)
    .reduce((sum, record) => sum + (metric === 'amount' ? record.amount : 1), 0));
}

function dayTotals(records: QuoteRecord[], daysInMonth: number, metric: Metric) {
  return Array.from({ length: daysInMonth }, (_, index) => records
    .filter((record) => record.day === index + 1)
    .reduce((sum, record) => sum + (metric === 'amount' ? record.amount : 1), 0));
}

function teamColor(index: number) {
  return ['#2563eb', '#0f766e', '#d97706', '#7c3aed', '#64748b'][index % 5];
}

/** 통계 JSON 품목 상세 집계 — 견적/발주 필터링 지원 */
function buildItemAnalysisFromStats(
  statsRecords: DashboardStatsRecord[],
  orderFilter?: (quoteNumber: string) => boolean,
) {
  const map = new Map<string, { name: string; count: number; quantity: number; amount: number }>();
  statsRecords.forEach((record) => {
    if (orderFilter && !orderFilter(record.quoteNumber)) return;
    (record.items || []).forEach((item) => {
      const key = item.name || '미입력';
      const prev = map.get(key) ?? { name: key, count: 0, quantity: 0, amount: 0 };
      prev.count += 1;
      prev.quantity += Number(item.quantity) || 0;
      prev.amount += Number(item.totalPrice) || 0;
      map.set(key, prev);
    });
  });
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export default function DashboardPage({ onBack, departments, department, isAdmin }: Props) {
  const t = useT();
  const currentYear = new Date().getFullYear();
  const [selectedDepartment, setSelectedDepartment] = useState(isAdmin ? '전체' : (department || '기술영업'));
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('quotes');
  const [metric, setMetric] = useState<Metric>('amount');
  const [categories, setCategories] = useState<string[]>(CATEGORY_OPTIONS);

  // ── 사용자(작성자)별 필터 ──
  const [selectedAuthor, setSelectedAuthor] = useState('전체');

  // ── 일자/기간별 필터 (연간 전체 / 월별 / 주간 / 일자 지정) ──
  const [periodMode, setPeriodMode] = useState<PeriodMode>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedWeek, setSelectedWeek] = useState<number>(1); // 1~5주차
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [records, setRecords] = useState<QuoteRecord[]>([]);
  const [history, setHistory] = useState<QuoteRecord[]>([]);
  const [statsRecords, setStatsRecords] = useState<DashboardStatsRecord[]>([]);

  // ── ERP 발주 내역 최신 파일 데이터 ──
  const [orderHistoryData, setOrderHistoryData] = useState<OrderHistoryResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 툴팁 상태 객체 (위치 반전 및 정렬 포함)
  const [hoverPoint, setHoverPoint] = useState<HoverTooltipState | null>(null);
  const trendSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!isAdmin && department) {
      setSelectedDepartment(department);
    }
  }, [department, isAdmin]);

  const targetDepartments = useMemo(
    () => (isAdmin && selectedDepartment === '전체' ? departments : [selectedDepartment]),
    [departments, isAdmin, selectedDepartment],
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. 통계 JSON (품목 상세 및 실제 작성자 정보)을 먼저 조회하여 작성자 매핑 맵 구축
      const statsResults = await Promise.all(targetDepartments.map(async (target) => {
        try {
          const result = await fetchDashboardStats(target);
          return result && result.success && result.records ? result.records : [];
        } catch {
          return [];
        }
      }));
      const flatStats = statsResults.flat();
      setStatsRecords(flatStats);

      // 2. 작성자 DB 조회 (이메일 -> 작성자 이름 매핑용)
      let authorsList: Array<{ name: string; email: string }> = [];
      try {
        const authorsResult = await fetchAuthors();
        if (authorsResult.success && authorsResult.authors) {
          authorsList = authorsResult.authors;
        }
      } catch { /* 실패 시 건너뜀 */ }

      const quoteAuthorMap = new Map<string, string>();
      flatStats.forEach((s) => {
        if (s.quoteNumber && s.authorName) {
          quoteAuthorMap.set(s.quoteNumber, s.authorName);
          quoteAuthorMap.set(s.quoteNumber.replace(/_Rev\d+$/i, ''), s.authorName);
        }
      });

      const emailAuthorMap = new Map<string, string>();
      authorsList.forEach((a) => {
        if (a.email && a.name) {
          emailAuthorMap.set(a.email.toLowerCase(), a.name);
        }
      });

      // 3. 최신 ERP 발주 내역 파일 데이터 조회
      try {
        const targetDeptForOrder = selectedDepartment === '전체' ? department : selectedDepartment;
        const orderHistRes = await fetchOrderHistory(targetDeptForOrder, selectedYear);
        if (orderHistRes && orderHistRes.success && orderHistRes.hasFile) {
          setOrderHistoryData(orderHistRes);
        } else {
          setOrderHistoryData(null);
        }
      } catch {
        setOrderHistoryData(null);
      }

      // 4. 대장 조회
      const years = new Set<number>();
      const selectedResults = await Promise.all(targetDepartments.map(async (target) => {
        try {
          const result = await fetchLedger(selectedYear, target);
          if (result && result.success) {
            (result.availableYears ?? []).forEach((year) => years.add(year));
            return { department: target, result };
          }
          console.warn(`대장 조회 경고 (${target}):`, result?.message);
          return { department: target, result: { success: false, headers: [], rows: [] } };
        } catch (err) {
          console.warn(`대장 로드 예외 (${target}):`, err);
          return { department: target, result: { success: false, headers: [], rows: [] } };
        }
      }));

      const currentRecords = selectedResults.flatMap(({ department: target, result }) =>
        buildRecords(target, selectedYear, result.headers ?? [], result.rows ?? [], quoteAuthorMap, emailAuthorMap),
      );
      setRecords(currentRecords);
      setAvailableYears([...years].filter((year) => year >= 2000 && year <= currentYear).sort((a, b) => b - a));

      // 5. 과거 연도 대장 읽기 (이탈/재구매 분석용)
      const historicalYears = [...years].filter((year) => year < selectedYear).slice(0, 5);
      const historicalResults = await Promise.all(historicalYears.flatMap((year) =>
        targetDepartments.map(async (target) => {
          try {
            const result = await fetchLedger(year, target);
            return { department: target, year, result };
          } catch {
            return { department: target, year, result: { success: false, headers: [], rows: [] } };
          }
        }),
      ));
      setHistory(historicalResults.flatMap(({ department: target, year, result }) =>
        buildRecords(target, year, result.headers ?? [], result.rows ?? [], quoteAuthorMap, emailAuthorMap),
      ));
    } catch (err) {
      setRecords([]);
      setHistory([]);
      setStatsRecords([]);
      setOrderHistoryData(null);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [currentYear, department, selectedDepartment, selectedYear, targetDepartments]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // 발주 내역 업로드 완료 postMessage 수신 시 대시보드 자동 새로고침
  useEffect(() => {
    function handleOrderHistoryUploaded(event: MessageEvent) {
      if (event.data?.source === 'cimon-order-history-agent' && event.data.type === 'ORDER_HISTORY_UPLOADED') {
        void loadDashboard();
      }
    }
    window.addEventListener('message', handleOrderHistoryUploaded);
    return () => window.removeEventListener('message', handleOrderHistoryUploaded);
  }, [loadDashboard]);

  // 발주 내역 업로드 창 열기
  function handleOpenOrderHistoryUpload() {
    const targetDept = selectedDepartment === '전체' ? department : selectedDepartment;
    const url = `http://172.35.12.36:8790/order-history-upload?department=${encodeURIComponent(targetDept)}&year=${selectedYear}`;
    const popup = window.open(url, '_blank');
    if (!popup) alert('발주 내역 파일 업로드 창을 열 수 없습니다. 브라우저 팝업 차단을 해제해 주세요.');
  }

  // 해당 부서/연도의 고유 담당자(작성자) 목록 추출 (이메일 주소 형태나 미입력 제외)
  const availableAuthors = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const name = r.authorName?.trim();
      if (name && name !== '미입력' && !name.includes('@')) {
        set.add(name);
      }
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [records]);

  // ── [주간 계산 헬퍼: 1주차(1~7일), 2주차(8~14일), 3주차(15~21일), 4주차(22~28일), 5주차(29~말일)] ──
  const activeWeekMonth = selectedMonth > 0 ? selectedMonth : (new Date().getMonth() + 1);
  const weekRange = useMemo(() => {
    const startDay = (selectedWeek - 1) * 7 + 1;
    const daysInMonth = new Date(selectedYear, activeWeekMonth, 0).getDate();
    const endDay = selectedWeek === 5 ? daysInMonth : Math.min(selectedWeek * 7, daysInMonth);
    return { startDay, endDay, daysInMonth };
  }, [activeWeekMonth, selectedWeek, selectedYear]);

  // ── [다단계 필터링: 제품군 + 담당자 + 일자/기간(연간/월간/주간/일자지정)] ──
  const categoryRecords = useMemo(() => {
    return records.filter((record) => {
      // 1. 제품군 필터: 전체 선택 시 무조건 통과 (451건 100% 보존)
      if (categories.length < CATEGORY_OPTIONS.length && !categories.includes(record.category)) {
        return false;
      }
      // 2. 담당자 필터
      if (selectedAuthor !== '전체' && record.authorName !== selectedAuthor) return false;
      // 3. 기간 필터
      if (periodMode === 'month') {
        if (selectedMonth > 0 && record.month !== selectedMonth) return false;
      } else if (periodMode === 'week') {
        if (record.month !== activeWeekMonth) return false;
        if (record.day < weekRange.startDay || record.day > weekRange.endDay) return false;
      } else if (periodMode === 'custom') {
        if (startDate && record.dateStr && record.dateStr < startDate) return false;
        if (endDate && record.dateStr && record.dateStr > endDate) return false;
      }
      return true;
    });
  }, [activeWeekMonth, categories, endDate, periodMode, records, selectedAuthor, selectedMonth, startDate, weekRange.endDay, weekRange.startDay]);

  // 발주 완료된 레코드 (수주 실적 데이터)
  const orderRecords = useMemo(
    () => categoryRecords.filter((record) => record.ordered),
    [categoryRecords],
  );

  // 견적 번호 -> 발주 여부 매핑
  const orderQuoteMap = useMemo(() => {
    const map = new Map<string, boolean>();
    records.forEach((record) => {
      if (record.quoteNumber) map.set(record.quoteNumber, record.ordered);
    });
    return map;
  }, [records]);

  // 현재 활성 탭에 따른 데이터 셋 분리
  const currentRecords = activeTab === 'quotes' ? categoryRecords : orderRecords;

  // ── [영업 KPI 산출] ──
  const totalQuoteAmount = useMemo(() => categoryRecords.reduce((sum, r) => sum + r.amount, 0), [categoryRecords]);
  const totalQuoteCount = categoryRecords.length;
  const avgQuoteAmount = totalQuoteCount > 0 ? totalQuoteAmount / totalQuoteCount : 0;
  const uniqueQuotedClients = useMemo(() => new Set(categoryRecords.map((r) => r.company).filter(Boolean)).size, [categoryRecords]);

  // 발주 탭의 경우: 최신 ERP 발주 내역 파일이 있으면 해당 실제 데이터를 우선 사용!
  const hasOrderFile = Boolean(orderHistoryData && orderHistoryData.hasFile);

  const totalOrderAmount = useMemo(() => {
    if (activeTab === 'orders' && hasOrderFile && orderHistoryData?.totalAmount != null) {
      return orderHistoryData.totalAmount;
    }
    return orderRecords.reduce((sum, r) => sum + r.amount, 0);
  }, [activeTab, hasOrderFile, orderHistoryData, orderRecords]);

  const totalOrderCount = useMemo(() => {
    if (activeTab === 'orders' && hasOrderFile && orderHistoryData?.totalOrders != null) {
      return orderHistoryData.totalOrders;
    }
    return orderRecords.length;
  }, [activeTab, hasOrderFile, orderHistoryData, orderRecords]);

  const avgOrderAmount = totalOrderCount > 0 ? totalOrderAmount / totalOrderCount : 0;

  const uniquePayingClients = useMemo(() => {
    if (activeTab === 'orders' && hasOrderFile && orderHistoryData?.uniqueClients != null) {
      return orderHistoryData.uniqueClients;
    }
    return new Set(orderRecords.map((r) => r.company).filter(Boolean)).size;
  }, [activeTab, hasOrderFile, orderHistoryData, orderRecords]);

  // 전환율 (Win Rate)
  const winRateCount = totalQuoteCount > 0 ? Math.round((totalOrderCount / totalQuoteCount) * 1000) / 10 : 0;
  const winRateAmount = totalQuoteAmount > 0 ? Math.round((totalOrderAmount / totalQuoteAmount) * 1000) / 10 : 0;

  // ── [스마트 추이 차트: 월별 vs 일별(월간) vs 일별(주간)] ──
  const isDailyChart = (periodMode === 'month' && selectedMonth > 0) || periodMode === 'week';
  const daysInSelectedMonth = useMemo(() => {
    if (periodMode === 'week') {
      return weekRange.endDay - weekRange.startDay + 1;
    }
    if (periodMode === 'month' && selectedMonth > 0) {
      return new Date(selectedYear, selectedMonth, 0).getDate();
    }
    return 0;
  }, [periodMode, selectedMonth, selectedYear, weekRange.endDay, weekRange.startDay]);

  const chartData = useMemo(() => {
    // 발주 탭이고 ERP 파일 데이터가 연간 전체로 제공되는 경우
    if (activeTab === 'orders' && hasOrderFile && periodMode === 'all' && orderHistoryData?.monthlyTotals) {
      const values = orderHistoryData.monthlyTotals.map((m) => (metric === 'amount' ? m.amount : m.count));
      const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
      return { values, labels, isDaily: false };
    }

    if (periodMode === 'week') {
      const count = weekRange.endDay - weekRange.startDay + 1;
      const values = Array.from({ length: count }, (_, idx) => {
        const d = weekRange.startDay + idx;
        const matched = currentRecords.filter((r) => r.day === d);
        return matched.reduce((sum, r) => sum + (metric === 'amount' ? r.amount : 1), 0);
      });
      const labels = Array.from({ length: count }, (_, idx) => `${weekRange.startDay + idx}일`);
      return { values, labels, isDaily: true };
    }

    if (isDailyChart) {
      const values = dayTotals(currentRecords, daysInSelectedMonth, metric);
      const labels = Array.from({ length: daysInSelectedMonth }, (_, i) => `${i + 1}일`);
      return { values, labels, isDaily: true };
    }

    const values = monthTotals(currentRecords, metric);
    const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
    return { values, labels, isDaily: false };
  }, [activeTab, currentRecords, daysInSelectedMonth, hasOrderFile, isDailyChart, metric, orderHistoryData, periodMode, weekRange.endDay, weekRange.startDay]);

  const chartWidth = isDailyChart && daysInSelectedMonth > 20 ? 840 : 760;
  const chartHeight = 240;
  const chartPoints = useMemo(() => linePoints(chartData.values, chartWidth, chartHeight), [chartData.values, chartWidth]);

  // 차원별 집계 및 랭킹 (발주 탭이고 ERP 파일이 있으면 ERP 파일 데이터 우선)
  const rankedCompanies = useMemo(() => {
    if (activeTab === 'orders' && hasOrderFile && orderHistoryData?.clientRanking) {
      return orderHistoryData.clientRanking.slice(0, 8).map((c) => ({
        label: c.client,
        amount: c.amount,
        count: c.count,
      }));
    }
    return [...aggregate(currentRecords, 'company')].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).slice(0, 8);
  }, [activeTab, currentRecords, hasOrderFile, metric, orderHistoryData]);

  const rankedProducts = useMemo(() => {
    if (activeTab === 'orders' && hasOrderFile && orderHistoryData?.productRanking) {
      return orderHistoryData.productRanking.slice(0, 8).map((p) => ({
        label: p.name,
        amount: p.amount,
        count: p.count,
        qty: p.qty,
      }));
    }
    return [...aggregate(currentRecords, 'product')].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).slice(0, 8);
  }, [activeTab, currentRecords, hasOrderFile, metric, orderHistoryData]);

  const rankedCategories = useMemo(
    () => [...aggregate(currentRecords, 'category')].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)),
    [currentRecords, metric],
  );

  const rankedAuthors = useMemo(() => {
    if (activeTab === 'orders' && hasOrderFile && orderHistoryData?.repRanking) {
      return orderHistoryData.repRanking.map((r) => ({
        label: r.rep,
        amount: r.amount,
        count: r.count,
      }));
    }
    return [...aggregate(currentRecords, 'authorName')]
      .filter((item) => item.label && item.label !== '미입력' && !item.label.includes('@'))
      .sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
  }, [activeTab, currentRecords, hasOrderFile, metric, orderHistoryData]);

  // 팀별 영업 성과 비교 행 (관리자: 전체 부서 비교 / 일반: 본인 부서 표시)
  const displayDepartments = useMemo(
    () => (isAdmin && selectedDepartment === '전체' ? departments : [selectedDepartment]),
    [departments, isAdmin, selectedDepartment],
  );

  const teamRows = useMemo(() => {
    return displayDepartments.map((team) => {
      const teamAll = categoryRecords.filter((record) => record.department === team);
      const teamWon = teamAll.filter((record) => record.ordered);
      const teamActive = activeTab === 'quotes' ? teamAll : teamWon;
      const count = teamActive.length;
      const amount = teamActive.reduce((sum, record) => sum + record.amount, 0);
      const winRate = teamAll.length > 0 ? Math.round((teamWon.length / teamAll.length) * 100) : 0;
      return { team, count, amount, winCount: teamWon.length, winAmount: teamWon.reduce((sum, r) => sum + r.amount, 0), winRate };
    });
  }, [activeTab, categoryRecords, displayDepartments]);

  // 견적 탭: 진행 중인 고액 영업 기회 (미수주 견적 파이프라인 상위)
  const openPipelineQuotes = useMemo(() => {
    return [...categoryRecords.filter((record) => !record.ordered && record.amount > 0)]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [categoryRecords]);

  // 발주 탭: 최근 수주 확정 건 내역 (ERP 파일 데이터 우선)
  const recentOrders = useMemo(() => {
    if (activeTab === 'orders' && hasOrderFile && orderHistoryData?.recentOrders) {
      return orderHistoryData.recentOrders.slice(0, 8).map((o) => ({
        quoteNumber: o.orderNo,
        company: o.client,
        product: o.firstItem + (o.itemCount > 1 ? ` 외 ${o.itemCount - 1}건` : ''),
        amount: o.amount,
        authorName: o.rep,
        month: o.month,
        day: o.day,
        dateStr: o.dateStr || o.orderDate,
      }));
    }
    return [...orderRecords]
      .sort((a, b) => {
        if (b.month !== a.month) return b.month - a.month;
        if (b.day !== a.day) return b.day - a.day;
        return b.amount - a.amount;
      })
      .slice(0, 8);
  }, [activeTab, hasOrderFile, orderHistoryData, orderRecords]);

  // 고객 분석: 견적 탭(견적 문의 중단) vs 발주 탭(실제 발주 이탈 우려 거래처)
  const customerRetentionList = useMemo(() => {
    if (activeTab === 'quotes') {
      const currentClients = new Set(categoryRecords.map((r) => r.company));
      const pastClients = new Set(history.map((r) => r.company));
      return [...pastClients]
        .filter((company) => !currentClients.has(company))
        .map((company) => {
          const past = history.filter((r) => r.company === company);
          const last = [...past].sort((a, b) => `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`))[0];
          return {
            company,
            lastYear: last?.year ?? 0,
            lastMonth: last?.month ?? 0,
            totalAmount: past.reduce((sum, r) => sum + r.amount, 0),
            count: past.length,
          };
        })
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 8);
    } else {
      const currentOrderClients = new Set(
        hasOrderFile && orderHistoryData?.clientRanking
          ? orderHistoryData.clientRanking.map((c) => c.client)
          : orderRecords.map((r) => r.company)
      );
      const pastOrderRecords = history.filter((r) => r.ordered);
      const pastOrderClients = new Set(pastOrderRecords.map((r) => r.company));
      return [...pastOrderClients]
        .filter((company) => !currentOrderClients.has(company))
        .map((company) => {
          const pastOrders = pastOrderRecords.filter((r) => r.company === company);
          const last = [...pastOrders].sort((a, b) => `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`))[0];
          return {
            company,
            lastYear: last?.year ?? 0,
            lastMonth: last?.month ?? 0,
            totalAmount: pastOrders.reduce((sum, r) => sum + r.amount, 0),
            count: pastOrders.length,
          };
        })
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 8);
    }
  }, [activeTab, categoryRecords, hasOrderFile, history, orderHistoryData, orderRecords]);

  // 통계 JSON 기반 품목 상세
  const itemAnalysis = useMemo(() => {
    return buildItemAnalysisFromStats(
      statsRecords,
      activeTab === 'orders' ? (quoteNumber) => orderQuoteMap.get(quoteNumber) === true : undefined,
    );
  }, [activeTab, orderQuoteMap, statsRecords]);

  const maxItemAmount = Math.max(...itemAnalysis.map((item) => item.amount), 1);

  function toggleCategory(category: string) {
    setCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
  }

  // ── [툴팁 호버 감지: 천장 근처 flipDown 반전 + 좌우 클램핑] ──
  function handleTrendHover(event: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const svg = trendSvgRef.current;
    if (!svg || chartPoints.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const scaleX = chartWidth / rect.width;
    const svgX = mouseX * scaleX;

    let closestIndex = 0;
    let closestDist = Infinity;
    chartPoints.forEach((point, idx) => {
      const dist = Math.abs(point.x - svgX);
      if (dist < closestDist) {
        closestIndex = idx;
        closestDist = dist;
      }
    });

    const closest = chartPoints[closestIndex];
    if (!closest) return;

    const flipDown = closest.y < 85;
    const align: 'left' | 'center' | 'right' =
      closest.x < 110 ? 'left' : closest.x > chartWidth - 110 ? 'right' : 'center';

    setHoverPoint({
      x: closest.x,
      y: closest.y,
      label: chartData.labels[closestIndex] ?? '',
      value: metric === 'amount' ? formatWonFull(closest.value) : `${closest.value.toLocaleString('ko-KR')}건`,
      flipDown,
      align,
    });
  }

  const isQuotes = activeTab === 'quotes';
  const themeMainColor = isQuotes ? '#2563eb' : '#059669';
  const themeGradientId = isQuotes ? 'quoteGradient' : 'orderGradient';

  return (
    <div className="min-h-screen bg-[#f5f7fa] px-3 sm:px-6 py-6 font-sans">
      <div className="max-w-[1680px] mx-auto space-y-4">
        {/* 상단 네비게이션 및 글로벌 필터 바 */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e3e7ee] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-xl border border-[#d8dde5] bg-[#f8fafc] px-3.5 py-2 text-sm font-semibold text-[#334155] hover:bg-[#edf2f7] transition-colors"
            >
              <span>←</span>
              <span>{t(UI.back)}</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-[0.16em] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  CIMON SALES INTELLIGENCE
                </span>
                <span className="text-xs text-[#94a3b8] font-medium">| {selectedYear}년도</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-[#0f172a] mt-0.5">
                {t(UI.quoteDashboardTitle)}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <div className="flex items-center gap-1.5 rounded-xl border border-[#d8dde5] bg-white px-2.5 py-1.5">
                <span className="text-xs text-[#64748b] font-medium">부서:</span>
                <select
                  value={selectedDepartment}
                  onChange={(event) => setSelectedDepartment(event.target.value)}
                  className="bg-transparent text-sm font-bold text-[#1e293b] outline-none cursor-pointer"
                >
                  <option value="전체">전체 부서</option>
                  {departments.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!isAdmin && (
              <span className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                {department}
              </span>
            )}
            {availableYears.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-[#d8dde5] bg-white px-2.5 py-1.5">
                <span className="text-xs text-[#64748b] font-medium">연도:</span>
                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                  className="bg-transparent text-sm font-bold text-[#1e293b] outline-none cursor-pointer"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                      {t(UI.quoteYearSuffix)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="flex items-center gap-1.5 rounded-xl border border-[#d8dde5] bg-white px-3 py-2 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{t(UI.quoteDashboardRefresh)}</span>
            </button>
          </div>
        </header>

        {/* 탭 스위처: 견적 파이프라인 분석 vs 발주(수주) 실적 분석 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cbd5e1] pb-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('quotes')}
              className={`flex items-center gap-2 px-5 py-3 text-base font-extrabold border-b-2 transition-all ${
                isQuotes
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-sm'
                  : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isQuotes ? 'bg-blue-600' : 'bg-[#94a3b8]'}`} />
              <span>{t(UI.quoteDashboardQuotesTab)}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-5 py-3 text-base font-extrabold border-b-2 transition-all ${
                !isQuotes
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-sm'
                  : 'border-transparent text-[#64748b] hover:text-[#1e293b]'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${!isQuotes ? 'bg-emerald-600' : 'bg-[#94a3b8]'}`} />
              <span>{t(UI.quoteDashboardOrdersTab)}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!isQuotes && (
              <button
                type="button"
                onClick={handleOpenOrderHistoryUpload}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
              >
                <span>📁</span>
                <span>{t(UI.quoteDashboardOrderFileUpload)}</span>
              </button>
            )}
            <p className="text-xs font-semibold text-[#64748b] hidden sm:block">
              {isQuotes ? t(UI.quoteDashboardQuotesSub) : t(UI.quoteDashboardOrdersSub)}
            </p>
          </div>
        </div>

        {/* ── [발주 분석 탭 기준 파일 배지] ── */}
        {!isQuotes && hasOrderFile && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50/80 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white bg-emerald-600 px-2 py-0.5 rounded text-[10px]">
                {t(UI.quoteDashboardOrderFileSource)}
              </span>
              <span className="font-bold">
                {orderHistoryData?.sourceFileName}
              </span>
              <span className="text-emerald-700 text-[11px]">
                (D:\folders\공유\견적서\{selectedDepartment === '전체' ? department : selectedDepartment}\{selectedYear}\발주 내역)
              </span>
            </div>
            {orderHistoryData?.generatedAt && (
              <span className="text-[11px] text-emerald-700 font-medium">
                반영 시각: {new Date(orderHistoryData.generatedAt).toLocaleString('ko-KR')}
              </span>
            )}
          </div>
        )}

        {/* ── [필터 바: 1줄: 제품군 + 담당자 + 지표 / 2줄: 기간/일자 선택 (연간/월별/주간/일자지정)] ── */}
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm space-y-3">
          {/* 1줄: 제품군 필터 + 담당자 필터 + 금액/건수 지표 토글 */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f5f9] pb-3">
            {/* 제품군 칩 (451건 100% 집계 보장) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#64748b]">제품군:</span>
              {CATEGORY_OPTIONS.map((category) => {
                const active = categories.includes(category);
                return (
                  <button
                    type="button"
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                      active
                        ? isQuotes
                          ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-xs'
                        : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? (isQuotes ? 'bg-blue-600' : 'bg-emerald-600') : 'bg-[#cbd5e1]'}`} />
                    {category}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCategories(categories.length === CATEGORY_OPTIONS.length ? [] : [...CATEGORY_OPTIONS])}
                className="text-[11px] font-medium text-[#64748b] underline ml-1 hover:text-[#1e293b]"
              >
                {categories.length === CATEGORY_OPTIONS.length ? '해제' : '전체'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* 사용자(담당자) 필터 드롭다운 */}
              <div className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs">
                <span className="font-bold text-[#64748b]">{t(UI.quoteDashboardFilterAuthor)}:</span>
                <select
                  value={selectedAuthor}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                  className="bg-transparent font-extrabold text-[#0f172a] outline-none cursor-pointer"
                >
                  <option value="전체">{t(UI.quoteDashboardAllAuthors)}</option>
                  {availableAuthors.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 지표 토글 */}
              <div className="flex items-center gap-1 rounded-xl bg-[#f1f5f9] p-1 border border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setMetric('amount')}
                  className={`rounded-lg px-3 py-1 text-xs font-extrabold transition-all ${
                    metric === 'amount'
                      ? isQuotes
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  {isQuotes ? '견적 금액' : '수주 금액'}
                </button>
                <button
                  type="button"
                  onClick={() => setMetric('count')}
                  className={`rounded-lg px-3 py-1 text-xs font-extrabold transition-all ${
                    metric === 'count'
                      ? isQuotes
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  {isQuotes ? t(UI.quoteDashboardMetricQuotes) : t(UI.quoteDashboardMetricOrders)}
                </button>
              </div>
            </div>
          </div>

          {/* 2줄: 기간/일자 선택 컨트롤 (연간 전체 / 월간 / 주간 / 일자 지정) */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[#64748b] mr-1">{t(UI.quoteDashboardFilterPeriod)}:</span>
              <div className="inline-flex rounded-xl bg-[#f1f5f9] p-1 border border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => {
                    setPeriodMode('all');
                    setSelectedMonth(0);
                  }}
                  className={`rounded-lg px-3 py-1 font-bold transition-all ${
                    periodMode === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-[#64748b]'
                  }`}
                >
                  {t(UI.quoteDashboardPeriodAll)}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodMode('month');
                    if (selectedMonth === 0) setSelectedMonth(new Date().getMonth() + 1);
                  }}
                  className={`rounded-lg px-3 py-1 font-bold transition-all ${
                    periodMode === 'month' ? 'bg-white text-blue-700 shadow-xs' : 'text-[#64748b]'
                  }`}
                >
                  {t(UI.quoteDashboardPeriodMonth)}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodMode('week');
                    if (selectedMonth === 0) setSelectedMonth(new Date().getMonth() + 1);
                  }}
                  className={`rounded-lg px-3 py-1 font-bold transition-all ${
                    periodMode === 'week' ? 'bg-white text-blue-700 shadow-xs' : 'text-[#64748b]'
                  }`}
                >
                  {t(UI.quoteDashboardPeriodWeek)}
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodMode('custom')}
                  className={`rounded-lg px-3 py-1 font-bold transition-all ${
                    periodMode === 'custom' ? 'bg-white text-blue-700 shadow-xs' : 'text-[#64748b]'
                  }`}
                >
                  {t(UI.quoteDashboardPeriodCustom)}
                </button>
              </div>

              {/* 월별 모드일 때: 1~12월 선택 칩 */}
              {periodMode === 'month' && (
                <div className="flex flex-wrap items-center gap-1 ml-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${
                        selectedMonth === m
                          ? isQuotes
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-600 text-white'
                          : 'bg-[#f8fafc] border border-[#e2e8f0] text-[#64748b] hover:bg-[#edf2f7]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                  <span className="text-[11px] text-[#94a3b8] ml-1">월</span>
                </div>
              )}

              {/* 주간(Weekly) 모드일 때: 월 선택 + 1~5주차 칩 */}
              {periodMode === 'week' && (
                <div className="flex flex-wrap items-center gap-2 ml-2">
                  <select
                    value={activeWeekMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="rounded-lg border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-bold text-[#1e293b]"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{m}월</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((w) => (
                      <button
                        type="button"
                        key={w}
                        onClick={() => setSelectedWeek(w)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                          selectedWeek === w
                            ? isQuotes
                              ? 'bg-blue-600 text-white'
                              : 'bg-emerald-600 text-white'
                            : 'bg-[#f8fafc] border border-[#e2e8f0] text-[#64748b] hover:bg-[#edf2f7]'
                        }`}
                      >
                        {w}주차
                      </button>
                    ))}
                    <span className="text-[11px] text-[#64748b] ml-1">
                      ({weekRange.startDay}일~{weekRange.endDay}일)
                    </span>
                  </div>
                </div>
              )}

              {/* 일자 지정 모드일 때: 시작일 ~ 종료일 달력 인풋 */}
              {periodMode === 'custom' && (
                <div className="flex items-center gap-1.5 ml-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-medium text-[#1e293b]"
                  />
                  <span className="text-[#94a3b8]">~</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-medium text-[#1e293b]"
                  />
                </div>
              )}
            </div>

            {/* 활성 필터 초기화 */}
            {(selectedAuthor !== '전체' || periodMode !== 'all' || categories.length !== CATEGORY_OPTIONS.length) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAuthor('전체');
                  setPeriodMode('all');
                  setSelectedMonth(0);
                  setSelectedWeek(1);
                  setStartDate('');
                  setEndDate('');
                  setCategories([...CATEGORY_OPTIONS]);
                }}
                className="text-[11px] font-bold text-red-600 hover:underline"
              >
                필터 초기화 ↺
              </button>
            )}
          </div>
        </section>

        {loading && (
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-16 text-center shadow-sm">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3" />
            <p className="text-sm font-semibold text-[#64748b]">{t(UI.quoteDashboardLoading)}</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            <p className="font-bold">오류가 발생했습니다</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── [영업 핵심 KPI 스코어카드 5종] ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {isQuotes ? (
                // ── 견적 분석 탭 KPI (451건 100% 집계) ──
                <>
                  <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/40 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-blue-900">{t(UI.quoteDashboardTotalAmount)}</p>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">파이프라인</span>
                    </div>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
                      {formatWon(totalQuoteAmount)}
                    </p>
                    <p className="text-[11px] text-[#64748b] mt-1">{formatWonFull(totalQuoteAmount)}</p>
                  </div>

                  <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold text-[#64748b]">{t(UI.quoteDashboardTotalQuotes)}</p>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
                      {totalQuoteCount.toLocaleString('ko-KR')}건
                    </p>
                    <p className="text-[11px] text-[#64748b] mt-1">
                      {selectedAuthor !== '전체' ? `${selectedAuthor} 제안 건수` : '전체 영업 제안 건수'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold text-[#64748b]">{t(UI.quoteDashboardAvgQuote)}</p>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
                      {formatWon(avgQuoteAmount)}
                    </p>
                    <p className="text-[11px] text-[#64748b] mt-1">건당 평균 제안 규모</p>
                  </div>

                  <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold text-[#64748b]">{t(UI.quoteDashboardActiveClients)}</p>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
                      {uniqueQuotedClients.toLocaleString('ko-KR')}개사
                    </p>
                    <p className="text-[11px] text-[#64748b] mt-1">견적 요청 기업 풀</p>
                  </div>

                  <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-white to-indigo-50/40 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-indigo-900">{t(UI.quoteDashboardWinRate)}</p>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">전환율</span>
                    </div>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-indigo-900 tracking-tight">
                      {winRateCount}%
                    </p>
                    <p className="text-[11px] text-indigo-700 mt-1">금액 기준: {winRateAmount}% ({totalOrderCount}건 성사)</p>
                  </div>
                </>
              ) : (
                // ── 발주(수주) 분석 탭 KPI (실제 ERP 발주 파일 데이터 연동) ──
                <>
                  <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-white to-emerald-50/50 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-emerald-950">총 수주(발주) 금액</p>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">확정 매출</span>
                    </div>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-950 tracking-tight">
                      {formatWon(totalOrderAmount)}
                    </p>
                    <p className="text-[11px] text-emerald-800 mt-1">{formatWonFull(totalOrderAmount)}</p>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold text-[#64748b]">총 수주(발주) 건수</p>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
                      {totalOrderCount.toLocaleString('ko-KR')}건
                    </p>
                    <p className="text-[11px] text-[#64748b] mt-1">
                      {selectedAuthor !== '전체' ? `${selectedAuthor} 수주 건수` : (hasOrderFile ? 'ERP 수주 주문 건수' : '확정 계약 건수')}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold text-[#64748b]">{t(UI.quoteDashboardAvgOrder)}</p>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
                      {formatWon(avgOrderAmount)}
                    </p>
                    <p className="text-[11px] text-[#64748b] mt-1">건당 평균 계약 단가</p>
                  </div>

                  <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold text-[#64748b]">{t(UI.quoteDashboardPayingClients)}</p>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
                      {uniquePayingClients.toLocaleString('ko-KR')}개사
                    </p>
                    <p className="text-[11px] text-[#64748b] mt-1">실매출 발생 핵심 거래선</p>
                  </div>

                  <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-white to-teal-50/40 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-teal-900">{t(UI.quoteDashboardWinRate)}</p>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">성공률</span>
                    </div>
                    <p className="mt-2 text-xl sm:text-2xl font-black text-teal-900 tracking-tight">
                      {winRateCount}%
                    </p>
                    <p className="text-[11px] text-teal-700 mt-1">제안 {totalQuoteCount}건 중 {totalOrderCount}건 확정</p>
                  </div>
                </>
              )}
            </div>

            {/* ── [차트 섹션: 스마트 추이 차트 & 영업팀별 비교] ── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* 스마트 실적 추이 라인 차트 (월별 / 주간 일별 / 월간 일별) */}
              <section className="xl:col-span-7 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-base font-bold text-[#0f172a]">
                      {periodMode === 'week'
                        ? `${selectedYear}년 ${activeWeekMonth}월 ${selectedWeek}주차 일별 ${isQuotes ? '견적 발행' : '수주 실적'} 추이`
                        : periodMode === 'month' && selectedMonth > 0
                        ? `${selectedYear}년 ${selectedMonth}월 일별 ${isQuotes ? '견적 발행' : '수주 실적'} 추이`
                        : isQuotes
                        ? t(UI.quoteDashboardMonthlyQuotes)
                        : t(UI.quoteDashboardMonthlyOrders)}
                    </h2>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      {periodMode === 'week'
                        ? `${activeWeekMonth}월 ${weekRange.startDay}일~${weekRange.endDay}일`
                        : periodMode === 'month' && selectedMonth > 0
                        ? `${selectedMonth}월 1일~${daysInSelectedMonth}일`
                        : `${selectedYear}년도`}{' '}
                      {metric === 'amount' ? '금액(원)' : '건수(건)'} 기준{' '}
                      {isDailyChart ? '일별' : '월별'} 추이
                      {selectedAuthor !== '전체' && ` · ${selectedAuthor}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#475569]">
                      <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: themeMainColor }} />
                      {isQuotes
                        ? metric === 'amount'
                          ? '견적 금액'
                          : '견적 건수'
                        : metric === 'amount'
                        ? '수주 금액'
                        : '수주 건수'}
                    </span>
                  </div>
                </div>

                {/* 차트 영역 컨테이너 — 상단 툴팁 잘림 방지용 pt-8 및 overflow 제어 */}
                <div className="overflow-x-auto relative pt-8 pb-2">
                  <svg
                    ref={trendSvgRef}
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-64 cursor-crosshair select-none"
                    style={{ minWidth: isDailyChart && daysInSelectedMonth > 20 ? '720px' : '580px' }}
                    onMouseMove={handleTrendHover}
                    onMouseLeave={() => setHoverPoint(null)}
                  >
                    <defs>
                      <linearGradient id={themeGradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={themeMainColor} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={themeMainColor} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* 배경 보조 가이드라인 */}
                    <line x1="36" y1="48" x2={chartWidth - 28} y2="48" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="36" y1="105" x2={chartWidth - 28} y2="105" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="36" y1="162" x2={chartWidth - 28} y2="162" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="36" y1="208" x2={chartWidth - 28} y2="208" stroke="#e2e8f0" strokeWidth="1" />

                    {/* 곡선 아래 면 채우기 */}
                    <polygon
                      fill={`url(#${themeGradientId})`}
                      points={`36,208 ${chartPoints.map((p) => `${p.x},${p.y}`).join(' ')} ${chartPoints[chartPoints.length - 1].x},208`}
                    />

                    {/* 라인 추이선 */}
                    <polyline
                      fill="none"
                      stroke={themeMainColor}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={chartPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    />

                    {/* 데이터 포인트 점 및 라벨 */}
                    {chartPoints.map((point, index) => {
                      const showLabel =
                        !isDailyChart ||
                        daysInSelectedMonth <= 10 ||
                        index === 0 ||
                        index === daysInSelectedMonth - 1 ||
                        (index + 1) % 5 === 0;

                      return (
                        <g key={index}>
                          <circle cx={point.x} cy={point.y} r="14" fill="transparent" />
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="4.5"
                            fill="white"
                            stroke={themeMainColor}
                            strokeWidth="2.5"
                          />
                          {showLabel && (
                            <text
                              x={point.x}
                              y="228"
                              textAnchor="middle"
                              fontSize={isDailyChart ? '10' : '11'}
                              fontWeight="600"
                              fill="#64748b"
                            >
                              {chartData.labels[index]}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* 호버 툴팁 */}
                  {hoverPoint && (
                    <div
                      className="pointer-events-none absolute z-30 rounded-xl bg-[#0f172a] px-3.5 py-2 text-xs font-bold text-white shadow-2xl border border-slate-700 transition-all duration-75"
                      style={{
                        left: `${(hoverPoint.x / chartWidth) * 100}%`,
                        top: `${hoverPoint.y + 32}px`,
                        transform: hoverPoint.flipDown
                          ? hoverPoint.align === 'left'
                            ? 'translate(0%, 18px)'
                            : hoverPoint.align === 'right'
                            ? 'translate(-100%, 18px)'
                            : 'translate(-50%, 18px)'
                          : hoverPoint.align === 'left'
                          ? 'translate(0%, -125%)'
                          : hoverPoint.align === 'right'
                          ? 'translate(-100%, -125%)'
                          : 'translate(-50%, -125%)',
                      }}
                    >
                      <div className="flex items-center gap-1.5 text-blue-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        <span>
                          {hoverPoint.label}{' '}
                          {isQuotes
                            ? metric === 'amount'
                              ? '견적 금액'
                              : '견적 건수'
                            : metric === 'amount'
                            ? '수주 금액'
                            : '수주 건수'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm font-black text-white">{hoverPoint.value}</div>
                    </div>
                  )}
                </div>
              </section>

              {/* 영업팀별 비교 섹션 */}
              <section className="xl:col-span-5 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-base font-bold text-[#0f172a]">
                      {isQuotes ? t(UI.quoteDashboardTeamQuotes) : t(UI.quoteDashboardTeamOrders)}
                    </h2>
                    <span className="text-xs font-semibold text-[#64748b]">
                      {metric === 'amount' ? '금액 비교' : '건수 비교'}
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mb-5">
                    {isQuotes ? '영업 부서별 견적 규모 및 기여도' : '영업 부서별 확정 수주 실적 및 수주 성공률'}
                  </p>

                  <div className="space-y-4">
                    {teamRows.map((item, index) => {
                      const maxVal = Math.max(...teamRows.map((row) => (metric === 'amount' ? row.amount : row.count)), 1);
                      const currentVal = metric === 'amount' ? item.amount : item.count;
                      const percentage = Math.round((currentVal / maxVal) * 100);

                      return (
                        <div key={item.team} className="rounded-xl border border-[#f1f5f9] bg-[#f8fafc] p-3">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-extrabold text-[#1e293b]">{item.team}</span>
                            <span className="font-bold text-[#334155]">
                              {metric === 'amount' ? formatWon(item.amount) : `${item.count}건`}
                              <span className="text-[#94a3b8] font-normal ml-1">
                                {isQuotes ? `(수주 ${item.winCount}건)` : `(성공률 ${item.winRate}%)`}
                              </span>
                            </span>
                          </div>

                          <div className="h-3 rounded-full bg-[#e2e8f0] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: teamColor(index),
                              }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-[#64748b] mt-1.5 font-medium">
                            <span>{isQuotes ? `총 제안 ${item.count}건` : `확정 ${item.count}건`}</span>
                            <span>수주율 {item.winRate}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f1f5f9] text-[11px] text-[#64748b]">
                  {isQuotes
                    ? '💡 견적 제안이 활발한 부서의 파이프라인을 확인하고 지원하세요.'
                    : '💡 확정 수주 금액과 수주 성공률을 바탕으로 영업 집중 전략을 수립하세요.'}
                </div>
              </section>
            </div>

            {/* ── [비중 분석: 카테고리별 비중 & 상위 고객사] ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 제품군(카테고리)별 비중 */}
              <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-[#0f172a]">
                    {isQuotes ? t(UI.quoteDashboardCategoryQuotes) : t(UI.quoteDashboardCategoryOrders)}
                  </h2>
                  <span className="text-xs font-semibold text-[#64748b]">
                    {metric === 'amount' ? '금액 비중' : '건수 비중'}
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] mb-4">
                  {isQuotes ? '주요 제품군별 견적 제안 분포' : '실제 매출을 견인한 제품군별 기여도'}
                </p>

                <div className="space-y-3.5">
                  {rankedCategories.map((item, index) => {
                    const totalVal = rankedCategories.reduce((sum, r) => sum + metricValue(r, metric), 0);
                    const share = totalVal > 0 ? Math.round((metricValue(item, metric) / totalVal) * 100) : 0;
                    const maxVal = Math.max(...rankedCategories.map((r) => metricValue(r, metric)), 1);

                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-[#1e293b]">
                            <span className="inline-block w-5 text-blue-600 font-extrabold">{index + 1}</span>
                            {item.label}
                          </span>
                          <span className="font-extrabold text-[#0f172a]">
                            {metric === 'amount' ? formatWon(item.amount) : `${item.count}건`}
                            <span className="text-[#64748b] font-normal ml-1.5">({share}%)</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isQuotes ? 'bg-blue-600' : 'bg-emerald-600'}`}
                            style={{ width: `${(metricValue(item, metric) / maxVal) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 상위 고객사 TOP 8 */}
              <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-[#0f172a]">
                    {isQuotes ? t(UI.quoteDashboardTopClientsQuotes) : t(UI.quoteDashboardTopClientsOrders)}
                  </h2>
                  <span className="text-xs font-semibold text-[#64748b]">
                    {metric === 'amount' ? '금액 순' : '건수 순'}
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] mb-4">
                  {isQuotes ? '견적 문의가 가장 많은 상위 고객사' : '실제 구매액이 가장 큰 핵심 매출 고객사 (Key Accounts)'}
                </p>

                <div className="space-y-2">
                  {rankedCompanies.length > 0 ? (
                    rankedCompanies.map((item, index) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#f8fafc] bg-[#f8fafc] px-3.5 py-2.5 text-xs hover:bg-[#f1f5f9] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                              index === 0
                                ? 'bg-amber-100 text-amber-800'
                                : index === 1
                                ? 'bg-slate-200 text-slate-800'
                                : index === 2
                                ? 'bg-amber-50 text-amber-900'
                                : 'bg-white text-[#64748b] border border-[#e2e8f0]'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="font-bold text-[#1e293b] truncate">{item.label}</span>
                        </div>
                        <span className="shrink-0 font-extrabold text-[#0f172a]">
                          {metric === 'amount' ? formatWon(item.amount) : `${item.count}건`}
                          <span className="text-[#94a3b8] font-normal ml-1.5 text-[11px]">
                            {metric === 'amount' ? `(${item.count}건)` : `(${formatWon(item.amount)})`}
                          </span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#94a3b8] py-4 text-center">데이터가 없습니다.</p>
                  )}
                </div>
              </section>
            </div>

            {/* ── [영업 담당자별 실적 & 주력 제품 모델 랭킹] ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 영업 담당자별 실적 */}
              <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-[#0f172a]">
                    {isQuotes ? t(UI.quoteDashboardRepQuotes) : t(UI.quoteDashboardRepOrders)}
                  </h2>
                  <span className="text-xs font-semibold text-[#64748b]">개인별 성과</span>
                </div>
                <p className="text-xs text-[#94a3b8] mb-4">
                  {isQuotes ? '영업 담당자별 견적 발행 실적' : '영업 담당자별 실제 수주 성사 실적 및 전환율'}
                </p>

                <div className="space-y-2">
                  {rankedAuthors.length > 0 ? (
                    rankedAuthors.map((item, index) => {
                      const authorTotalQuotes = categoryRecords.filter((r) => r.authorName === item.label);
                      const repWinRate =
                        authorTotalQuotes.length > 0
                          ? Math.round((item.count / authorTotalQuotes.length) * 100)
                          : 0;

                      return (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#f8fafc] bg-[#f8fafc] px-3.5 py-2.5 text-xs hover:bg-[#f1f5f9] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-black text-indigo-700">
                              {index + 1}
                            </span>
                            <span className="font-bold text-[#1e293b] truncate">{item.label}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-extrabold text-[#0f172a]">
                              {metric === 'amount' ? formatWon(item.amount) : `${item.count}건`}
                            </span>
                            <span className="text-[#64748b] ml-1.5 text-[11px]">
                              {isQuotes
                                ? `(${item.count}건)`
                                : `(${item.count}건${repWinRate > 0 ? ` · 수주율 ${repWinRate}%` : ''})`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-[#94a3b8] py-4 text-center">담당자 정보가 없습니다.</p>
                  )}
                </div>
              </section>

              {/* 주력 제품 모델 랭킹 */}
              <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-[#0f172a]">
                    {isQuotes ? t(UI.quoteDashboardTopProductsQuotes) : t(UI.quoteDashboardTopProductsOrders)}
                  </h2>
                  <span className="text-xs font-semibold text-[#64748b]">대표 모델</span>
                </div>
                <p className="text-xs text-[#94a3b8] mb-4">
                  {isQuotes ? '견적서에 가장 빈번하게 제안된 대표 모델' : '실제 수주로 이어진 베스트셀러 모델'}
                </p>

                <div className="space-y-2">
                  {rankedProducts.length > 0 ? (
                    rankedProducts.map((item, index) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#f8fafc] bg-[#f8fafc] px-3.5 py-2.5 text-xs hover:bg-[#f1f5f9] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[10px] font-black text-cyan-700">
                            {index + 1}
                          </span>
                          <span className="font-bold text-[#1e293b] truncate">{item.label}</span>
                        </div>
                        <span className="shrink-0 font-extrabold text-[#0f172a]">
                          {metric === 'amount' ? formatWon(item.amount) : `${item.count}건`}
                          <span className="text-[#94a3b8] font-normal ml-1.5 text-[11px]">
                            {metric === 'amount' ? `(${item.count}건)` : `(${formatWon(item.amount)})`}
                          </span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#94a3b8] py-4 text-center">제품 정보가 없습니다.</p>
                  )}
                </div>
              </section>
            </div>

            {/* ── [품목 상세 분석: 견적서/발주서 내 개별 품목 단위 집계] ── */}
            {statsRecords.length > 0 && itemAnalysis.length > 0 && (
              <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h2 className="text-base font-bold text-[#0f172a]">
                    {isQuotes ? t(UI.quoteDashboardItemsQuotes) : t(UI.quoteDashboardItemsOrders)}
                  </h2>
                  <span className="text-xs font-semibold text-[#64748b]">
                    {isQuotes ? '견적서 세부 품목' : '발주서 세부 품목'}
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] mb-4">
                  {isQuotes
                    ? '견적서에 포함된 개별 품목의 제안 수량, 제안 금액, 평균 단가를 상세 집계한 내역입니다.'
                    : '실제 발주 확정된 건들의 개별 품목 판매 수량, 실질 매출액, 평균 납품 단가입니다.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {itemAnalysis.slice(0, 9).map((item) => (
                    <div
                      key={item.name}
                      className="rounded-xl border border-[#e2e8f0] bg-[#fafbfc] p-3.5 hover:shadow-xs transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-[#1e293b] truncate" title={item.name}>
                          {item.name}
                        </span>
                        <span className="text-[10px] font-bold text-[#64748b] bg-white border border-[#e2e8f0] px-2 py-0.5 rounded-full shrink-0">
                          {item.count}건
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-sm font-black text-[#0f172a]">{formatWon(item.amount)}</span>
                        <span className="text-xs font-semibold text-[#64748b]">
                          수량 {item.quantity.toLocaleString('ko-KR')}개
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-[#e2e8f0] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isQuotes
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                          }`}
                          style={{ width: `${(item.amount / maxItemAmount) * 100}%` }}
                        />
                      </div>
                      {item.quantity > 0 && (
                        <p className="mt-1.5 text-[10px] text-[#94a3b8]">
                          평균 단가: {formatWonFull(item.amount / item.quantity)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── [영업 파이프라인 관리 / 최근 수주 내역] ── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* 진행 중 파이프라인 or 최근 수주 내역 (8열) */}
              <section className="xl:col-span-8 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-[#0f172a]">
                    {isQuotes ? t(UI.quoteDashboardPipelineOpen) : t(UI.quoteDashboardRecentOrders)}
                  </h2>
                  <span className="text-xs font-semibold text-[#64748b]">
                    {isQuotes ? '영업 팔로업 타깃' : (hasOrderFile ? 'ERP 수주 내역' : '최근 성사 내역')}
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] mb-4">
                  {isQuotes
                    ? '아직 발주되지 않은 고액 견적 파이프라인입니다. 적극적인 영업 팔로업을 진행하세요.'
                    : (hasOrderFile ? '최신 발주 내역 파일로부터 수집된 최근 수주 내역입니다.' : '최근 수주가 확정된 주요 발주 내역입니다.')}
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e2e8f0] text-[#64748b] bg-[#f8fafc]">
                        <th className="py-2.5 px-3 font-semibold">고객사</th>
                        <th className="py-2.5 px-3 font-semibold">제품명</th>
                        <th className="py-2.5 px-3 font-semibold text-right">
                          {isQuotes ? '견적 금액' : '수주 금액'}
                        </th>
                        <th className="py-2.5 px-3 font-semibold">담당자</th>
                        <th className="py-2.5 px-3 font-semibold text-center">일자</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {(isQuotes ? openPipelineQuotes : recentOrders).map((record, index) => (
                        <tr key={`${record.quoteNumber}-${index}`} className="hover:bg-[#f8fafc] transition-colors">
                          <td className="py-2.5 px-3 font-bold text-[#1e293b]">{record.company}</td>
                          <td className="py-2.5 px-3 text-[#475569] truncate max-w-[200px]" title={record.product}>
                            {record.product}
                          </td>
                          <td className="py-2.5 px-3 font-black text-right text-[#0f172a]">
                            {formatWonFull(record.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-[#64748b]">{record.authorName || '-'}</td>
                          <td className="py-2.5 px-3 text-center text-[#94a3b8] font-medium whitespace-nowrap">
                            {record.dateStr ? record.dateStr : record.month ? `${record.month}월` : '-'}
                          </td>
                        </tr>
                      ))}
                      {(isQuotes ? openPipelineQuotes : recentOrders).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#94a3b8]">
                            내역이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 고객 리텐션 분석 (휴면 고객 or 발주 이탈 우려 거래처) (4열) */}
              <section
                className={`xl:col-span-4 rounded-2xl border p-5 shadow-sm ${
                  isQuotes
                    ? 'border-amber-200 bg-amber-50/40'
                    : 'border-rose-200 bg-rose-50/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className={`text-base font-bold ${isQuotes ? 'text-amber-950' : 'text-rose-950'}`}>
                    {isQuotes ? t(UI.quoteDashboardDormantQuotes) : t(UI.quoteDashboardAtRiskOrders)}
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isQuotes ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isQuotes ? '견적 재요청 필요' : '이탈 주의'}
                  </span>
                </div>
                <p className={`text-xs mb-4 ${isQuotes ? 'text-amber-800' : 'text-rose-800'}`}>
                  {isQuotes
                    ? `이전 연도에 견적이 있었으나 ${selectedYear}년도에 견적 요청이 없는 고객사입니다.`
                    : `이전 연도에 실제 발주(구매)가 있었으나 ${selectedYear}년도에 아직 발주가 없는 고객사입니다.`}
                </p>

                <div className="space-y-2">
                  {customerRetentionList.length > 0 ? (
                    customerRetentionList.map((item) => (
                      <div
                        key={item.company}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white/90 border border-black/5 px-3 py-2 text-xs"
                      >
                        <span className="font-bold text-[#1e293b] truncate">{item.company}</span>
                        <span className="shrink-0 text-[11px] font-semibold text-[#64748b]">
                          마지막 {item.lastYear}.{item.lastMonth} ({formatWon(item.totalAmount)})
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className={`text-xs py-4 text-center ${isQuotes ? 'text-amber-800' : 'text-rose-800'}`}>
                      해당 고객사가 없습니다.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
