import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { resolveProductImage } from '../utils/imageResolver';
import { getCatalogUrl } from '../config/catalogConfig';

// ── 카탈로그 버튼 ────────────────────────────────────────────
function CatalogButton({ subType }: { subType: string }) {
  const [open, setOpen] = useState(false);
  const url = getCatalogUrl(subType);
  if (!url) return null;

  return (
    <div className="relative inline-block">
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        카탈로그
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[168px]">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            새 탭에서 열기
          </a>
          <a
            href={url}
            download
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            파일 다운로드
          </a>
        </div>
      )}
    </div>
  );
}

// ── 메인 모달 ────────────────────────────────────────────────
export default function SpecModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const imageSrc = resolveProductImage(product.id, product.subType);
  const verifiedSpecs = product.specs.filter((s) => s.source !== 'estimated');

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{product.modelName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {/* 이미지 + 기본 정보 */}
          <div className="flex gap-5">
            {/* 제품 이미지 (확대) */}
            {imageSrc && !imgFailed ? (
              <img
                src={imageSrc}
                alt={product.modelName}
                className="flex-shrink-0 w-44 h-36 object-contain rounded-xl bg-gray-50 border border-gray-100"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="flex-shrink-0 w-44 h-36 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300 text-xs select-none">
                NO IMAGE
              </div>
            )}

            {/* 시리즈 / 설명 / 카탈로그 */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <p className="text-sm font-semibold text-blue-600">{product.seriesLabel}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
              <div className="mt-auto pt-1">
                <CatalogButton subType={product.subType} />
              </div>
            </div>
          </div>

          {/* 사양 테이블 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              상세 사양
            </p>
            {verifiedSpecs.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                상세 사양 정보 없음 (카탈로그 검증 후 업데이트 예정)
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {verifiedSpecs.map((s) => (
                    <tr key={s.label}>
                      <td className="py-2 pr-4 font-medium text-gray-500 w-44 align-top">
                        {s.label}
                      </td>
                      <td className="py-2 text-gray-800">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
