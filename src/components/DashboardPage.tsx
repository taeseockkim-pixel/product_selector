import { useCallback, useEffect, useState } from 'react';
import { useT } from '../context/LangContext';
import { UI } from '../i18n/ui';
import { fetchLedger, type LedgerRow } from '../utils/appsScriptBridge';

interface Props {
  onBack: () => void;
  departments: string[];
}

interface DashboardQuote {
  department: string;
  quoteNumber: string;
  company: string;
  product: string;
  category: string;
  amount: number;
  ordered: boolean;
  month: number;
}

interface TeamStats {
  department: string;
  quotes: number;
  amount: number;
  ordered: number;
  monthly: number[];
}

function findColumn(headers: string[], labels: string[]) {
  return headers.findIndex((header) => labels.some((label) => header.includes(label)));
}

function valueAt(row: LedgerRow, index: number) {
  return index >= 0 ? row.values[index] ?? '' : '';
}

function amountValue(value: string) {
  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isOrdered(value: string) {
  return ['발주', '완료', '예', 'Y', 'O', 'TRUE'].includes(value.trim().toUpperCase());
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')} 원`;
}

function formatCount(value: number) {
  return value.toLocaleString('ko-KR');
}

function buildQuotes(department: string, headers: string[], rows: LedgerRow[]): DashboardQuote[] {
  const quoteIndex = findColumn(headers, ['견적번호']);
  const companyIndex = findColumn(headers, ['업체명', '회사명']);
  const productIndex = findColumn(headers, ['제품명', '품명', '모델명']);
  const categoryIndex = findColumn(headers, ['제품 항목', '제품군', '카테고리']);
  const amountIndex = findColumn(headers, ['견적 금액', '견적금액', '총 견적금액', '금액']);
  const orderIndex = findColumn(headers, ['발주']);
  const monthIndex = findColumn(headers, ['월']);

  return rows.map((row) => {
    const quoteNumber = valueAt(row, quoteIndex).trim();
    const month = Number(valueAt(row, monthIndex).replace(/\D/g, ''));
    return {
      department,
      quoteNumber,
      company: valueAt(row, companyIndex).trim(),
      product: valueAt(row, productIndex).trim(),
      category: valueAt(row, categoryIndex).trim() || '미분류',
      amount: amountValue(valueAt(row, amountIndex)),
      ordered: isOrdered(valueAt(row, orderIndex)),
      month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : 0,
    };
  }).filter((quote) => quote.quoteNumber || quote.company || quote.product);
}

function teamStats(department: string, quotes: DashboardQuote[]): TeamStats {
  const monthly = Array.from({ length: 12 }, () => 0);
  quotes.forEach((quote) => {
    if (quote.month > 0) monthly[quote.month - 1] += quote.amount;
  });
  return {
    department,
    quotes: quotes.length,
    amount: quotes.reduce((sum, quote) => sum + quote.amount, 0),
    ordered: quotes.filter((quote) => quote.ordered).length,
    monthly,
  };
}

function rankedValues(quotes: DashboardQuote[], key: 'product' | 'company') {
  const totals = new Map<string, { count: number; amount: number }>();
  quotes.forEach((quote) => {
    const value = quote[key] || '미입력';
    const previous = totals.get(value) ?? { count: 0, amount: 0 };
    totals.set(value, { count: previous.count + 1, amount: previous.amount + quote.amount });
  });
  return [...totals.entries()]
    .map(([label, stats]) => ({ label, ...stats }))
    .sort((left, right) => right.amount - left.amount || right.count - left.count)
    .slice(0, 6);
}

function trendPath(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const padding = 18;
  return values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
    const y = height - padding - (value / max) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
}

export default function DashboardPage({ onBack, departments }: Props) {
  const t = useT();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [quotes, setQuotes] = useState<DashboardQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(departments.map(async (department) => {
        const result = await fetchLedger(selectedYear, department);
        if (!result.success) throw new Error(`${department}: ${result.message || '대장을 불러오지 못했습니다.'}`);
        return { department, result };
      }));
      const years = [...new Set(results.flatMap(({ result }) => result.availableYears ?? []))]
        .filter((year) => year >= 2000 && year <= currentYear)
        .sort((left, right) => right - left);
      setAvailableYears(years);
      if (years.length > 0 && !years.includes(selectedYear)) setSelectedYear(years[0]);
      setQuotes(results.flatMap(({ department, result }) => buildQuotes(department, result.headers ?? [], result.rows ?? [])));
    } catch (err) {
      setQuotes([]);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [currentYear, departments, selectedYear]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const teams = departments.map((department) => teamStats(department, quotes.filter((quote) => quote.department === department)));
  const totalAmount = quotes.reduce((sum, quote) => sum + quote.amount, 0);
  const orderedCount = quotes.filter((quote) => quote.ordered).length;
  const monthly = Array.from({ length: 12 }, (_, index) => teams.reduce((sum, team) => sum + team.monthly[index], 0));
  const maxTeamAmount = Math.max(...teams.map((team) => team.amount), 1);
  const maxCategoryAmount = Math.max(...rankedValues(quotes, 'product').map((item) => item.amount), 1);
  const topProducts = rankedValues(quotes, 'product');
  const topCompanies = rankedValues(quotes, 'company');

  return (
    <div className="min-h-screen bg-[#f7f8fa] px-4 sm:px-6 py-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="rounded-lg bg-[#191919] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#333333]">← {t(UI.back)}</button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">CIMON INSIGHT</p>
              <h1 className="text-2xl font-bold text-[#191919]">{t(UI.quoteDashboardTitle)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {availableYears.length > 0 && (
              <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className="rounded-lg border border-[#d8dde5] bg-white px-3 py-2 text-sm text-[#444]">
                {availableYears.map((year) => <option key={year} value={year}>{year}{t(UI.quoteYearSuffix)}</option>)}
              </select>
            )}
            <button type="button" onClick={() => void loadDashboard()} className="rounded-lg border border-[#d8dde5] bg-white px-3 py-2 text-sm text-[#555] hover:bg-[#eef2f7]">{t(UI.quoteDashboardRefresh)}</button>
          </div>
        </div>

        {loading && <div className="rounded-2xl border border-[#e3e7ee] bg-white p-12 text-center text-sm text-[#888]">{t(UI.quoteDashboardLoading)}</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                [t(UI.quoteDashboardTotalQuotes), formatCount(quotes.length), 'text-blue-700'],
                [t(UI.quoteDashboardTotalAmount), formatWon(totalAmount), 'text-[#191919]'],
                [t(UI.quoteDashboardOrders), formatCount(orderedCount), 'text-emerald-700'],
                [t(UI.quoteDashboardOrderRate), `${quotes.length ? Math.round((orderedCount / quotes.length) * 100) : 0}%`, 'text-violet-700'],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-2xl border border-[#e3e7ee] bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-[#8a94a6]">{label}</p>
                  <p className={`mt-2 text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
                  <p className="mt-1 text-[11px] text-[#a4acb8]">{selectedYear}{t(UI.quoteYearSuffix)} · 전체 부서</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.5fr] gap-4 mb-4">
              <section className="rounded-2xl border border-[#e3e7ee] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-[#242b36]">{t(UI.quoteDashboardTeamCompare)}</h2><span className="text-xs text-[#9aa3af]">금액 기준</span></div>
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div key={team.department}>
                      <div className="flex items-center justify-between text-xs mb-1.5"><span className="font-semibold text-[#4b5563]">{team.department}</span><span className="text-[#697386]">{formatWon(team.amount)} · {team.quotes}건</span></div>
                      <div className="h-3 rounded-full bg-[#edf1f5] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${(team.amount / maxTeamAmount) * 100}%` }} /></div>
                      <div className="mt-1 text-[11px] text-[#9aa3af]">발주 {team.ordered}건 · 발주율 {team.quotes ? Math.round((team.ordered / team.quotes) * 100) : 0}%</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#e3e7ee] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2"><h2 className="font-bold text-[#242b36]">{t(UI.quoteDashboardTrend)}</h2><span className="text-xs text-[#9aa3af]">{selectedYear}{t(UI.quoteYearSuffix)}</span></div>
                <div className="overflow-x-auto">
                  <svg viewBox="0 0 720 230" className="w-full min-w-[620px] h-56" role="img" aria-label="월별 견적 금액 추이">
                    {[0, 1, 2, 3].map((line) => <line key={line} x1="25" x2="695" y1={25 + line * 55} y2={25 + line * 55} stroke="#edf0f4" strokeWidth="1" />)}
                    <polyline fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={trendPath(monthly, 720, 210)} />
                    {monthly.map((value, index) => { const max = Math.max(...monthly, 1); const x = 18 + (index * 684) / 11; const y = 210 - (value / max) * 174; return <g key={index}><circle cx={x} cy={y} r="4" fill="#fff" stroke="#2563eb" strokeWidth="2" /><text x={x} y="228" textAnchor="middle" fontSize="11" fill="#8a94a6">{index + 1}월</text></g>; })}
                  </svg>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <section className="rounded-2xl border border-[#e3e7ee] bg-white p-5 shadow-sm"><h2 className="font-bold text-[#242b36] mb-4">{t(UI.quoteDashboardTopProducts)}</h2><div className="space-y-3">{topProducts.length ? topProducts.map((item, index) => <div key={item.label}><div className="flex justify-between gap-2 text-xs"><span className="truncate"><b className="mr-2 text-blue-600">{String(index + 1).padStart(2, '0')}</b>{item.label}</span><span className="shrink-0 text-[#697386]">{formatWon(item.amount)}</span></div><div className="mt-1 h-1.5 rounded-full bg-[#edf1f5]"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${(item.amount / maxCategoryAmount) * 100}%` }} /></div></div>) : <p className="text-sm text-[#999]">데이터가 없습니다.</p>}</div></section>
              <section className="rounded-2xl border border-[#e3e7ee] bg-white p-5 shadow-sm"><h2 className="font-bold text-[#242b36] mb-4">{t(UI.quoteDashboardTopClients)}</h2><div className="space-y-2">{topCompanies.length ? topCompanies.map((item, index) => <div key={item.label} className="flex items-center justify-between gap-3 border-b border-[#f1f3f6] pb-2 text-xs"><span className="truncate"><b className="mr-2 text-violet-600">{index + 1}</b>{item.label}</span><span className="shrink-0 text-[#697386]">{item.count}건 · {formatWon(item.amount)}</span></div>) : <p className="text-sm text-[#999]">데이터가 없습니다.</p>}</div></section>
              <section className="rounded-2xl border border-[#e3e7ee] bg-white p-5 shadow-sm"><h2 className="font-bold text-[#242b36] mb-4">팀별 평균 견적 금액</h2><div className="space-y-3">{teams.map((team) => <div key={team.department} className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-3 py-3"><span className="text-xs font-semibold text-[#4b5563]">{team.department}</span><span className="text-sm font-bold text-[#191919]">{formatWon(team.quotes ? team.amount / team.quotes : 0)}</span></div>)}</div></section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
