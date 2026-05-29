import type { Product } from '../types';
import { useT, useLang } from '../context/LangContext';
import { UI } from '../i18n/ui';
import { translateSpecLabel } from '../i18n/specLabels';
import { translateSpecValue } from '../i18n/specValues';

interface Props {
  compareList: string[];
  products: Product[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onBack: () => void;
}

function buildRows(prods: Product[], lang: 'ko' | 'en') {
  const labelOrder: string[] = [];
  const labelSet = new Set<string>();
  prods.forEach((p) =>
    p.specs.forEach((s) => {
      if (!labelSet.has(s.label)) { labelSet.add(s.label); labelOrder.push(s.label); }
    }),
  );
  return labelOrder.map((label) => {
    const values = prods.map((p) => p.specs.find((s) => s.label === label)?.value ?? '—');
    const unique = new Set(values.filter((v) => v !== '—'));
    const isDiff = unique.size > 1;
    return {
      label: translateSpecLabel(label, lang),
      values: values.map((v) => v === '—' ? '—' : translateSpecValue(v, lang)),
      isDiff,
    };
  });
}

function downloadCSV(rows: ReturnType<typeof buildRows>, prods: Product[]) {
  const BOM = '﻿';
  const header = ['사양', ...prods.map((p) => p.modelName)].join(',');
  const dataRows = rows.map((row) =>
    [row.label, ...row.values]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  const csv = BOM + [header, ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CIMON_비교_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ComparePage({
  compareList, products, onRemove, onClear, onBack,
}: Props) {
  const t = useT();
  const { lang } = useLang();
  const compareProducts = products.filter((p) => compareList.includes(p.id));
  const rows = buildRows(compareProducts, lang);

  return (
    <div className="max-w-screen-xl mx-auto w-full px-6 py-6">
      {/* 인쇄 전용 헤더 */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center gap-3 mb-2">
          <img src="/products/CIMON_Logo.png" alt="CIMON" className="h-8 w-auto object-contain" />
          <span className="text-lg font-bold font-headline text-[#191919]">{t(UI.compareTitle)}</span>
        </div>
        <p className="text-xs text-[#999999]">{new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex items-center justify-between mb-5 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191919] text-white text-sm font-medium hover:bg-[#333333] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t(UI.back)}
          </button>
          <h1 className="text-lg font-bold text-[#191919]">
            {t(UI.compareTitle)}
            <span className="ml-2 text-sm font-normal text-[#999999]">
              ({compareProducts.length}{lang === 'ko' ? '개 선택됨' : ' selected'})
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {compareProducts.length > 0 && (
            <>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#e6e2dc] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {t(UI.printBtn)}
              </button>
              <button
                onClick={() => downloadCSV(rows, compareProducts)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#e6e2dc] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t(UI.csvExport)}
              </button>
            </>
          )}
          {compareProducts.length > 0 && (
            <button onClick={onClear} className="text-sm text-red-400 hover:text-red-600 transition-colors">
              {t(UI.clearCompare)}
            </button>
          )}
        </div>
      </div>

      {compareProducts.length === 0 ? (
        <div className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] p-16 text-center">
          <p className="text-[#999999] text-sm">{t(UI.noCompare)}</p>
          <button onClick={onBack} className="mt-4 text-sm text-[#555555] hover:text-[#191919]">
            {t(UI.goToList)}
          </button>
        </div>
      ) : (
        <div className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#4a4a4a] border-b border-[#565656]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#888888] uppercase tracking-[0.2em] w-36">
                    {t(UI.specCol)}
                  </th>
                  {compareProducts.map((p) => {
                    const desc = lang === 'en' ? (p.descriptionEn ?? p.description) : p.description;
                    const series = lang === 'en' ? (p.seriesLabelEn ?? p.seriesLabel) : p.seriesLabel;
                    return (
                      <th key={p.id} className="px-4 py-3 text-left min-w-48">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-white text-sm">{p.modelName}</p>
                            <p className="text-xs text-[#999999] font-normal mt-0.5">{series}</p>
                            <p className="text-xs text-[#c8c5c0] font-normal mt-0.5 leading-tight">{desc}</p>
                          </div>
                          <button
                            onClick={() => onRemove(p.id)}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[#999999] hover:text-red-400 flex-shrink-0 transition-colors text-base leading-none mt-0.5 no-print"
                            title={t(UI.removeFromComp)}
                          >
                            ×
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={compareProducts.length + 1} className="px-4 py-8 text-center text-[#999999] text-sm">
                      {t(UI.noCompareSpecs)}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.label}
                      className={`border-b border-[#ddd9d2] ${row.isDiff ? 'bg-amber-50' : ''}`}
                    >
                      <td className="px-4 py-2.5 text-xs font-semibold text-[#333333] align-top">
                        {row.label}
                        {row.isDiff && (
                          <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />
                        )}
                      </td>
                      {row.values.map((val, i) => (
                        <td
                          key={i}
                          className={`px-4 py-2.5 text-sm align-top ${
                            val === '—' ? 'text-[#999999]' : 'text-[#191919]'
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

          <div className="px-4 py-3 border-t border-[#ddd9d2] bg-[#e6e2dc] flex items-center gap-2 no-print">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-[#999999]">{t(UI.diffLegend)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
