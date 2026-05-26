import { useState } from 'react';
import type { Product } from '../types';
import { resolveProductImage } from '../utils/imageResolver';
import { useT, useLang } from '../context/LangContext';
import { UI } from '../i18n/ui';
import { translateSpecLabel } from '../i18n/specLabels';
import { translateSpecValue } from '../i18n/specValues';

const INQUIRY_EMAIL = 'sales@cimon.com';

function buildMailto(products: Product[], lang: 'ko' | 'en'): string {
  const subject = lang === 'ko' ? 'CIMON 제품 견적 요청' : 'CIMON Product Inquiry';
  const intro = lang === 'ko'
    ? '안녕하세요,\n\n아래 제품에 대한 견적을 요청드립니다.\n\n[제품 목록]'
    : 'Hello,\n\nI would like to request a quote for the following products.\n\n[Product List]';
  const lines = products.map((p) => {
    const desc = lang === 'en' ? (p.descriptionEn ?? p.description) : p.description;
    return `- ${p.modelName}: ${desc}`;
  });
  const footer = lang === 'ko'
    ? '\n\n---\n이름: \n연락처: \n회사: '
    : '\n\n---\nName: \nContact: \nCompany: ';
  const body = `${intro}\n${lines.join('\n')}${footer}`;
  return `mailto:${INQUIRY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function CartImage({ product: p }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  const src = resolveProductImage(p.id, p.subType ?? '');
  if (!src || failed) {
    return <span className="text-[#999999] text-xs font-medium">{p.modelName.slice(0, 3)}</span>;
  }
  return (
    <img src={src} alt={p.modelName} className="w-full h-full object-contain"
      onError={() => setFailed(true)} />
  );
}

interface Props {
  cartList: string[];
  products: Product[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onBack: () => void;
}

function SpecTable({ specs }: { specs: Product['specs'] }) {
  const { lang } = useLang();
  if (specs.length === 0) return <p className="text-xs text-[#999999] italic">{lang === 'ko' ? '사양 정보 없음' : 'No spec data'}</p>;
  return (
    <table className="w-full text-xs mt-2 border-t border-[#f0f0f0]">
      <tbody>
        {specs.map((s) => (
          <tr key={s.label} className="border-b border-[#f5f5f5]">
            <td className="py-1.5 pr-4 font-medium text-[#333333] w-36 align-top">
              {translateSpecLabel(s.label, lang)}
            </td>
            <td className="py-1.5 text-[#191919]">{translateSpecValue(s.value, lang)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CartPage({ cartList, products, onRemove, onClear, onBack }: Props) {
  const t = useT();
  const { lang } = useLang();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const cartProducts = products.filter((p) => cartList.includes(p.id));

  function toggleExpand(id: string) {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6">
      {/* 인쇄 전용 헤더 */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center gap-3 mb-2">
          <img src="/products/CIMON_Logo.png" alt="CIMON" className="h-8 w-auto object-contain" />
          <span className="text-lg font-bold text-[#191919]">{t(UI.shortlistTitle)}</span>
        </div>
        <p className="text-xs text-[#999999]">{new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex items-center justify-between mb-5 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[#999999] hover:text-[#191919] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t(UI.back)}
          </button>
          <h1 className="text-lg font-bold text-[#191919]">
            {t(UI.shortlistTitle)}
            <span className="ml-2 text-sm font-normal text-[#999999]">
              ({cartProducts.length}{lang === 'ko' ? '개' : ''})
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {cartProducts.length > 0 && (
            <>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e0e0e0] text-sm text-[#333333] hover:bg-[#f2f2f2] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {t(UI.printBtn)}
              </button>
              <button
                onClick={() => window.open(buildMailto(cartProducts, lang))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191919] text-white text-sm font-medium hover:bg-[#333333] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t(UI.inquiryBtn)}
              </button>
            </>
          )}
          {cartProducts.length > 0 && (
            <button onClick={onClear} className="text-sm text-red-400 hover:text-red-600 transition-colors">
              {t(UI.clearList)}
            </button>
          )}
        </div>
      </div>

      {cartProducts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <p className="text-[#999999] text-sm">{t(UI.emptyShortlist)}</p>
          <button onClick={onBack} className="mt-4 text-sm text-[#333333] hover:text-[#191919]">
            {t(UI.goToList)}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cartProducts.map((p) => {
            const expanded = expandedIds.includes(p.id);
            const desc = lang === 'en' ? (p.descriptionEn ?? p.description) : p.description;
            const series = lang === 'en' ? (p.seriesLabelEn ?? p.seriesLabel) : p.seriesLabel;
            const verifiedSpecs = p.specs.filter((s) => s.source !== 'estimated');
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-12 bg-[#f2f2f2] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden no-print">
                      <CartImage product={p} />
                    </div>
                    <div>
                      <p className="font-semibold text-[#191919]">{p.modelName}</p>
                      <p className="text-xs text-[#999999] mt-0.5">{series}</p>
                      <p className="text-sm text-[#333333] mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 no-print">
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#e0e0e0] text-xs text-[#333333] hover:bg-[#f2f2f2] transition-colors"
                    >
                      <span>{t(UI.detailSpecs)}</span>
                      <svg
                        className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onRemove(p.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[#999999] hover:text-red-500 hover:bg-red-50 transition-colors text-lg leading-none"
                      title={t(UI.removeShortlist)}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* 사양 — 화면에서는 expanded일 때, 인쇄 시에는 항상 표시 */}
                <div className={`px-5 pb-4 border-t border-[#f0f0f0] bg-[#f2f2f2] ${expanded ? '' : 'hidden print:block'}`}>
                  <SpecTable specs={verifiedSpecs} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
