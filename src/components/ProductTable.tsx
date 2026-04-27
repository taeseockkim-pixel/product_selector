import { useState } from 'react';
import type { Product } from '../types';
import { resolveProductImage } from '../utils/imageResolver';

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
    <img
      src={src}
      alt={id}
      className="w-14 h-10 object-contain rounded-lg bg-gray-50"
      onError={() => setFailed(true)}
    />
  );
}

export default function ProductTable({
  products,
  cartList,
  compareList,
  onCartToggle,
  onCompareToggle,
  onViewDetail,
}: Props) {
  if (products.length === 0) {
    return (
      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-sm">
          조건에 맞는 제품이 없습니다.
          <br />
          필터 조건을 조정해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto">
      <table className="w-full text-sm bg-white rounded-xl border border-gray-200 overflow-hidden">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wide">
            <th className="px-4 py-3 text-left w-20">모델</th>
            <th className="px-4 py-3 text-left w-40">모델명</th>
            <th className="px-4 py-3 text-left">설명</th>
            <th className="px-4 py-3 text-center w-20">사양</th>
            <th className="px-4 py-3 text-center w-16">담기</th>
            <th className="px-4 py-3 text-center w-16">비교</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((p) => {
            const inCart = cartList.includes(p.id);
            const inCompare = compareList.includes(p.id);
            return (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                {/* 이미지 */}
                <td className="px-4 py-3">
                  <ProductImage id={p.id} subType={p.subType} />
                </td>

                {/* 모델명 */}
                <td className="px-4 py-3">
                  <span className="font-semibold text-gray-800">{p.modelName}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">{p.seriesLabel}</span>
                </td>

                {/* 설명 */}
                <td className="px-4 py-3 text-gray-500 text-xs leading-relaxed">
                  {p.description}
                </td>

                {/* 사양 */}
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onViewDetail(p)}
                    className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs transition-colors"
                  >
                    상세
                  </button>
                </td>

                {/* 담기 */}
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onCartToggle(p.id)}
                    title={inCart ? '담기 취소' : '담기'}
                    className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-colors text-base leading-none font-bold ${
                      inCart
                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {inCart ? '✓' : '+'}
                  </button>
                </td>

                {/* 비교 */}
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onCompareToggle(p.id)}
                    title={inCompare ? '비교 해제' : '비교 추가'}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mx-auto transition-colors text-xs font-bold ${
                      inCompare
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500'
                    }`}
                  >
                    비
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
