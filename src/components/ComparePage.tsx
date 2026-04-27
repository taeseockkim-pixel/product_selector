import type { Product } from '../types';

interface Props {
  compareList: string[];
  products: Product[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onBack: () => void;
}

function buildRows(prods: Product[]) {
  const labelOrder: string[] = [];
  const labelSet = new Set<string>();
  prods.forEach((p) =>
    p.specs.forEach((s) => {
      if (!labelSet.has(s.label)) {
        labelSet.add(s.label);
        labelOrder.push(s.label);
      }
    }),
  );
  return labelOrder.map((label) => {
    const values = prods.map((p) => p.specs.find((s) => s.label === label)?.value ?? '—');
    const unique = new Set(values.filter((v) => v !== '—'));
    const isDiff = unique.size > 1;
    return { label, values, isDiff };
  });
}

export default function ComparePage({
  compareList,
  products,
  onRemove,
  onClear,
  onBack,
}: Props) {
  const compareProducts = products.filter((p) => compareList.includes(p.id));
  const rows = buildRows(compareProducts);

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
            제품 비교
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({compareProducts.length}개 선택됨)
            </span>
          </h1>
        </div>
        {compareProducts.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-red-400 hover:text-red-600 transition-colors"
          >
            비교 목록 비우기
          </button>
        )}
      </div>

      {compareProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">비교할 제품이 없습니다.</p>
          <button onClick={onBack} className="mt-4 text-sm text-blue-500 hover:text-blue-700">
            제품 목록으로 돌아가기
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {/* 사양 헤더 */}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-36">
                    사양
                  </th>
                  {/* 제품별 헤더 */}
                  {compareProducts.map((p) => (
                    <th key={p.id} className="px-4 py-3 text-left min-w-48">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{p.modelName}</p>
                          <p className="text-xs text-gray-400 font-normal mt-0.5">{p.seriesLabel}</p>
                          <p className="text-xs text-gray-500 font-normal mt-0.5 leading-tight">
                            {p.description}
                          </p>
                        </div>
                        <button
                          onClick={() => onRemove(p.id)}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors text-base leading-none mt-0.5"
                          title="비교에서 제거"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={compareProducts.length + 1}
                      className="px-4 py-8 text-center text-gray-400 text-sm"
                    >
                      비교할 사양 항목이 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.label}
                      className={`border-b border-gray-50 ${
                        row.isDiff ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 text-xs font-semibold text-gray-500 align-top">
                        {row.label}
                        {row.isDiff && (
                          <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />
                        )}
                      </td>
                      {row.values.map((val, i) => (
                        <td
                          key={i}
                          className={`px-4 py-2.5 text-sm align-top ${
                            val === '—' ? 'text-gray-300' : 'text-gray-800'
                          } ${row.isDiff ? 'font-medium' : ''}`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 범례 */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-gray-400">노란 행: 제품 간 사양 차이 있음</span>
          </div>
        </div>
      )}
    </div>
  );
}
