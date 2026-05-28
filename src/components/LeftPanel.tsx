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
    <aside className="w-full flex-shrink-0">
      {onClose && (
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#1c1c1c] border-b border-[#2a2a2a] mb-3 rounded-t-xl">
          <span className="text-sm font-semibold text-[#e0e0e0]">{t(UI.filters)}</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-[#888888] hover:text-white text-xl leading-none rounded-full hover:bg-[#2a2a2a]">×</button>
        </div>
      )}
      <div className="bg-[#1c1c1c] rounded-lg overflow-hidden mb-3">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-[#888888] uppercase tracking-[0.2em] mb-2">
            {t(UI.productType)}
          </p>
          <div className="flex flex-col gap-1">
            {config.subTypes.map((st) => (
              <button
                key={st.id}
                onClick={() => { onSubTypeChange(st.id); onFiltersChange({}); }}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSubType === st.id
                    ? 'bg-white text-[#191919]'
                    : 'text-[#c8c5c0] hover:bg-[#2a2a2a] hover:text-white'
                }`}
              >
                {lang === 'en' ? (st.labelEn ?? st.label) : st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {subType && subType.filters.length > 0 && (
        <div className="bg-[#1c1c1c] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-[#888888] uppercase tracking-[0.2em]">
              {t(UI.filters)}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-[#888888] hover:text-white">
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
                  <p className="text-xs font-semibold text-[#c8c5c0] mb-2">{sectionTitle}</p>

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
                                ? 'bg-white border-white text-[#191919]'
                                : 'bg-transparent border-[#444444] text-[#a0a0a0] hover:border-[#c8c5c0] hover:text-white'
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
                                ? 'bg-[#2a2a2a] border-[#666666] text-white'
                                : 'bg-transparent border-[#3a3a3a] text-[#a0a0a0] hover:border-[#777777]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="accent-white w-3 h-3 flex-shrink-0"
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
