import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '../context/LangContext';
import { UI } from '../i18n/ui';
import { fetchLedger, type LedgerRow } from '../utils/appsScriptBridge';

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

function formatWon(value: number) {
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

  return rows.map((row) => {
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
    };
  }).filter((record) => record.quoteNumber || record.company !== '미입력');
}

function aggregate(records: QuoteRecord[], key: 'company' | 'product' | 'category') {
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
  const left = 28;
  const right = 18;
  const top = 18;
  const bottom = 30;
  return values.map((value, index) => {
    const x = left + (index * (width - left - right)) / Math.max(values.length - 1, 1);
    const y = height - bottom - (value / max) * (height - top - bottom);
    return `${x},${y}`;
  }).join(' ');
}

function monthTotals(records: QuoteRecord[], metric: Metric) {
  return Array.from({ length: 12 }, (_, index) => records
    .filter((record) => record.month === index + 1)
    .reduce((sum, record) => sum + (metric === 'amount' ? record.amount : 1), 0));
}

function teamColor(index: number) {
  return ['#2563eb', '#0f766e', '#c2410c', '#7c3aed'][index % 4];
}

export default function DashboardPage({ onBack, departments, department, isAdmin }: Props) {
  const t = useT();
  const currentYear = new Date().getFullYear();
  const [selectedDepartment, setSelectedDepartment] = useState(isAdmin ? '전체' : department);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('quotes');
  const [metric, setMetric] = useState<Metric>('amount');
  const [categories, setCategories] = useState<string[]>(CATEGORY_OPTIONS);
  const [records, setRecords] = useState<QuoteRecord[]>([]);
  const [history, setHistory] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetDepartments = useMemo(
    () => (selectedDepartment === '전체' ? departments : [selectedDepartment]),
    [departments, selectedDepartment],
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const years = new Set<number>();
      const selectedResults = await Promise.all(targetDepartments.map(async (target) => {
        const result = await fetchLedger(selectedYear, target);
        if (!result.success) throw new Error(`${target}: ${result.message || '대장을 불러오지 못했습니다.'}`);
        (result.availableYears ?? []).forEach((year) => years.add(year));
        return { department: target, result };
      }));

      const currentRecords = selectedResults.flatMap(({ department: target, result }) => buildRecords(target, selectedYear, result.headers ?? [], result.rows ?? []));
      setRecords(currentRecords);
      setAvailableYears([...years].filter((year) => year >= 2000 && year <= currentYear).sort((a, b) => b - a));

      // 고객 휴면 분석용: 선택 연도 이전 대장을 함께 읽는다.
      const historicalYears = [...years].filter((year) => year < selectedYear).slice(0, 5);
      const historicalResults = await Promise.all(historicalYears.flatMap((year) => targetDepartments.map(async (target) => {
        const result = await fetchLedger(year, target);
        return { department: target, year, result };
      })));
      setHistory(historicalResults.flatMap(({ department: target, year, result }) => buildRecords(target, year, result.headers ?? [], result.rows ?? [])));
    } catch (err) {
      setRecords([]);
      setHistory([]);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [currentYear, selectedYear, targetDepartments]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const filteredRecords = useMemo(() => records.filter((record) => categories.includes(record.category)), [categories, records]);
  const totalAmount = filteredRecords.reduce((sum, record) => sum + record.amount, 0);
  const orderedRecords = filteredRecords.filter((record) => record.ordered);
  const monthly = monthTotals(filteredRecords, metric);
  const rankedCompanies = [...aggregate(filteredRecords, 'company')].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).slice(0, 8);
  const rankedProducts = [...aggregate(filteredRecords, 'product')].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).slice(0, 8);
  const rankedCategories = [...aggregate(filteredRecords, 'category')].sort((a, b) => b.amount - a.amount);

  const teamRows = departments.map((team) => {
    const teamRecords = filteredRecords.filter((record) => record.department === team);
    const teamOrders = teamRecords.filter((record) => record.ordered);
    return { team, count: teamRecords.length, amount: teamRecords.reduce((sum, record) => sum + record.amount, 0), orders: teamOrders.length };
  });

  const dormantClients = useMemo(() => {
    const currentCompanies = new Set(filteredRecords.map((record) => record.company));
    const allCompanies = new Set(history.map((record) => record.company));
    return [...allCompanies]
      .filter((company) => !currentCompanies.has(company))
      .map((company) => {
        const past = history.filter((record) => record.company === company);
        const lastQuote = [...past].sort((a, b) => `${b.year}-${b.month}`.localeCompare(`${a.year}-${a.month}`))[0];
        return { company, lastYear: lastQuote?.year ?? 0, lastMonth: lastQuote?.month ?? 0, amount: past.reduce((sum, record) => sum + record.amount, 0) };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filteredRecords, history]);

  function toggleCategory(category: string) {
    setCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] px-3 sm:px-6 py-5">
      <div className="max-w-[1680px] mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="rounded-lg bg-[#191919] px-3 py-1.5 text-sm font-medium text-white">← {t(UI.back)}</button>
            <div><p className="text-[10px] font-bold tracking-[0.18em] text-blue-600">CIMON INSIGHT</p><h1 className="text-xl sm:text-2xl font-bold text-[#191919]">{t(UI.quoteDashboardTitle)}</h1></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)} className="rounded-lg border border-[#d8dde5] bg-white px-3 py-2 text-sm"><option value="전체">전체 부서</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select>}
            {!isAdmin && <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">{department}</span>}
            {availableYears.length > 0 && <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className="rounded-lg border border-[#d8dde5] bg-white px-3 py-2 text-sm">{availableYears.map((year) => <option key={year} value={year}>{year}{t(UI.quoteYearSuffix)}</option>)}</select>}
            <button type="button" onClick={() => void loadDashboard()} className="rounded-lg border border-[#d8dde5] bg-white px-3 py-2 text-sm text-[#555]">{t(UI.quoteDashboardRefresh)}</button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-[#dfe4eb] mb-4">
          <button type="button" onClick={() => setActiveTab('quotes')} className={`px-4 py-2 text-sm font-bold border-b-2 ${activeTab === 'quotes' ? 'border-blue-600 text-blue-700' : 'border-transparent text-[#8a94a6]'}`}>견적 분석</button>
          <button type="button" onClick={() => setActiveTab('orders')} className={`px-4 py-2 text-sm font-bold border-b-2 ${activeTab === 'orders' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-[#8a94a6]'}`}>발주 분석</button>
        </div>

        <section className="rounded-2xl border border-[#e3e7ee] bg-white p-4 mb-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-[#8a94a6]">필터 조합</p><p className="text-xs text-[#a4acb8] mt-1">제품군과 지표를 조합해 영업 현황을 확인하세요.</p></div><div className="flex items-center gap-1 rounded-lg bg-[#f1f4f8] p-1"><button type="button" onClick={() => setMetric('count')} className={`rounded-md px-3 py-1 text-xs font-bold ${metric === 'count' ? 'bg-white text-blue-700 shadow-sm' : 'text-[#7c8796]'}`}>견적 건수</button><button type="button" onClick={() => setMetric('amount')} className={`rounded-md px-3 py-1 text-xs font-bold ${metric === 'amount' ? 'bg-white text-blue-700 shadow-sm' : 'text-[#7c8796]'}`}>금액</button></div></div>
          <div className="flex flex-wrap gap-2 mt-3">{CATEGORY_OPTIONS.map((category) => <label key={category} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer ${categories.includes(category) ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-[#e1e5eb] text-[#9aa3af]'}`}><input type="checkbox" checked={categories.includes(category)} onChange={() => toggleCategory(category)} />{category}</label>)}</div>
        </section>

        {loading && <div className="rounded-2xl border border-[#e3e7ee] bg-white p-12 text-center text-sm text-[#888]">{t(UI.quoteDashboardLoading)}</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">{error}</div>}

        {!loading && !error && <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[['견적 건수', `${filteredRecords.length.toLocaleString('ko-KR')}건`], ['견적 금액', formatWon(totalAmount)], ['발주 완료', `${orderedRecords.length.toLocaleString('ko-KR')}건`], ['발주율', `${filteredRecords.length ? Math.round((orderedRecords.length / filteredRecords.length) * 100) : 0}%`]].map(([label, value], index) => <div key={label} className="rounded-2xl border border-[#e3e7ee] bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-[#8a94a6]">{label}</p><p className={`mt-2 text-xl sm:text-2xl font-bold ${index === 2 ? 'text-emerald-700' : index === 3 ? 'text-violet-700' : 'text-[#191919]'}`}>{value}</p></div>)}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            <section className="rounded-2xl border border-[#e3e7ee] bg-white p-5 shadow-sm"><div className="flex justify-between items-center mb-3"><h2 className="font-bold text-[#242b36]">월별 {metric === 'amount' ? '견적 금액' : '견적 건수'} 추이</h2><span className="text-xs text-[#9aa3af]">{selectedYear}년</span></div><div className="overflow-x-auto"><svg viewBox="0 0 760 250" className="w-full min-w-[620px] h-60"><polyline fill="none" stroke={activeTab === 'orders' ? '#059669' : '#2563eb'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={linePoints(activeTab === 'orders' ? monthTotals(filteredRecords.filter((record) => record.ordered), metric) : monthly)} />{Array.from({ length: 12 }, (_, index) => { const values = activeTab === 'orders' ? monthTotals(filteredRecords.filter((record) => record.ordered), metric) : monthly; const max = Math.max(...values, 1); const x = 28 + (index * 714) / 11; const y = 218 - (values[index] / max) * 190; return <g key={index}><circle cx={x} cy={y} r="4" fill="white" stroke={activeTab === 'orders' ? '#059669' : '#2563eb'} strokeWidth="2"/><text x={x} y="242" textAnchor="middle" fontSize="11" fill="#8a94a6">{index + 1}월</text></g>; })}</svg></div></section>
            <section className="rounded-2xl border border-[#e3e7ee] bg-white p-5 shadow-sm"><h2 className="font-bold text-[#242b36] mb-4">팀별 {activeTab === 'orders' ? '발주' : '견적'} 비교</h2><div className="space-y-4">{teamRows.map((item, index) => { const max = Math.max(...teamRows.map((row) => metric === 'amount' ? row.amount : row.count), 1); const value = metric === 'amount' ? item.amount : item.count; return <div key={item.team}><div className="flex justify-between text-xs mb-1"><span className="font-bold text-[#4b5563]">{item.team}</span><span className="text-[#697386]">{metric === 'amount' ? formatWon(value) : `${value}건`} · 발주 {item.orders}건</span></div><div className="h-4 rounded-full bg-[#edf1f5] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: teamColor(index) }}/></div></div>; })}</div></section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <section className="rounded-2xl border border-[#e3e7ee] bg-white p-5 shadow-sm"><h2 className="font-bold text-[#242b36] mb-4">카테고리별 {metric === 'amount' ? '금액' : '견적 건수'}</h2><div className="space-y-3">{rankedCategories.map((item, index) => { const max = Math.max(...rankedCategories.map((row) => metricValue(row, metric)), 1); return <div key={item.label}><div className="flex justify-between text-xs"><span><b className="mr-2 text-blue-600">{index + 1}</b>{item.label}</span><span>{metric === 'amount' ? formatWon(item.amount) : `${item.count}건`}</span></div><div className="mt-1 h-2 rounded-full bg-[#edf1f5]"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(metricValue(item, metric) / max) * 100}%` }}/></div></div>; })}</div></section>
            <section className="rounded-2xl border border-[#e3e7ee] bg-white p-5 shadow-sm"><h2 className="font-bold text-[#242b36] mb-4">상위 업체 ({metric === 'amount' ? '견적 금액' : '견적 건수'})</h2><div className="space-y-2">{rankedCompanies.map((item, index) => <div key={item.label} className="flex justify-between gap-3 border-b border-[#f1f3f6] pb-2 text-xs"><span className="truncate"><b className="mr-2 text-violet-600">{String(index + 1).padStart(2, '0')}</b>{item.label}</span><span className="shrink-0 text-[#697386]">{metric === 'amount' ? formatWon(item.amount) : `${item.count}건`}</span></div>)}</div></section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-2xl border border-[#e3e7ee] bg-white p-5 shadow-sm"><h2 className="font-bold text-[#242b36] mb-4">상위 제품 ({metric === 'amount' ? '견적 금액' : '견적 건수'})</h2><div className="space-y-2">{rankedProducts.map((item, index) => <div key={item.label} className="flex justify-between gap-3 border-b border-[#f1f3f6] pb-2 text-xs"><span className="truncate"><b className="mr-2 text-cyan-600">{String(index + 1).padStart(2, '0')}</b>{item.label}</span><span className="shrink-0 text-[#697386]">{metric === 'amount' ? formatWon(item.amount) : `${item.count}건`}</span></div>)}</div></section>
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><h2 className="font-bold text-amber-900 mb-1">최근 활동이 없는 업체</h2><p className="text-[11px] text-amber-800 mb-4">이전 연도에 견적이 있었지만 {selectedYear}년에 견적이 없는 업체</p><div className="space-y-2">{dormantClients.length ? dormantClients.map((item) => <div key={item.company} className="flex justify-between gap-3 border-b border-amber-100 pb-2 text-xs"><span className="truncate font-semibold text-amber-900">{item.company}</span><span className="shrink-0 text-amber-800">마지막 {item.lastYear}.{item.lastMonth} · {formatWon(item.amount)}</span></div>) : <p className="text-xs text-amber-800">해당 업체가 없습니다.</p>}</div></section>
          </div>
        </>}
      </div>
    </div>
  );
}
