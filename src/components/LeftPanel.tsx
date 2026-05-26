import type { CategoryId, FilterValues } from '../types';
import { getCategoryConfig } from '../config/filterConfig';
import { useT } from '../context/LangContext';
import { UI } from '../i18n/ui';
import { useLang } from '../context/LangContext';

interface Props {
  categoryId: CategoryId;
  activeSubType: string;
  onSubTypeChange: (id: string) => void;
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClose?: () => void;
}

export default function LeftPanel({
  categoryId, activeSubType, onSubTypeChange, filters, onFiltersChange, onClose,
}: Props) {
  const t = useT();
  const { lang } = useLang();
  const config = getCategoryConfig(categoryId);
  if (!config) return null;

  const subType = config.subTypes.find((s) => s.id === activeSubType);

  function toggleValue(filterId: string, value: string, multi: boolean) {
    const current = filters[filterId] ?? [];
    let next: string[];
    if (multi) {
      next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    } else {
      next = current.includes(value) ? [] : [value];
    }
    const newFilters = { ...filters, [filterId]: next };
    if (subType) {
      for (const section of subType.filters) {
        if (section.disabledWhen?.(newFilters)) newFilters[section.id] = [];
      }
    }
    onFiltersChange(newFilters);
  }

  function clearFilters() { onFiltersChange({}); }

  const hasActiveFilters = Object.values(filters).some((v) => v.length > 0);

  return (
    <aside className="w-64 flex-shrink-0">
      {onClose && (
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#f0f0f0] mb-3 rounded-t-xl">
          <span className="text-sm font-semibold text-[#191919]">{t(UI.filters)}</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-[#999999] hover:text-[#191919] text-xl leading-none rounded-full hover:bg-[#f2f2f2]">×</button>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-[#999999] uppercase tracking-[0.2em] mb-2">
            {t(UI.productType)}
          </p>
          <div className="flex flex-col gap-1">
            {config.subTypes.map((st) => (
              <button
                key={st.id}
                onClick={() => { onSubTypeChange(st.id); onFiltersChange({}); }}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSubType === st.id
                    ? 'bg-[#191919] text-white'
                    : 'text-[#333333] hover:bg-[#f2f2f2]'
                }`}
              >
                {lang === 'en' ? (st.labelEn ?? st.label) : st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {subType && subType.filters.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-[#999999] uppercase tracking-[0.2em]">
              {t(UI.filters)}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-[#999999] hover:text-[#191919]">
                {t(UI.reset)}
              </button>
            )}
          </div>

          <div className="px-4 pb-4 flex flex-col gap-5">
            {subType.filters.map((section) => {
              const selected = filters[section.id] ?? [];
              const isButtons = section.type === 'buttons';
              const disabled = section.disabledWhen?.(filters) ?? false;
              const sectionTitle = lang === 'en' ? (section.titleEn ?? section.title) : section.title;

              return (
                <div key={section.id} className={disabled ? 'opacity-40 pointer-events-none select-none' : ''}>
                  <p className="text-xs font-semibold text-[#333333] mb-2">{sectionTitle}</p>

                  {isButtons ? (
                    <div className="flex flex-wrap gap-2">
                      {section.options.map((opt) => {
                        const active = selected.includes(opt.value);
                        const optLabel = lang === 'en' ? (opt.labelEn ?? opt.label) : opt.label;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => toggleValue(section.id, opt.value, false)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              active
                                ? 'bg-[#191919] border-[#191919] text-white'
                                : 'bg-white border-[#cccccc] text-[#333333] hover:border-[#191919] hover:text-[#191919]'
                            }`}
                          >
                            {optLabel}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {section.options.map((opt) => {
                        const active = selected.includes(opt.value);
                        const optLabel = lang === 'en' ? (opt.labelEn ?? opt.label) : opt.label;
                        return (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              active
                                ? 'bg-[#f2f2f2] border-[#333333] text-[#191919]'
                                : 'bg-white border-[#e0e0e0] text-[#333333] hover:border-[#999999]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="accent-[#191919] w-3 h-3 flex-shrink-0"
                              checked={active}
                              onChange={() => toggleValue(section.id, opt.value, true)}
                            />
                            <span className="leading-tight">{optLabel}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
