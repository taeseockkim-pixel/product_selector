import { useState, useEffect, useRef } from 'react';
import type { Product } from '../types';
import { useT, useLang } from '../context/LangContext';
import { UI } from '../i18n/ui';

type CategoryId = 'PLC' | 'IPC' | 'SCADA' | 'XPANEL';

const CATEGORY_ORDER: CategoryId[] = ['PLC', 'IPC', 'SCADA', 'XPANEL'];
const CATEGORY_LABELS: Record<CategoryId, string> = {
  PLC: 'PLC',
  IPC: 'IPC / IAC',
  SCADA: 'SCADA',
  XPANEL: 'XPANEL',
};

interface Props {
  products: Product[];
  cartList: string[];
  compareList: string[];
  onCartToggle: (id: string) => void;
  onCompareToggle: (id: string) => void;
  onViewDetail: (p: Product) => void;
  onClose: () => void;
}

export default function SearchOverlay({
  products, cartList, compareList, onCartToggle, onCompareToggle, onViewDetail, onClose,
}: Props) {
  const t = useT();
  const { lang } = useLang();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const q = query.toLowerCase().trim();
  const matched = q
    ? products.filter((p) =>
        p.modelName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.descriptionEn ?? '').toLowerCase().includes(q),
      )
    : [];

  const grouped = CATEGORY_ORDER.reduce<Partial<Record<CategoryId, Product[]>>>((acc, cat) => {
    const prods = matched.filter((p) => p.category === cat);
    if (prods.length > 0) acc[cat] = prods;
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#f0ede8] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#ddd9d2]">
          <svg className="w-5 h-5 text-[#999999] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(UI.searchPlaceholder)}
            className="flex-1 text-sm outline-none text-[#191919] placeholder-[#999999]"
          />
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-[#999999] hover:text-[#191919] text-xl leading-none rounded-full hover:bg-[#e6e2dc] transition-colors"
          >
            ×
          </button>
        </div>

        {/* 검색 결과 */}
        <div className="max-h-[60vh] overflow-y-auto">
          {q === '' ? (
            <div className="p-8 text-center text-sm text-[#999999]">
              {t(UI.searchPlaceholder)}
            </div>
          ) : matched.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#999999]">{t(UI.searchNoResults)}</div>
          ) : (
            (Object.entries(grouped) as [CategoryId, Product[]][]).map(([cat, prods]) => (
              <div key={cat}>
                <div className="px-4 py-2 bg-[#e6e2dc] border-y border-[#ddd9d2] flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#999999] uppercase tracking-[0.2em]">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="text-xs text-[#999999]">({prods.length})</span>
                </div>
                {prods.map((p) => {
                  const desc = lang === 'en' ? (p.descriptionEn ?? p.description) : p.description;
                  const inCart = cartList.includes(p.id);
                  const inCompare = compareList.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-[#e6e2dc] border-b border-[#ddd9d2] last:border-0 transition-colors"
                    >
                      <button className="flex-1 text-left min-w-0" onClick={() => onViewDetail(p)}>
                        <p className="font-semibold text-[#191919] text-sm">{p.modelName}</p>
                        <p className="text-xs text-[#999999] mt-0.5 truncate">{desc}</p>
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <button
                          onClick={() => onCartToggle(p.id)}
                          title={inCart ? t(UI.cancelAdd) : t(UI.shortlist)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                            inCart
                              ? 'bg-orange-500 text-white'
                              : 'bg-[#191919] text-white hover:bg-[#333333]'
                          }`}
                        >
                          {inCart ? '✓' : '+'}
                        </button>
                        <button
                          onClick={() => onCompareToggle(p.id)}
                          title={inCompare ? t(UI.removeCompare) : t(UI.addToCompare)}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                            inCompare
                              ? 'border-orange-500 bg-orange-500 text-white'
                              : 'border-[#cccccc] text-[#999999] hover:border-[#333333] hover:text-[#333333]'
                          }`}
                        >
                          {lang === 'ko' ? '비' : 'C'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
