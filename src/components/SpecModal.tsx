import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { resolveProductImage } from '../utils/imageResolver';
import { getCatalogUrl, getManualEntries, getDrawingEntries } from '../config/catalogConfig';
import type { DocEntry } from '../config/catalogConfig';
import { getCertEntries } from '../config/certificationConfig';
import { useT, useLang } from '../context/LangContext';
import { UI } from '../i18n/ui';
import { translateSpecLabel } from '../i18n/specLabels';
import { translateSpecValue } from '../i18n/specValues';

type DocButtonColor = 'blue' | 'green' | 'orange' | 'purple';

const COLOR_CLASS: Record<DocButtonColor, string> = {
  blue:   'bg-[#f2f2f2] text-[#333333] hover:bg-[#e0e0e0]',
  green:  'bg-green-50 text-green-600 hover:bg-green-100',
  orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
  purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
};

function DocRow({ entry, onClose }: { entry: DocEntry; onClose: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const displayLabel = lang === 'en' && entry.labelEn ? entry.labelEn : entry.label;
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2 hover:bg-[#f2f2f2] transition-colors border-b border-[#f5f5f5] last:border-0">
      <span className="text-sm text-[#333333] truncate flex-1">{displayLabel}</span>
      <div className="flex items-center gap-1 flex-shrink-0">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="p-1 text-[#999999] hover:text-[#191919] transition-colors"
          title={t(UI.openTab)}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <a
          href={entry.url}
          download
          onClick={onClose}
          className="p-1 text-[#999999] hover:text-green-500 transition-colors"
          title={t(UI.downloadFile)}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      </div>
    </div>
  );
}

function DocButton({
  label, entries, color = 'blue', isOpen, onToggle,
}: {
  label: string;
  entries: DocEntry[];
  color?: DocButtonColor;
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="relative inline-block">
      {isOpen && <div className="fixed inset-0 z-10" onClick={onToggle} />}
      <button
        onClick={onToggle}
        className={`relative z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${COLOR_CLASS[color]}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        {label}
        {entries.length > 1 && (
          <span className="text-xs opacity-60">({entries.length})</span>
        )}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-[#e0e0e0] rounded-xl shadow-lg overflow-hidden min-w-[300px] max-w-[420px] max-h-64 overflow-y-auto">
          {entries.map((entry) => (
            <DocRow key={entry.url} entry={entry} onClose={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpecModal({
  product, onClose, allProducts, onViewDetail,
}: {
  product: Product;
  onClose: () => void;
  allProducts?: Product[];
  onViewDetail?: (p: Product) => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const [imgFailed, setImgFailed] = useState(false);
  const [openDocType, setOpenDocType] = useState<string | null>(null);
  function toggleDoc(type: string) {
    setOpenDocType((v) => (v === type ? null : type));
  }
  const imageSrc = resolveProductImage(product.id, product.subType);
  const verifiedSpecs = product.specs.filter((s) => s.source !== 'estimated');
  const similar = allProducts
    ? allProducts.filter((p) => p.subType === product.subType && p.id !== product.id).slice(0, 3)
    : [];

  const catalogUrl = getCatalogUrl(product.subType);
  const manualEntries = getManualEntries(product.subType);
  const drawingEntries = getDrawingEntries(product.subType);
  const certEntries = getCertEntries(product.subType);

  const desc = lang === 'en' ? (product.descriptionEn ?? product.description) : product.description;
  const series = lang === 'en' ? (product.seriesLabelEn ?? product.seriesLabel) : product.seriesLabel;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 제목 헤더 — 고정 영역 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0] flex-shrink-0">
          <h2 className="text-lg font-bold font-headline text-[#191919]">{product.modelName}</h2>
          <button
            onClick={onClose}
            className="text-[#999999] hover:text-[#191919] text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* 이미지 + 설명 + 문서 버튼 — 고정 영역 (overflow 없음, 드롭다운 자유롭게 확장) */}
        <div className="px-6 pt-5 pb-3 flex gap-5 flex-shrink-0">
          {imageSrc && !imgFailed ? (
            <img
              src={imageSrc}
              alt={product.modelName}
              className="flex-shrink-0 w-44 h-36 object-contain rounded-xl bg-[#f2f2f2] border border-[#e8e8e8]"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex-shrink-0 w-44 h-36 bg-[#f2f2f2] rounded-xl flex items-center justify-center text-[#999999] text-xs select-none">
              NO IMAGE
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <p className="text-sm font-semibold text-[#999999]">{series}</p>
            <p className="text-sm text-[#333333] leading-relaxed">{desc}</p>
            <div className="mt-auto pt-1 flex flex-wrap gap-2">
              {catalogUrl && (
                <DocButton
                  label={t(UI.catalog)}
                  entries={[{ label: lang === 'ko' ? '카탈로그 PDF' : 'Catalog PDF', url: catalogUrl }]}
                  color="blue"
                  isOpen={openDocType === 'catalog'}
                  onToggle={() => toggleDoc('catalog')}
                />
              )}
              {manualEntries.length > 0 && (
                <DocButton label={t(UI.manual)} entries={manualEntries} color="green"
                  isOpen={openDocType === 'manual'} onToggle={() => toggleDoc('manual')} />
              )}
              {drawingEntries.length > 0 && (
                <DocButton label={t(UI.drawing)} entries={drawingEntries} color="orange"
                  isOpen={openDocType === 'drawing'} onToggle={() => toggleDoc('drawing')} />
              )}
              {certEntries.length > 0 && (
                <DocButton label={t(UI.certification)} entries={certEntries} color="purple"
                  isOpen={openDocType === 'cert'} onToggle={() => toggleDoc('cert')} />
              )}
            </div>
          </div>
        </div>

        {/* 사양 목록 — 스크롤 영역 */}
        <div className="px-6 pb-5 overflow-y-auto">
          <p className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-3 mt-2">
            {t(UI.detailSpecs)}
          </p>
          {verifiedSpecs.length === 0 ? (
            <p className="text-xs text-[#999999] italic">{t(UI.noDetailSpecs)}</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[#f5f5f5]">
                {verifiedSpecs.map((s) => (
                  <tr key={s.label}>
                    <td className="py-2 pr-4 font-medium text-[#333333] w-44 align-top">
                      {translateSpecLabel(s.label, lang)}
                    </td>
                    <td className="py-2 text-[#191919]">{translateSpecValue(s.value, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {similar.length > 0 && onViewDetail && (
            <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
              <p className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-3">
                {t(UI.similarProducts)}
              </p>
              <div className="flex flex-col gap-2">
                {similar.map((p) => {
                  const pDesc = lang === 'en' ? (p.descriptionEn ?? p.description) : p.description;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onViewDetail(p)}
                      className="text-left px-3 py-2 rounded-lg hover:bg-[#f2f2f2] transition-colors border border-[#f0f0f0]"
                    >
                      <p className="text-sm font-semibold text-[#191919]">{p.modelName}</p>
                      <p className="text-xs text-[#999999] mt-0.5 truncate">{pDesc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
