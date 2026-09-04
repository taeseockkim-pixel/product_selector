import { useState, useEffect, useRef } from 'react';
import type { CategoryId, FilterValues, PlcSeriesId, Product } from './types';
import type { AuthorInfo } from './types/quote';
import { PRODUCTS } from './data/products';
import { getCategoryConfig } from './config/filterConfig';
import { PLC_TREE, getDefaultSubType } from './config/plcTreeConfig';
import LeftPanel from './components/LeftPanel';
import PlcLeftPanel from './components/PlcLeftPanel';
import ProductTable from './components/ProductTable';
import CartPage from './components/CartPage';
import ComparePage from './components/ComparePage';
import QuoteFormPage from './components/QuoteFormPage';
import QuoteListPage from './components/QuoteListPage';
import SearchOverlay from './components/SearchOverlay';
import {
  checkQuoteAccess,
  fetchQuoteForEdit,
  updateQuoteOrder,
  type QuoteEditData,
} from './utils/appsScriptBridge';
import 'flag-icons/css/flag-icons.min.css';
import SpecModal from './components/SpecModal';
import { LangProvider, useLang, useT } from './context/LangContext';
import { UI } from './i18n/ui';

type ViewMode = 'main' | 'cart' | 'compare' | 'quotecreate' | 'quotelist';

const CATEGORY_LABELS: Record<CategoryId, string> = {
  PLC: 'PLC',
  IPC: 'IPC / IAC',
  SCADA: 'SCADA',
  XPANEL: 'XPANEL',
};

const ALL_CATEGORY_IDS: CategoryId[] = ['PLC', 'IPC', 'SCADA', 'XPANEL'];

// 작성자를 자유롭게 변경할 수 있는 관리자 계정 (이메일 소문자 기준)
const ADMIN_AUTHOR_EMAILS = new Set(['taeseock.kim@cimon.com']);

function filterPlcProducts(plcSeries: PlcSeriesId, activeSubType: string) {
  return PRODUCTS.filter(
    (p) => p.category === 'PLC' && p.plcSeries === plcSeries && p.subType === activeSubType,
  );
}

function filterByConfig(
  categoryId: 'IPC' | 'SCADA' | 'XPANEL',
  activeSubType: string,
  filters: FilterValues,
) {
  const config = getCategoryConfig(categoryId);
  if (!config) return [];
  const subType = config.subTypes.find((s) => s.id === activeSubType);
  if (!subType) return [];
  return PRODUCTS.filter((p) => {
    if (p.category !== categoryId) return false;
    if (!subType.matcher(p)) return false;
    return subType.filters.every((section) => {
      const selected = filters[section.id] ?? [];
      return section.matcher(p, selected);
    });
  });
}

function parseURLState() {
  const params = new URLSearchParams(window.location.search);
  const cat = (params.get('cat') as CategoryId) ?? 'PLC';
  const plcSeries = (params.get('plcSeries') as PlcSeriesId) ?? 'CM1';
  const plcSubType = params.get('plcSub') ?? getDefaultSubType('CM1');
  const sub = params.get('sub') ?? '';
  let filters: FilterValues = {};
  try { filters = JSON.parse(params.get('filters') ?? '{}'); } catch { /* noop */ }
  return { cat, plcSeries, plcSubType, sub, filters };
}

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => setLang('ko')}
        title="한국어"
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
          lang === 'ko'
            ? 'bg-[#333333] text-white'
            : 'text-[#999999] hover:text-white hover:bg-[#333333]'
        }`}
      >
        <span className="fi fi-kr" style={{ width: '18px', height: '14px', backgroundSize: 'cover', borderRadius: '2px' }}></span>
        KR
      </button>
      <button
        onClick={() => setLang('en')}
        title="English"
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
          lang === 'en'
            ? 'bg-[#333333] text-white'
            : 'text-[#999999] hover:text-white hover:bg-[#333333]'
        }`}
      >
        <span className="fi fi-us" style={{ width: '18px', height: '14px', backgroundSize: 'cover', borderRadius: '2px' }}></span>
        US
      </button>
    </div>
  );
}

function AppInner() {
  const { lang } = useLang();
  const t = useT();
  const isInitialMount = useRef(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlState = useRef(parseURLState());
  const headerWrapRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [stickyOffset, setStickyOffset] = useState(0);

  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [activeCategory, setActiveCategory] = useState<CategoryId>(urlState.current.cat);
  const [cartList, setCartList] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [plcSeries, setPlcSeries] = useState<PlcSeriesId>(urlState.current.plcSeries);
  const [plcSubType, setPlcSubType] = useState<string>(urlState.current.plcSubType);
  const [activeSubType, setActiveSubType] = useState<string>(
    urlState.current.cat !== 'PLC' ? urlState.current.sub : '',
  );
  const [filters, setFilters] = useState<FilterValues>(
    urlState.current.cat !== 'PLC' ? urlState.current.filters : {},
  );

  // ── 견적 기능 접근 권한 (작성자 DB 시트 등록 계정만 사용 가능) ──
  const [authAuthor, setAuthAuthor] = useState<AuthorInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(['기술영업', '영업', '프로젝트']);
  const [editingQuote, setEditingQuote] = useState<QuoteEditData | null>(null);
  const authEmailRef = useRef('');
  const accessCheckRef = useRef<Promise<'authorized' | 'denied'> | null>(null);

  function requestQuoteAccessCheck(): Promise<'authorized' | 'denied'> {
    if (!accessCheckRef.current) {
      accessCheckRef.current = checkQuoteAccess()
        .then((result) => {
          if (result.success && result.authorized && result.author) {
            setAuthAuthor(result.author);
            const admin = Boolean(
              result.isAdmin ||
              (result.author.email && ADMIN_AUTHOR_EMAILS.has(result.author.email.toLowerCase()))
            );
            setIsAdmin(admin);
            if (result.availableDepartments?.length) {
              setAvailableDepartments(result.availableDepartments);
            }
            return 'authorized' as const;
          }
          authEmailRef.current = result.email ?? '';
          return 'denied' as const;
        })
        .catch((err) => {
          console.warn('견적 권한 확인 실패:', err);
          return 'denied' as const;
        });
    }
    return accessCheckRef.current;
  }

  useEffect(() => { void requestQuoteAccessCheck(); }, []);

  /** 견적 페이지 진입 전 권한 확인. 미등록 계정이면 팝업을 띄우고 false를 반환한다. */
  async function ensureQuoteAccess(): Promise<boolean> {
    const status = await requestQuoteAccessCheck();
    if (status === 'authorized') return true;
    const emailLine = authEmailRef.current
      ? (lang === 'ko' ? `\n\n계정: ${authEmailRef.current}` : `\n\nAccount: ${authEmailRef.current}`)
      : '';
    alert(t(UI.quoteAccessDenied) + emailLine);
    return false;
  }

  async function handleQuoteListClick() {
    if (await ensureQuoteAccess()) setViewMode('quotelist');
  }

  async function handleGoToQuoteCreate() {
    if (await ensureQuoteAccess()) {
      setEditingQuote(null);
      setViewMode('quotecreate');
    }
  }

  async function handleEditQuote(year: number, quoteNumber: string, department?: string) {
    if (!(await ensureQuoteAccess())) return;
    try {
      const result = await fetchQuoteForEdit(year, quoteNumber, department);
      if (!result.success || !result.quote) throw new Error(result.message || t(UI.quoteEditLoadFailed));
      setEditingQuote(result.quote);
      setViewMode('quotecreate');
    } catch (err) {
      alert(`${t(UI.quoteEditLoadFailed)}: ${String(err)}`);
    }
  }

  async function handleOrderChange(year: number, quoteNumber: string, ordered: boolean, department?: string) {
    const result = await updateQuoteOrder(year, quoteNumber, ordered, department);
    if (!result.success) throw new Error(result.message || t(UI.quoteOrderUpdateFailed));
  }

  // 헤더+탭 높이를 동적으로 측정 → 사이드바 sticky top/height 계산
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      const hh = headerWrapRef.current?.offsetHeight ?? 0;
      const th = tabRef.current?.offsetHeight ?? 0;
      setHeaderHeight(hh);
      setStickyOffset(hh + th);
    });
    if (headerWrapRef.current) obs.observe(headerWrapRef.current);
    if (tabRef.current) obs.observe(tabRef.current);
    return () => obs.disconnect();
  }, []);

  // 카테고리 변경 시 필터 초기화 (최초 마운트는 건너뜀 — URL 복원 상태 유지)
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (activeCategory === 'PLC') return;
    const config = getCategoryConfig(activeCategory);
    if (config?.subTypes.length) setActiveSubType(config.subTypes[0].id);
    setFilters({});
  }, [activeCategory]);

  // URL 상태 동기화
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('cat', activeCategory);
    if (activeCategory === 'PLC') {
      params.set('plcSeries', plcSeries);
      params.set('plcSub', plcSubType);
    } else {
      if (activeSubType) params.set('sub', activeSubType);
      const fs = JSON.stringify(filters);
      if (fs !== '{}') params.set('filters', fs);
    }
    history.replaceState({}, '', '?' + params.toString());
  }, [activeCategory, plcSeries, plcSubType, activeSubType, filters]);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  function handlePlcSeriesChange(s: PlcSeriesId) {
    setPlcSeries(s);
    setPlcSubType(getDefaultSubType(s));
  }

  function handleCartToggle(id: string) {
    setCartList((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleCompareToggle(id: string) {
    if (compareList.includes(id)) {
      setCompareList((prev) => prev.filter((x) => x !== id));
    } else if (compareList.length >= 4) {
      showToast(t(UI.compareLimit));
    } else {
      setCompareList((prev) => [...prev, id]);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch { /* noop */ }
    showToast(t(UI.linkCopied));
  }

  let products: typeof PRODUCTS = [];
  if (activeCategory === 'PLC') {
    products = filterPlcProducts(plcSeries, plcSubType);
  } else if (activeCategory === 'IPC' || activeCategory === 'SCADA' || activeCategory === 'XPANEL') {
    products = filterByConfig(activeCategory, activeSubType, filters);
  }

  function getRightTitle(): string {
    if (activeCategory === 'PLC') {
      const tree = PLC_TREE[plcSeries];
      for (const group of tree) {
        const leaf = group.children.find((c) => c.id === plcSubType);
        if (leaf) {
          const groupLabel = lang === 'en' ? (group.labelEn ?? group.label) : group.label;
          const leafLabel  = lang === 'en' ? (leaf.labelEn  ?? leaf.label)  : leaf.label;
          return `${plcSeries === 'CM1' ? 'PLC' : 'PLC-S'} — ${groupLabel} > ${leafLabel}`;
        }
      }
      return 'PLC';
    }
    const config = getCategoryConfig(activeCategory);
    const st = config?.subTypes.find((s) => s.id === activeSubType);
    const stLabel = lang === 'en' ? (st?.labelEn ?? st?.label ?? '') : (st?.label ?? '');
    return `${CATEGORY_LABELS[activeCategory]} — ${stLabel}`;
  }

  const totalLabel = lang === 'ko' ? `총 ${products.length}개` : `Total: ${products.length}`;

  function handleReset() {
    setViewMode('main');
    setEditingQuote(null);
    setActiveCategory('PLC');
    setPlcSeries('CM1');
    setPlcSubType(getDefaultSubType('CM1'));
    setFilters({});
    setDetailProduct(null);
    setSearchOpen(false);
  }

  const headerProps = {
    cartCount: cartList.length,
    compareCount: compareList.length,
    onCartClick: () => setViewMode('cart'),
    onCompareClick: () => setViewMode('compare'),
    onSearchClick: () => setSearchOpen(true),
    onCopyLink: handleCopyLink,
    onReset: handleReset,
    onQuoteListClick: () => { void handleQuoteListClick(); },
    viewMode,
  };

  if (viewMode === 'quotecreate') {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-50"><AppHeader {...headerProps} /></div>
        <QuoteFormPage
          cartProducts={PRODUCTS.filter((p) => cartList.includes(p.id))}
          onBack={() => setViewMode('cart')}
          onSuccess={() => { setEditingQuote(null); setViewMode('quotelist'); }}
          defaultAuthorName={authAuthor?.name}
          authorLocked={authAuthor != null && !ADMIN_AUTHOR_EMAILS.has(authAuthor.email.toLowerCase())}
          department={authAuthor?.department}
          editQuote={editingQuote}
          draftOwnerEmail={authAuthor?.email}
        />
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  if (viewMode === 'quotelist') {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-50"><AppHeader {...headerProps} /></div>
        <QuoteListPage
          onBack={() => setViewMode('main')}
          onNewQuote={handleGoToQuoteCreate}
          onEditQuote={handleEditQuote}
          onOrderChange={handleOrderChange}
          department={authAuthor?.department ?? '기술영업'}
          isAdmin={isAdmin}
          availableDepartments={availableDepartments}
        />
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  if (viewMode === 'cart') {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-50">
          <AppHeader {...headerProps} />
        </div>
        <CartPage
          cartList={cartList} products={PRODUCTS}
          onRemove={handleCartToggle} onClear={() => setCartList([])}
          onBack={() => setViewMode('main')}
          onGoToQuote={handleGoToQuoteCreate}
        />
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  if (viewMode === 'compare') {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-50">
          <AppHeader {...headerProps} />
        </div>
        <ComparePage
          compareList={compareList} products={PRODUCTS}
          onRemove={handleCompareToggle} onClear={() => setCompareList([])} onBack={() => setViewMode('main')}
        />
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col print:overflow-visible">
      {/* 헤더 — sticky top-0 */}
      <div ref={headerWrapRef} className="sticky top-0 z-50">
        <AppHeader {...headerProps} />
      </div>

      {/* 카테고리 탭 — sticky, top = 헤더 높이 */}
      <div
        ref={tabRef}
        className="sticky z-40 bg-[#f0ede8] border-b border-[#ddd9d2] no-print overflow-x-auto no-scrollbar"
        style={{ top: headerHeight }}
      >
        <div className="max-w-screen-xl mx-auto px-3 sm:px-6">
          <nav className="flex gap-0 pt-1 min-w-max sm:min-w-0">
            {ALL_CATEGORY_IDS.map((catId) => {
              const active = activeCategory === catId;
              return (
                <button
                  key={catId}
                  onClick={() => setActiveCategory(catId)}
                  className={`px-4 sm:px-6 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                    active
                      ? 'border-[#191919] text-[#191919]'
                      : 'border-transparent text-[#555555] hover:text-[#191919] hover:border-[#cccccc]'
                  }`}
                >
                  {CATEGORY_LABELS[catId]}
                </button>
              );
            })}
            <div className="w-px bg-[#ddd9d2] mx-2 self-stretch my-1.5" />
            <a
              href="https://cimon.atlassian.net/wiki/spaces"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap border-transparent text-[#0066cc] hover:text-[#0044aa] hover:border-[#0066cc]"
            >
              {lang === 'ko' ? '온라인 매뉴얼' : 'Online Manual'}
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </nav>
        </div>
      </div>

      {/* 컨텐츠 영역 — 전체 페이지 스크롤 (브라우저 끝 스크롤바) */}
      <div className="flex-1 print:overflow-visible">
        <div className="max-w-screen-xl mx-auto w-full flex gap-5 px-3 sm:px-6 print:overflow-visible">
          {/* 데스크톱 사이드바 — sticky, JS로 top/height 동적 계산 */}
          <div
            className="hidden md:flex flex-col w-64 flex-shrink-0 no-print"
            style={{ position: 'sticky', top: stickyOffset, height: `calc(100vh - ${stickyOffset}px)`, overflowY: 'hidden' }}
          >
            <div className="h-full pt-6 flex flex-col">
              {activeCategory === 'PLC' ? (
                <PlcLeftPanel
                  plcSeries={plcSeries}
                  onPlcSeriesChange={handlePlcSeriesChange}
                  activeSubType={plcSubType}
                  onSubTypeChange={setPlcSubType}
                />
              ) : (
                <LeftPanel
                  categoryId={activeCategory}
                  activeSubType={activeSubType}
                  onSubTypeChange={(id) => { setActiveSubType(id); setFilters({}); }}
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              )}
            </div>
          </div>

          {/* 모바일 드로어 */}
          {mobileMenuOpen && (
            <div className="md:hidden">
              <div
                className="fixed inset-0 bg-black/40 z-30"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-40 overflow-y-auto bg-[#4a4a4a] shadow-xl">
                {activeCategory === 'PLC' ? (
                  <PlcLeftPanel
                    plcSeries={plcSeries}
                    onPlcSeriesChange={handlePlcSeriesChange}
                    activeSubType={plcSubType}
                    onSubTypeChange={(id) => { setPlcSubType(id); setMobileMenuOpen(false); }}
                    onClose={() => setMobileMenuOpen(false)}
                  />
                ) : (
                  <LeftPanel
                    categoryId={activeCategory}
                    activeSubType={activeSubType}
                    onSubTypeChange={(id) => { setActiveSubType(id); setFilters({}); setMobileMenuOpen(false); }}
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClose={() => setMobileMenuOpen(false)}
                  />
                )}
              </div>
            </div>
          )}

          {/* 우측 컨텐츠 — 전체 페이지 스크롤 */}
          <div key={activeCategory} className="flex-1 min-w-0 pb-8 animate-tab-fade print:overflow-visible">
            <div className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#e6e2dc] no-print"
                    onClick={() => setMobileMenuOpen(true)}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M3 8h18M3 12h18" />
                    </svg>
                    {t(UI.filterBtn)}
                  </button>
                  <h2 className="text-base font-bold text-[#191919]">{getRightTitle()}</h2>
                </div>
                <span className="text-sm text-[#555555]">{totalLabel}</span>
              </div>
              <ProductTable
                products={products}
                cartList={cartList}
                compareList={compareList}
                onCartToggle={handleCartToggle}
                onCompareToggle={handleCompareToggle}
                onViewDetail={setDetailProduct}
              />
            </div>
          </div>
        </div>
      </div>

      {detailProduct && (
        <SpecModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          allProducts={PRODUCTS}
          onViewDetail={setDetailProduct}
        />
      )}

      {searchOpen && (
        <SearchOverlay
          products={PRODUCTS}
          cartList={cartList}
          compareList={compareList}
          onCartToggle={handleCartToggle}
          onCompareToggle={handleCompareToggle}
          onViewDetail={(p) => { setDetailProduct(p); setSearchOpen(false); }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {toast && <Toast msg={toast} />}
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] bg-[#191919] text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
      {msg}
    </div>
  );
}

function AppHeader({
  cartCount, compareCount, onCartClick, onCompareClick,
  onSearchClick, onCopyLink, onReset, onQuoteListClick, viewMode,
}: {
  cartCount: number;
  compareCount: number;
  onCartClick: () => void;
  onCompareClick: () => void;
  onSearchClick: () => void;
  onCopyLink: () => void;
  onReset: () => void;
  onQuoteListClick: () => void;
  viewMode: ViewMode;
}) {
  const t = useT();
  const { lang } = useLang();
  return (
    <header className="bg-[#191919] shadow-glow-white no-print flex-none">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-6 flex items-center justify-between h-14 sm:h-16 gap-2 overflow-x-auto no-scrollbar">
        <button onClick={onReset} className="flex items-center gap-2 sm:gap-3 hover:opacity-75 transition-opacity flex-shrink-0">
          <img src="/products/CIMON_Logo.png" alt="CIMON" className="h-16 sm:h-20 w-auto object-contain invert" />
          <span className="text-[#444444] hidden sm:inline">|</span>
          <span className="text-[0.8rem] sm:text-base text-[#cccccc] font-bold font-headline hidden sm:inline whitespace-nowrap">{t(UI.productGuide)}</span>
        </button>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* 검색 버튼 */}
          <button
            onClick={onSearchClick}
            title={t(UI.searchBtn)}
            className="p-2 text-[#999999] hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* 링크 복사 버튼 — 모바일 숨김 */}
          <button
            onClick={onCopyLink}
            title={t(UI.copyLink)}
            className="hidden sm:flex p-2 text-[#999999] hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>

          <div className="w-px h-5 bg-[#333333] mx-0.5 hidden sm:block" />

          {/* 비교 버튼 */}
          <button
            onClick={onCompareClick}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'compare'
                ? 'bg-white text-[#191919]'
                : compareCount > 0
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'text-[#999999] hover:text-white hover:bg-[#333333]'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {compareCount > 0
              ? (lang === 'ko' ? `${compareCount}개 선택됨` : `${compareCount} selected`)
              : t(UI.compare)}
          </button>

          {/* 담기 버튼 */}
          <button
            onClick={onCartClick}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'cart'
                ? 'bg-white text-[#191919]'
                : cartCount > 0
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'text-[#999999] hover:text-white hover:bg-[#333333]'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4m4-4v4" />
            </svg>
            {cartCount > 0
              ? (lang === 'ko' ? `${cartCount}개 선택됨` : `${cartCount} selected`)
              : t(UI.shortlist)}
          </button>

          {/* 견적 목록 버튼 */}
          <button
            onClick={onQuoteListClick}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'quotelist' || viewMode === 'quotecreate'
                ? 'bg-white text-[#191919]'
                : 'text-[#999999] hover:text-white hover:bg-[#333333]'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">{t(UI.quoteListBtn)}</span>
          </button>

          <div className="w-px h-5 bg-[#333333] mx-0.5" />
          <LangToggle />
        </div>
      </div>
    </header>
  );
}


export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}
