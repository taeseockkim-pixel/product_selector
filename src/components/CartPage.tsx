import { useState } from 'react';
import type { Product } from '../types';

interface Props {
  cartList: string[];
  products: Product[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onBack: () => void;
}

function SpecTable({ specs }: { specs: Product['specs'] }) {
  if (specs.length === 0) return <p className="text-xs text-gray-400 italic">사양 정보 없음</p>;
  return (
    <table className="w-full text-xs mt-2 border-t border-gray-100">
      <tbody>
        {specs.map((s) => (
          <tr key={s.label} className="border-b border-gray-50">
            <td className="py-1.5 pr-4 font-medium text-gray-500 w-36 align-top">{s.label}</td>
            <td className="py-1.5 text-gray-800">{s.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CartPage({ cartList, products, onRemove, onClear, onBack }: Props) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const cartProducts = products.filter((p) => cartList.includes(p.id));

  function toggleExpand(id: string) {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6">
      {/* 상단 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            뒤로
          </button>
          <h1 className="text-lg font-bold text-gray-800">
            담은 제품 목록
            <span className="ml-2 text-sm font-normal text-gray-400">({cartProducts.length}개)</span>
          </h1>
        </div>
        {cartProducts.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-red-400 hover:text-red-600 transition-colors"
          >
            목록 비우기
          </button>
        )}
      </div>

      {cartProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">담은 제품이 없습니다.</p>
          <button onClick={onBack} className="mt-4 text-sm text-blue-500 hover:text-blue-700">
            제품 목록으로 돌아가기
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cartProducts.map((p) => {
            const expanded = expandedIds.includes(p.id);
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* 카드 헤더 */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    {/* 모델 이미지 placeholder */}
                    <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xs font-medium flex-shrink-0">
                      IMG
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{p.modelName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.seriesLabel}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <span>상세 사양</span>
                      <svg
                        className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onRemove(p.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-lg leading-none"
                      title="목록에서 제거"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* 상세 사양 */}
                {expanded && (
                  <div className="px-5 pb-4 border-t border-gray-100 bg-gray-50">
                    <SpecTable specs={p.specs} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
