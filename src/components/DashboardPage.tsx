import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../context/LangContext';
import { UI } from '../i18n/ui';
import {
  fetchLedger,
  fetchDashboardStats,
  type DashboardStatsRecord,
  type LedgerRow,
} from '../utils/appsScriptBridge';

type DashboardTab = 'quotes' | 'orders';
type Metric = 'count' | 'amount';

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

const CATEGORY_OPTIONS = ['PLC', 'IPC / IAC', 'SCADA', 'XPANEL'];

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
  return value.trim() || '기타';
}

function buildRecords(department: string, year: number, headers: string[], rows: LedgerRow[]): QuoteRecord[] {
  const quoteIndex = findColumn(headers, ['견적번호']);
  const yearIndex = findColumn(headers, ['연도', '년도']);
  const monthIndex = findColumn(headers, ['월']);
  const companyIndex = findColumn(headers, ['업체명', '회사명']);
  const productIndex = findColumn(headers, ['제품명', '품명', '모델명']);
  const categoryIndex = findColumn(headers, ['제품 항목', '제품군', '카테고리']);
  const amountIndex = findColumn(headers, ['견적 금액', '견적금액', '총 견적금액', '금액']);
  const orderIndex = findColumn(headers, ['발주']);
  const authorIndex = findColumn(headers, ['작성자', '작성자이메일', '이메일']);

  return rows
    .filter((row) => !row.struck) // 취소선(라인삭제)된 건은 통계 집계에서 제외
    .map((row) => {
      const month = Number(valueAt(row, monthIndex).replace(/\D/g, ''));
      return {
        department,
        year: Number(valueAt(row, yearIndex)) || year,
        month: month >= 1 && month <= 12 ? month : 0,
        quoteNumber: valueAt(row, quoteIndex).trim(),
        company: valueAt(row, companyIndex).trim() || '미입력',
        product: valueAt(row, productIndex).trim() || '미입력',
        category: normalizeCategory(valueAt(row, categoryIndex)),
        amount: parseAmount(valueAt(row, amountIndex)),
        ordered: orderedValue(valueAt(row, orderIndex)),
        authorName: authorIndex >= 0 ? valueAt(row, authorIndex).trim() : '',
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

function linePoints(values: number[], width = 760, height = 230) {
  const max = Math.max(...values, 1);
  const left = 32;
  const right = 24;
  const top = 20;
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

function teamColor(index: number) {
  return ['#2563eb', '#0f766e', '#d97706', '#7c3aed'][index % 4];
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
  const [records, setRecords] = useState<QuoteRecord[]>([]);
  const [history, setHistory] = useState<QuoteRecord[]>([]);
  const [statsRecords, setStatsRecords] = useState<DashboardStatsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; label: string; value: string } | null>(null);
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
        buildRecords(target, selectedYear, result.headers ?? [], result.rows ?? []),
      );
      setRecords(currentRecords);
      setAvailableYears([...years].filter((year) => year >= 2000 && year <= currentYear).sort((a, b) => b - a));

      // 통계 JSON (품목 상세) 조회
      const statsResults = await Promise.all(targetDepartments.map(async (target) => {
        try {
          const result = await fetchDashboardStats(target);
          return result && result.success && result.records ? result.records : [];
        } catch {
          return [];
        }
      }));
      setStatsRecords(statsResults.flat());

      // 과거 연도 대장 읽기 (이탈/재구매 분석용)
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
        buildRecords(target, year, result.headers ?? [], result.rows ?? []),
      ));
    } catch (err) {
      setRecords([]);
      setHistory([]);
      setStatsRecords([]);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [currentYear, selectedYear, targetDepartments]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // 카테고리 필터링된 기본 레코드 (전체 견적 파이프라인)
  const categoryRecords = useMemo(
    () => records.filter((record) => categories.includes(record.category)),
    [categories, records],
  );

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
  // 견적 지표
  const totalQuoteAmount = useMemo(() => categoryRecords.reduce((sum, r) => sum + r.amount, 0), [categoryRecords]);
  const totalQuoteCount = categoryRecords.length;
  const avgQuoteAmount = totalQuoteCount > 0 ? totalQuoteAmount / totalQuoteCount : 0;
  const uniqueQuotedClients = useMemo(() => new Set(categoryRecords.map((r) => r.company).filter(Boolean)).size, [categoryRecords]);

  // 수주 지표
  const totalOrderAmount = useMemo(() => orderRecords.reduce((sum, r) => sum + r.amount, 0), [orderRecords]);
  const totalOrderCount = orderRecords.length;
  const avgOrderAmount = totalOrderCount > 0 ? totalOrderAmount / totalOrderCount : 0;
  const uniquePayingClients = useMemo(() => new Set(orderRecords.map((r) => r.company).filter(Boolean)).size, [orderRecords]);

  // 전환율 (Win Rate)
  const winRateCount = totalQuoteCount > 0 ? Math.round((totalOrderCount / totalQuoteCount) * 1000) / 10 : 0;
  const winRateAmount = totalQuoteAmount > 0 ? Math.round((totalOrderAmount / totalQuoteAmount) * 1000) / 10 : 0;

  // 월별 추이 데이터
  const monthly = useMemo(() => monthTotals(currentRecords, metric), [currentRecords, metric]);
  const monthlyPoints = useMemo(() => linePoints(monthly), [monthly]);

  // 차원별 집계 및 랭킹
  const rankedCompanies = useMemo(
    () => [...aggregate(currentRecords, 'company')].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).slice(0, 8),
    [currentRecords, metric],
  );
  const rankedProducts = useMemo(
    () => [...aggregate(currentRecords, 'product')].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).slice(0, 8),
    [currentRecords, metric],
  );
  const rankedCategories = useMemo(
    () => [...aggregate(currentRecords, 'category')].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)),
    [currentRecords, metric],
  );
  const rankedAuthors = useMemo(
    () => [...aggregate(currentRecords, 'authorName')]
      .filter((item) => item.label && item.label !== '미입력')
      .sort((a, b) => metricValue(b, metric) - metricValue(a, metric)),
    [currentRecords, metric],
  );

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

  // 발주 탭: 최근 수주 확정 건 내역 (최근 발주)
  const recentOrders = useMemo(() => {
    return [...orderRecords]
      .sort((a, b) => {
        if (b.month !== a.month) return b.month - a.month;
        return b.amount - a.amount;
      })
      .slice(0, 8);
  }, [orderRecords]);

  // 고객 분석: 견적 탭(견적 문의 중단) vs 발주 탭(실제 발주 이탈 우려 거래처)
  const customerRetentionList = useMemo(() => {
    if (activeTab === 'quotes') {
      // 견적 문의 중단: 이전 연도 견적이 있었으나 금년 견적 요청이 없는 거래처
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
      // 발주 이탈 우려: 이전 연도 실제 '발주' 이력이 있었으나 금년 '발주'가 0건인 핵심 거래선
      const currentOrderClients = new Set(orderRecords.map((r) => r.company));
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
  }, [activeTab, categoryRecords, history, orderRecords]);

  // 통계 JSON 기반 품목 상세 (견적 탭: 전체 견적 품목 / 발주 탭: 실제 발주된 품목만 필터링)
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

  function handleTrendHover(event: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const svg = trendSvgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const scaleX = 760 / rect.width;
    const svgX = mouseX * scaleX;
    let closest = monthlyPoints[0];
    let closestDist = Infinity;
    monthlyPoints.forEach((point) => {
      const dist = Math.abs(point.x - svgX);
      if (dist < closestDist) {
        closest = point;
        closestDist = dist;
      }
    });
    const monthIndex = monthlyPoints.findIndex((point) => point.x === closest.x);
    setHoverPoint({
      x: closest.x,
      y: closest.y,
      label: `${monthIndex + 1}월`,
      value: metric === 'amount' ? formatWonFull(closest.value) : `${closest.value.toLocaleString('ko-KR')}건`,
    });
  }

  // 활성 탭 테마 색상 정의
  const isQuotes = activeTab === 'quotes';
  const themeMainColor = isQuotes ? '#2563eb' : '#059669';
  const themeGradientId = isQuotes ? 'quoteGradient' : 'orderGradient';

  return (
    <div className="min-h-screen bg-[#f5f7fa] px-3 sm:px-6 py-6 font-sans">
      <div className="max-w-[1680px] mx-auto space-y-5">
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

          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-[#64748b]">
              {isQuotes ? t(UI.quoteDashboardQuotesSub) : t(UI.quoteDashboardOrdersSub)}
            </p>
          </div>
        </div>

        {/* 제품군 및 지표 컨트롤 필터 바 */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#64748b] mr-1">제품군 필터:</span>
            {CATEGORY_OPTIONS.map((category) => {
              const active = categories.includes(category);
              return (
                <button
                  type="button"
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
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
              className="text-[11px] font-medium text-[#64748b] underline ml-2 hover:text-[#1e293b]"
            >
              {categories.length === CATEGORY_OPTIONS.length ? '선택 해제' : '전체 선택'}
            </button>
          </div>

          {/* 지표 토글 (견적 탭 vs 발주 탭 용어 철저 분리) */}
          <div className="flex items-center gap-1.5 rounded-xl bg-[#f1f5f9] p-1.5 border border-[#e2e8f0]">
            <span className="text-[11px] font-bold text-[#64748b] px-2">지표 선택:</span>
            <button
              type="button"
              onClick={() => setMetric('amount')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all ${
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
              className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all ${
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
                // ── 견적 분석 탭 KPI ──
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
                    <p className="text-[11px] text-[#64748b] mt-1">총 영업 제안 건수</p>
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
                // ── 발주(수주) 분석 탭 KPI ──
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
                    <p className="text-[11px] text-[#64748b] mt-1">확정 계약 건수</p>
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

            {/* ── [차트 섹션: 월별 추이 & 영업팀별 비교] ── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* 월별 실적 추이 라인 차트 */}
              <section className="xl:col-span-7 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#0f172a]">
                      {isQuotes ? t(UI.quoteDashboardMonthlyQuotes) : t(UI.quoteDashboardMonthlyOrders)}
                    </h2>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      {selectedYear}년도 {metric === 'amount' ? '금액(원)' : '건수(건)'} 기준 월별 추이
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#475569]">
                      <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: themeMainColor }} />
                      {isQuotes ? (metric === 'amount' ? '견적 금액' : '견적 건수') : (metric === 'amount' ? '수주 금액' : '수주 건수')}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto relative pt-2">
                  <svg
                    ref={trendSvgRef}
                    viewBox="0 0 760 250"
                    className="w-full min-w-[620px] h-60 cursor-crosshair select-none"
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
                    <line x1="32" y1="40" x2="736" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="32" y1="100" x2="736" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="32" y1="160" x2="736" y2="160" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="32" y1="218" x2="736" y2="218" stroke="#e2e8f0" strokeWidth="1" />

                    {/* 곡선 아래 면 채우기 */}
                    <polygon
                      fill={`url(#${themeGradientId})`}
                      points={`32,218 ${monthlyPoints.map((p) => `${p.x},${p.y}`).join(' ')} ${monthlyPoints[monthlyPoints.length - 1].x},218`}
                    />

                    {/* 라인 추이선 */}
                    <polyline
                      fill="none"
                      stroke={themeMainColor}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={monthlyPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    />

                    {/* 데이터 포인트 점 및 월 라벨 */}
                    {monthlyPoints.map((point, index) => (
                      <g key={index}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="4.5"
                          fill="white"
                          stroke={themeMainColor}
                          strokeWidth="2.5"
                        />
                        <text
                          x={point.x}
                          y="238"
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="600"
                          fill="#64748b"
                        >
                          {index + 1}월
                        </text>
                      </g>
                    ))}
                  </svg>

                  {/* 호버 툴팁 */}
                  {hoverPoint && (
                    <div
                      className="pointer-events-none absolute rounded-xl bg-[#0f172a] px-3 py-2 text-xs font-bold text-white shadow-xl border border-slate-700"
                      style={{
                        left: `${hoverPoint.x}px`,
                        top: `${hoverPoint.y}px`,
                        transform: 'translate(-50%, -125%)',
                      }}
                    >
                      <div className="flex items-center gap-1.5 text-blue-300">
                        <span>●</span>
                        <span>{hoverPoint.label} 실적</span>
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
                      // 발주 탭일 경우 해당 담당자의 전체 견적 대비 수주율 계산
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
                                : `(${item.count}건 · 수주율 ${repWinRate}%)`}
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
                    {isQuotes ? '영업 팔로업 타깃' : '최근 성사 내역'}
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] mb-4">
                  {isQuotes
                    ? '아직 발주되지 않은 고액 견적 파이프라인입니다. 적극적인 영업 팔로업을 진행하세요.'
                    : '최근 수주가 확정된 주요 발주 내역입니다.'}
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
                        <th className="py-2.5 px-3 font-semibold text-center">시기</th>
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
                          <td className="py-2.5 px-3 text-center text-[#94a3b8] font-medium">
                            {record.month ? `${record.month}월` : '-'}
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
