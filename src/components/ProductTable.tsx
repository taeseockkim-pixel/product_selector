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
      <div className="w-14 h-10 bg-[#f2f2f2] rounded-lg flex items-center justify-center text-[#999999] text-[10px] select-none">
        NO IMG
      </div>
    );
  }
  return (
    <img src={src} alt={id} className="w-14 h-10 object-contain rounded-lg bg-[#f2f2f2]"
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
        <p className="text-[#999999] text-sm whitespace-pre-line">{t(UI.noProducts)}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto">
      <table className="w-full text-sm bg-white rounded-2xl shadow-sm overflow-hidden">
        <thead>
          <tr className="bg-[#191919] text-[#999999] text-xs font-semibold uppercase tracking-widest">
            <th className="px-4 py-3.5 text-left w-20">{t(UI.colImage)}</th>
            <th className="px-4 py-3.5 text-left w-40">{t(UI.colModelName)}</th>
            <th className="px-4 py-3.5 text-left">{t(UI.colDesc)}</th>
            <th className="px-4 py-3.5 text-center w-20">{t(UI.colSpecs)}</th>
            <th className="px-4 py-3.5 text-center w-16">{t(UI.colAdd)}</th>
            <th className="px-4 py-3.5 text-center w-16">{t(UI.colCompare)}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f0f0]">
          {products.map((p) => {
            const inCart = cartList.includes(p.id);
            const inCompare = compareList.includes(p.id);
            const desc = lang === 'en' ? (p.descriptionEn ?? p.description) : p.description;
            const series = lang === 'en' ? (p.seriesLabelEn ?? p.seriesLabel) : p.seriesLabel;
            return (
              <tr key={p.id} className="hover:bg-[#f2f2f2] transition-colors border-b border-[#f0f0f0] last:border-0">
                <td className="px-4 py-3">
                  <ProductImage id={p.id} subType={p.subType} />
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-[#191919]">{p.modelName}</span>
                  <span className="block text-xs text-[#999999] mt-0.5">{series}</span>
                </td>
                <td className="px-4 py-3 text-[#999999] text-xs leading-relaxed">{desc}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onViewDetail(p)}
                    className="px-2.5 py-1 rounded-lg bg-[#f2f2f2] hover:bg-[#e0e0e0] text-[#333333] text-xs transition-colors"
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
                        ? 'bg-[#f2f2f2] text-[#333333] hover:bg-[#e0e0e0]'
                        : 'bg-[#191919] text-white hover:bg-[#333333]'
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
                        ? 'border-[#191919] bg-[#191919] text-white'
                        : 'border-[#cccccc] text-[#999999] hover:border-[#333333] hover:text-[#333333]'
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
