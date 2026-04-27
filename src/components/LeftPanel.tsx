import type { CategoryId, FilterValues } from '../types';
import { getCategoryConfig } from '../config/filterConfig';

interface Props {
  categoryId: CategoryId;
  activeSubType: string;
  onSubTypeChange: (id: string) => void;
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
}

export default function LeftPanel({
  categoryId,
  activeSubType,
  onSubTypeChange,
  filters,
  onFiltersChange,
}: Props) {
  const config = getCategoryConfig(categoryId);
  if (!config) return null;

  const subType = config.subTypes.find((s) => s.id === activeSubType);

  function toggleValue(filterId: string, value: string, multi: boolean) {
    const current = filters[filterId] ?? [];
    let next: string[];
    if (multi) {
      next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
    } else {
      next = current.includes(value) ? [] : [value];
    }
    onFiltersChange({ ...filters, [filterId]: next });
  }

  function clearFilters() {
    onFiltersChange({});
  }

  const hasActiveFilters = Object.values(filters).some((v) => v.length > 0);

  return (
    <aside className="w-64 flex-shrink-0">
      {/* Sub-type 탭 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            제품 타입
          </p>
          <div className="flex flex-col gap-1">
            {config.subTypes.map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  onSubTypeChange(st.id);
                  onFiltersChange({});
                }}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSubType === st.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 필터 섹션 */}
      {subType && subType.filters.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              필터
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                초기화
              </button>
            )}
          </div>

          <div className="px-4 pb-4 flex flex-col gap-5">
            {subType.filters.map((section) => {
              const selected = filters[section.id] ?? [];
              const isButtons = section.type === 'buttons';

              return (
                <div key={section.id}>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    {section.title}
                  </p>

                  {isButtons ? (
                    /* 단일 선택 pill 버튼 */
                    <div className="flex flex-wrap gap-2">
                      {section.options.map((opt) => {
                        const active = selected.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            onClick={() => toggleValue(section.id, opt.value, false)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              active
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* 다중 선택 체크박스 그리드 */
                    <div className="grid grid-cols-2 gap-1.5">
                      {section.options.map((opt) => {
                        const active = selected.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              active
                                ? 'bg-blue-50 border-blue-400 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="accent-blue-600 w-3 h-3 flex-shrink-0"
                              checked={active}
                              onChange={() => toggleValue(section.id, opt.value, true)}
                            />
                            <span className="leading-tight">{opt.label}</span>
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
