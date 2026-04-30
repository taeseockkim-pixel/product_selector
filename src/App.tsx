import { useState, useEffect } from 'react';
import type { CategoryId, FilterValues, PlcSeriesId, Product } from './types';
import { PRODUCTS } from './data/products';
import { getCategoryConfig } from './config/filterConfig';
import { PLC_TREE, getDefaultSubType } from './config/plcTreeConfig';
import LeftPanel from './components/LeftPanel';
import PlcLeftPanel from './components/PlcLeftPanel';
import ProductTable from './components/ProductTable';
import CartPage from './components/CartPage';
import ComparePage from './components/ComparePage';
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

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setLang('ko')}
        title="한국어"
        className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-all ${
          lang !== 'ko' ? 'grayscale opacity-40 hover:opacity-60' : ''
        }`}
      >
        🇰🇷
      </button>
      <button
        onClick={() => setLang('en')}
        title="English"
        className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-all ${
          lang !== 'en' ? 'grayscale opacity-40 hover:opacity-60' : ''
        }`}
      >
        🇺🇸
      </button>
    </div>
  );
}

function AppInner() {
  const { lang } = useLang();

  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('PLC');
  const [cartList, setCartList] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const [plcSeries, setPlcSeries] = useState<PlcSeriesId>('CM1');
  const [plcSubType, setPlcSubType] = useState<string>(getDefaultSubType('CM1'));

  const [activeSubType, setActiveSubType] = useState<string>('');
  const [filters, setFilters] = useState<FilterValues>({});

  useEffect(() => {
    if (activeCategory === 'PLC') return;
    const config = getCategoryConfig(activeCategory);
    if (config && config.subTypes.length > 0) {
      setActiveSubType(config.subTypes[0].id);
    }
    setFilters({});
  }, [activeCategory]);

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
    setCompareList((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
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

  if (viewMode === 'cart') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader
          cartCount={cartList.length} compareCount={compareList.length}
          onCartClick={() => setViewMode('cart')} onCompareClick={() => setViewMode('compare')}
          viewMode={viewMode}
        />
        <CartPage
          cartList={cartList} products={PRODUCTS}
          onRemove={handleCartToggle} onClear={() => setCartList([])} onBack={() => setViewMode('main')}
        />
      </div>
    );
  }

  if (viewMode === 'compare') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader
          cartCount={cartList.length} compareCount={compareList.length}
          onCartClick={() => setViewMode('cart')} onCompareClick={() => setViewMode('compare')}
          viewMode={viewMode}
        />
        <ComparePage
          compareList={compareList} products={PRODUCTS}
          onRemove={handleCompareToggle} onClear={() => setCompareList([])} onBack={() => setViewMode('main')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader
        cartCount={cartList.length} compareCount={compareList.length}
        onCartClick={() => setViewMode('cart')} onCompareClick={() => setViewMode('compare')}
        viewMode={viewMode}
      />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-6">
          <nav className="flex gap-1">
            {ALL_CATEGORY_IDS.map((catId) => {
              const active = activeCategory === catId;
              return (
                <button
                  key={catId}
                  onClick={() => setActiveCategory(catId)}
                  className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {CATEGORY_LABELS[catId]}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6">
        <div className="flex gap-5 items-start">
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

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-700">{getRightTitle()}</h2>
              <span className="text-sm text-gray-400">{totalLabel}</span>
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
        <SpecModal product={detailProduct} onClose={() => setDetailProduct(null)} />
      )}
    </div>
  );
}

function AppHeader({
  cartCount, compareCount, onCartClick, onCompareClick, viewMode,
}: {
  cartCount: number;
  compareCount: number;
  onCartClick: () => void;
  onCompareClick: () => void;
  viewMode: ViewMode;
}) {
  const t = useT();
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <img src="/products/CIMON_Logo.png" alt="CIMON" className="h-10 w-auto object-contain" />
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">{t(UI.productGuide)}</span>
        </div>

        <div className="flex items-center gap-2">
          <LangToggle />

          <button
            onClick={onCompareClick}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-w-[90px] whitespace-nowrap ${
              viewMode === 'compare'
                ? 'bg-blue-600 text-white'
                : compareCount > 0
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t(UI.compare)}
            {compareCount > 0 && (
              <span className={`ml-0.5 rounded-full text-xs px-1.5 py-0.5 font-bold ${
                viewMode === 'compare' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
              }`}>
                {compareCount}
              </span>
            )}
          </button>

          <button
            onClick={onCartClick}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-w-[90px] whitespace-nowrap ${
              viewMode === 'cart'
                ? 'bg-blue-600 text-white'
                : cartCount > 0
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4m4-4v4" />
            </svg>
            {t(UI.shortlist)}
            {cartCount > 0 && (
              <span className={`ml-0.5 rounded-full text-xs px-1.5 py-0.5 font-bold ${
                viewMode === 'cart' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
              }`}>
                {cartCount}
              </span>
            )}
          </button>
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
