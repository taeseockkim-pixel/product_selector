import { useState, useEffect, useRef } from 'react';
import type { CategoryId, FilterValues, PlcSeriesId, Product } from './types';
import { PRODUCTS } from './data/products';
import { getCategoryConfig } from './config/filterConfig';
import { PLC_TREE, getDefaultSubType } from './config/plcTreeConfig';
import LeftPanel from './components/LeftPanel';
import PlcLeftPanel from './components/PlcLeftPanel';
import ProductTable from './components/ProductTable';
import CartPage from './components/CartPage';
import ComparePage from './components/ComparePage';
import SearchOverlay from './components/SearchOverlay';
import 'flag-icons/css/flag-icons.min.css';
import SpecModal from './components/SpecModal';
import { LangProvider, useLang, useT } from './context/LangContext';
import { UI } from './i18n/ui';

type ViewMode = 'main' | 'cart' | 'compare';

const CATEGORY_LABELS: Record<CategoryId, string> = {
  PLC: 'PLC',
  IPC: 'IPC / IAC',
  SCADA: 'SCADA',
  XPANEL: 'XPANEL',
};

const ALL_CATEGORY_IDS: CategoryId[] = ['PLC', 'IPC', 'SCADA', 'XPANEL'];

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

  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [activeCategory, setActiveCategory] = useState<CategoryId>(urlState.current.cat);
  const [cartList, setCartList] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cimon-cart') ?? '[]'); } catch { return []; }
  });
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

  // localStorage 카트 동기화
  useEffect(() => {
    localStorage.setItem('cimon-cart', JSON.stringify(cartList));
  }, [cartList]);

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
    viewMode,
  };

  if (viewMode === 'cart') {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
        <AppHeader {...headerProps} />
        <CartPage
          cartList={cartList} products={PRODUCTS}
          onRemove={handleCartToggle} onClear={() => setCartList([])} onBack={() => setViewMode('main')}
        />
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  if (viewMode === 'compare') {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
        <AppHeader {...headerProps} />
        <ComparePage
          compareList={compareList} products={PRODUCTS}
          onRemove={handleCompareToggle} onClear={() => setCompareList([])} onBack={() => setViewMode('main')}
        />
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
      <AppHeader {...headerProps} />

      {/* 카테고리 탭 */}
      <div className="bg-white border-b border-[#e8e8e8] no-print sticky top-16 z-30">
        <div className="max-w-screen-xl mx-auto px-6">
          <nav className="flex gap-1.5 py-2.5">
            {ALL_CATEGORY_IDS.map((catId) => {
              const active = activeCategory === catId;
              return (
                <button
                  key={catId}
                  onClick={() => setActiveCategory(catId)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    active
                      ? 'bg-[#191919] text-white shadow-sm'
                      : 'text-[#999999] hover:text-[#191919] hover:bg-[#f2f2f2]'
                  }`}
                >
                  {CATEGORY_LABELS[catId]}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 pb-6">
        <div key={activeCategory} className="flex gap-5 items-start animate-tab-fade">
          {/* 데스크톱 사이드바 */}
          <div className="hidden md:block w-64 flex-shrink-0 no-print sticky top-[120px] self-start max-h-[calc(100vh-120px)] overflow-y-auto">
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

          {/* 모바일 드로어 */}
          {mobileMenuOpen && (
            <div className="md:hidden">
              <div
                className="fixed inset-0 bg-black/40 z-30"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-40 overflow-y-auto bg-white shadow-xl">
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

          <div className="flex-1 min-w-0 pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e0e0e0] text-sm text-[#333333] hover:bg-[#f2f2f2] no-print"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M3 8h18M3 12h18" />
                  </svg>
                  {t(UI.filterBtn)}
                </button>
                <h2 className="text-base font-bold text-[#191919]">{getRightTitle()}</h2>
              </div>
              <span className="text-sm text-[#999999]">{totalLabel}</span>
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
      </main>

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
  onSearchClick, onCopyLink, onReset, viewMode,
}: {
  cartCount: number;
  compareCount: number;
  onCartClick: () => void;
  onCompareClick: () => void;
  onSearchClick: () => void;
  onCopyLink: () => void;
  onReset: () => void;
  viewMode: ViewMode;
}) {
  const t = useT();
  return (
    <header className="bg-[#191919] shadow-glow-white sticky top-0 z-40 no-print overflow-visible">
      <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-between h-16">
        <button onClick={onReset} className="flex items-center gap-3 hover:opacity-75 transition-opacity">
          <img src="/products/CIMON_Logo.png" alt="CIMON" className="h-20 w-auto object-contain invert" />
          <span className="text-[#333333]">|</span>
          <span className="text-sm text-[#999999] font-headline hidden sm:inline">{t(UI.productGuide)}</span>
        </button>

        <div className="flex items-center gap-1.5">
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

          {/* 링크 복사 버튼 */}
          <button
            onClick={onCopyLink}
            title={t(UI.copyLink)}
            className="p-2 text-[#999999] hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>

          <div className="w-px h-5 bg-[#333333] mx-0.5" />

          {/* 비교 버튼 */}
          <button
            onClick={onCompareClick}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-w-[86px] whitespace-nowrap ${
              viewMode === 'compare'
                ? 'bg-white text-[#191919]'
                : compareCount > 0
                ? 'bg-[#333333] text-white hover:bg-[#0d3a5e]'
                : 'text-[#999999] hover:text-white hover:bg-[#333333]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t(UI.compare)}
            {compareCount > 0 && (
              <span className={`ml-0.5 rounded-full text-xs px-1.5 py-0.5 font-bold ${
                viewMode === 'compare' ? 'bg-[#191919] text-white' : 'bg-white text-[#191919]'
              }`}>
                {compareCount}
              </span>
            )}
          </button>

          {/* 담기 버튼 */}
          <button
            onClick={onCartClick}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-w-[86px] whitespace-nowrap ${
              viewMode === 'cart'
                ? 'bg-white text-[#191919]'
                : cartCount > 0
                ? 'bg-[#333333] text-white hover:bg-[#0d3a5e]'
                : 'text-[#999999] hover:text-white hover:bg-[#333333]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4m4-4v4" />
            </svg>
            {t(UI.shortlist)}
            {cartCount > 0 && (
              <span className={`ml-0.5 rounded-full text-xs px-1.5 py-0.5 font-bold ${
                viewMode === 'cart' ? 'bg-[#191919] text-white' : 'bg-white text-[#191919]'
              }`}>
                {cartCount}
              </span>
            )}
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
