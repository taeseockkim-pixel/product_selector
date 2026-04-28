import { useState } from 'react';
import type { CategoryId, FilterValues, PlcSeriesId, Product } from './types';
import type { ProductOverride } from './types/overrides';
import { PRODUCTS } from './data/products';
import { getCategoryConfig } from './config/filterConfig';
import { PLC_TREE, getDefaultSubType } from './config/plcTreeConfig';
import { useMergedProducts } from './hooks/useMergedProducts';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import LeftPanel from './components/LeftPanel';
import PlcLeftPanel from './components/PlcLeftPanel';
import ProductTable from './components/ProductTable';
import CartPage from './components/CartPage';
import ComparePage from './components/ComparePage';
import SpecModal from './components/SpecModal';
import AdminPanel from './components/AdminPanel';

type ViewMode = 'main' | 'cart' | 'compare';

const CATEGORY_LABELS: Record<CategoryId, string> = {
  PLC: 'PLC',
  IPC: 'IPC / IAC',
  SCADA: 'SCADA',
  XPANEL: 'XPANEL',
};

const ALL_CATEGORY_IDS: CategoryId[] = ['PLC', 'IPC', 'SCADA', 'XPANEL'];

function filterPlcProducts(allProducts: Product[], plcSeries: PlcSeriesId, activeSubType: string) {
  return allProducts.filter(
    (p) => p.category === 'PLC' && p.plcSeries === plcSeries && p.subType === activeSubType,
  );
}

function filterByConfig(
  allProducts: Product[],
  categoryId: 'IPC' | 'SCADA' | 'XPANEL',
  activeSubType: string,
  filters: FilterValues,
) {
  const config = getCategoryConfig(categoryId);
  if (!config) return [];
  const subType = config.subTypes.find((s) => s.id === activeSubType);
  if (!subType) return [];
  return allProducts.filter((p) => {
    if (p.category !== categoryId) return false;
    if (!subType.matcher(p)) return false;
    return subType.filters.every((section) => {
      const selected = filters[section.id] ?? [];
      return section.matcher(p, selected);
    });
  });
}

// ── 앱 내부 (AdminProvider 안에서 렌더링) ────────────────────
function AppInner() {
  const { products, overrides, refresh } = useMergedProducts();
  const { isAdmin, saveOp } = useAdmin();

  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('PLC');
  const [cartList, setCartList] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const [plcSeries, setPlcSeries] = useState<PlcSeriesId>('CM1');
  const [plcSubType, setPlcSubType] = useState<string>(getDefaultSubType('CM1'));

  const [activeSubType, setActiveSubType] = useState<string>('');
  const [filters, setFilters] = useState<FilterValues>({});

  function handleCategoryChange(catId: CategoryId) {
    setActiveCategory(catId);
    if (catId !== 'PLC') {
      const config = getCategoryConfig(catId);
      if (config?.subTypes.length) setActiveSubType(config.subTypes[0].id);
      setFilters({});
    }
  }

  function handlePlcSeriesChange(s: PlcSeriesId) {
    setPlcSeries(s);
    setPlcSubType(getDefaultSubType(s));
  }

  function handleCartToggle(id: string) {
    setCartList((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleCompareToggle(id: string) {
    setCompareList((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSaveOverride(override: ProductOverride, deleteOverride?: boolean) {
    const op = deleteOverride ? 'delete_override' : 'upsert_override';
    const data = deleteOverride ? { productId: override.productId } : override;
    await saveOp(op, data, overrides, refresh);
  }

  let displayProducts: Product[] = [];
  if (activeCategory === 'PLC') {
    displayProducts = filterPlcProducts(products, plcSeries, plcSubType);
  } else if (activeCategory === 'IPC' || activeCategory === 'SCADA' || activeCategory === 'XPANEL') {
    displayProducts = filterByConfig(products, activeCategory, activeSubType, filters);
  }

  function getRightTitle(): string {
    if (activeCategory === 'PLC') {
      const tree = PLC_TREE[plcSeries];
      for (const group of tree) {
        const leaf = group.children.find((c) => c.id === plcSubType);
        if (leaf) return `${plcSeries === 'CM1' ? 'PLC' : 'PLC-S'} — ${group.label} > ${leaf.label}`;
      }
      return 'PLC';
    }
    const config = getCategoryConfig(activeCategory);
    const st = config?.subTypes.find((s) => s.id === activeSubType);
    return `${CATEGORY_LABELS[activeCategory]} — ${st?.label ?? ''}`;
  }

  const baseSpecsForDetail = detailProduct
    ? (PRODUCTS.find((p) => p.id === detailProduct.id)?.specs ?? detailProduct.specs)
    : undefined;

  if (viewMode === 'cart') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader cartCount={cartList.length} compareCount={compareList.length} onCartClick={() => setViewMode('cart')} onCompareClick={() => setViewMode('compare')} viewMode={viewMode} />
        <CartPage cartList={cartList} products={products} onRemove={handleCartToggle} onClear={() => setCartList([])} onBack={() => setViewMode('main')} />
      </div>
    );
  }

  if (viewMode === 'compare') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader cartCount={cartList.length} compareCount={compareList.length} onCartClick={() => setViewMode('cart')} onCompareClick={() => setViewMode('compare')} viewMode={viewMode} />
        <ComparePage compareList={compareList} products={products} onRemove={handleCompareToggle} onClear={() => setCompareList([])} onBack={() => setViewMode('main')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader cartCount={cartList.length} compareCount={compareList.length} onCartClick={() => setViewMode('cart')} onCompareClick={() => setViewMode('compare')} viewMode={viewMode} />

      {/* 카테고리 탭 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-6">
          <nav className="flex gap-1">
            {ALL_CATEGORY_IDS.map((catId) => {
              const active = activeCategory === catId;
              return (
                <button key={catId} onClick={() => handleCategoryChange(catId)} className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  {CATEGORY_LABELS[catId]}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 본문 */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6">
        <div className="flex gap-5 items-start">
          {activeCategory === 'PLC' ? (
            <PlcLeftPanel plcSeries={plcSeries} onPlcSeriesChange={handlePlcSeriesChange} activeSubType={plcSubType} onSubTypeChange={setPlcSubType} />
          ) : (
            <LeftPanel categoryId={activeCategory} activeSubType={activeSubType} onSubTypeChange={(id) => { setActiveSubType(id); setFilters({}); }} filters={filters} onFiltersChange={setFilters} />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-700">{getRightTitle()}</h2>
              <div className="flex items-center gap-3">
                {isAdmin && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">편집 모드</span>}
                <span className="text-sm text-gray-400">총 {displayProducts.length}개</span>
              </div>
            </div>
            <ProductTable products={displayProducts} cartList={cartList} compareList={compareList} onCartToggle={handleCartToggle} onCompareToggle={handleCompareToggle} onViewDetail={setDetailProduct} />
          </div>
        </div>
      </main>

      {detailProduct && (
        <SpecModal
          product={detailProduct}
          baseSpecs={baseSpecsForDetail}
          overrides={overrides}
          onClose={() => setDetailProduct(null)}
          onSaveOverride={handleSaveOverride}
        />
      )}
    </div>
  );
}

// ── 공통 헤더 ─────────────────────────────────────────────────
function AppHeader({
  cartCount, compareCount, onCartClick, onCompareClick, viewMode,
}: {
  cartCount: number; compareCount: number;
  onCartClick: () => void; onCompareClick: () => void; viewMode: ViewMode;
}) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-700 tracking-tight">CIMON</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">제품 선택 가이드</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCompareClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'compare' ? 'bg-blue-600 text-white' : compareCount > 0 ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            비교
            {compareCount > 0 && <span className={`ml-0.5 rounded-full text-xs px-1.5 py-0.5 font-bold ${viewMode === 'compare' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>{compareCount}</span>}
          </button>
          <button onClick={onCartClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'cart' ? 'bg-blue-600 text-white' : cartCount > 0 ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4m4-4v4" /></svg>
            담기
            {cartCount > 0 && <span className={`ml-0.5 rounded-full text-xs px-1.5 py-0.5 font-bold ${viewMode === 'cart' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>{cartCount}</span>}
          </button>
          <AdminPanel />
        </div>
      </div>
    </header>
  );
}

// ── 진입점 ────────────────────────────────────────────────────
export default function App() {
  return (
    <AdminProvider>
      <AppInner />
    </AdminProvider>
  );
}
