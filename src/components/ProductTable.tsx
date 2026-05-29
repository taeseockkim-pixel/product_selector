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
      <div className="w-14 h-10 bg-gray-100 rounded flex items-center justify-center text-[#a0a0a0] text-[10px] select-none border border-gray-200">
        NO IMG
      </div>
    );
  }
  return (
    <img src={src} alt={id} className="w-14 h-10 object-contain rounded bg-gray-100 border border-gray-200"
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
      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-[#666666] text-sm whitespace-pre-line">{t(UI.noProducts)}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto rounded-lg border border-gray-200 overflow-hidden">
      {/* table-fixed: 각 열 너비 정확히 고정. 모델명 220px로 줄바꿈 방지 */}
      <table className="w-full text-sm bg-white table-fixed">
        <colgroup>
          <col className="w-[70px]" />   {/* 이미지 */}
          <col className="w-[220px]" />  {/* 모델명 */}
          <col />                        {/* 설명 — 나머지 전체 */}
          <col className="w-[82px]" />   {/* 스펙 */}
          <col className="w-[52px]" />   {/* 담기 */}
          <col className="w-[52px]" />   {/* 비교 */}
        </colgroup>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-[#555555] text-xs font-semibold uppercase tracking-wider">
            <th className="px-3 py-2.5 text-left">{t(UI.colImage)}</th>
            <th className="px-3 py-2.5 text-left">{t(UI.colModelName)}</th>
            <th className="px-4 py-2.5 text-left">{t(UI.colDesc)}</th>
            <th className="px-2 py-2.5 text-center">{t(UI.colSpecs)}</th>
            <th className="px-1 py-2.5 text-center">{t(UI.colAdd)}</th>
            <th className="px-1 py-2.5 text-center">{t(UI.colCompare)}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {products.map((p, idx) => {
            const inCart = cartList.includes(p.id);
            const inCompare = compareList.includes(p.id);
            const desc = lang === 'en' ? (p.descriptionEn ?? p.description) : p.description;
            const series = lang === 'en' ? (p.seriesLabelEn ?? p.seriesLabel) : p.seriesLabel;
            const isEven = idx % 2 === 1;
            return (
              <tr key={p.id} className={`hover:bg-sky-50 transition-colors ${isEven ? 'bg-gray-50' : 'bg-white'}`}>
                <td className="px-3 py-2.5">
                  <ProductImage id={p.id} subType={p.subType} />
                </td>
                <td className="px-3 py-2.5">
                  {/* truncate: 220px 초과 모델명은 말줄임 처리 */}
                  <span className="font-semibold text-[#191919] block truncate" title={p.modelName}>{p.modelName}</span>
                  <span className="block text-xs text-[#666666] mt-0.5 truncate">{series}</span>
                </td>
                <td className="px-4 py-2.5 text-[#333333] text-sm leading-relaxed">{desc}</td>
                <td className="px-2 py-2.5 text-center">
                  <button
                    onClick={() => onViewDetail(p)}
                    className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-[#333333] text-xs transition-colors whitespace-nowrap"
                  >
                    {t(UI.detailBtn)}
                  </button>
                </td>
                <td className="px-1 py-2.5 text-center">
                  <button
                    onClick={() => onCartToggle(p.id)}
                    title={inCart ? t(UI.cancelAdd) : t(UI.shortlist)}
                    className={`w-8 h-8 rounded border-2 flex items-center justify-center mx-auto transition-colors text-base leading-none font-bold ${
                      inCart
                        ? 'border-orange-500 bg-orange-500 text-white hover:bg-orange-600 hover:border-orange-600'
                        : 'border-[#cccccc] text-[#999999] hover:border-[#333333] hover:text-[#333333]'
                    }`}
                  >
                    {inCart ? '✓' : '+'}
                  </button>
                </td>
                <td className="px-1 py-2.5 text-center">
                  <button
                    onClick={() => onCompareToggle(p.id)}
                    title={inCompare ? t(UI.removeCompare) : t(UI.addToCompare)}
                    className={`w-8 h-8 rounded border-2 flex items-center justify-center mx-auto transition-colors text-xs font-bold ${
                      inCompare
                        ? 'border-orange-500 bg-orange-500 text-white'
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
