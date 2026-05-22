import { useState } from 'react';
import type { Product } from '../types';
import { resolveProductImage } from '../utils/imageResolver';
import { useT, useLang } from '../context/LangContext';
import { UI } from '../i18n/ui';

interface Props {
  products: Product[];
  cartList: string[];
  compareList: string[];
  onCartToggle: (id: string) => void;
  onCompareToggle: (id: string) => void;
  onViewDetail: (product: Product) => void;
}

function ProductImage({ id, subType }: { id: string; subType: string }) {
  const [failed, setFailed] = useState(false);
  const src = resolveProductImage(id, subType);
  if (!src || failed) {
    return (
      <div className="w-14 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-[10px] select-none">
        NO IMG
      </div>
    );
  }
  return (
    <img src={src} alt={id} className="w-14 h-10 object-contain rounded-lg bg-gray-50"
      onError={() => setFailed(true)} />
  );
}

export default function ProductTable({
  products, cartList, compareList, onCartToggle, onCompareToggle, onViewDetail,
}: Props) {
  const t = useT();
  const { lang } = useLang();

  if (products.length === 0) {
    return (
      <div className="flex-1 bg-white rounded-2xl shadow-sm p-12 text-center">
        <p className="text-gray-400 text-sm whitespace-pre-line">{t(UI.noProducts)}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto">
      <table className="w-full text-sm bg-white rounded-2xl shadow-sm overflow-hidden">
        <thead>
          <tr className="bg-gray-900 text-gray-300 text-xs font-semibold uppercase tracking-widest">
            <th className="px-4 py-3.5 text-left w-20">{t(UI.colImage)}</th>
            <th className="px-4 py-3.5 text-left w-40">{t(UI.colModelName)}</th>
            <th className="px-4 py-3.5 text-left">{t(UI.colDesc)}</th>
            <th className="px-4 py-3.5 text-center w-20">{t(UI.colSpecs)}</th>
            <th className="px-4 py-3.5 text-center w-16">{t(UI.colAdd)}</th>
            <th className="px-4 py-3.5 text-center w-16">{t(UI.colCompare)}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((p) => {
            const inCart = cartList.includes(p.id);
            const inCompare = compareList.includes(p.id);
            const desc = lang === 'en' ? (p.descriptionEn ?? p.description) : p.description;
            const series = lang === 'en' ? (p.seriesLabelEn ?? p.seriesLabel) : p.seriesLabel;
            return (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                <td className="px-4 py-3">
                  <ProductImage id={p.id} subType={p.subType} />
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-gray-800">{p.modelName}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">{series}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs leading-relaxed">{desc}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onViewDetail(p)}
                    className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs transition-colors"
                  >
                    {t(UI.detailBtn)}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onCartToggle(p.id)}
                    title={inCart ? t(UI.cancelAdd) : t(UI.shortlist)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-colors text-base leading-none font-bold ${
                      inCart
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}
                  >
                    {inCart ? '✓' : '+'}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onCompareToggle(p.id)}
                    title={inCompare ? t(UI.removeCompare) : t(UI.addToCompare)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mx-auto transition-colors text-xs font-bold ${
                      inCompare
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600'
                    }`}
                  >
                    {lang === 'ko' ? '비' : 'C'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
