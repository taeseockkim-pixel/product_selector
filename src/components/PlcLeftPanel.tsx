import { useState } from 'react';
import type { PlcSeriesId } from '../types';
import { PLC_TREE } from '../config/plcTreeConfig';
import { useT, useLang } from '../context/LangContext';
import { UI } from '../i18n/ui';

interface Props {
  plcSeries: PlcSeriesId;
  onPlcSeriesChange: (s: PlcSeriesId) => void;
  activeSubType: string;
  onSubTypeChange: (subType: string) => void;
  onClose?: () => void;
}

export default function PlcLeftPanel({
  plcSeries, onPlcSeriesChange, activeSubType, onSubTypeChange, onClose,
}: Props) {
  const t = useT();
  const { lang } = useLang();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['cpu']);

  function toggleGroup(id: string) {
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  const tree = PLC_TREE[plcSeries];

  function handleSeriesChange(s: PlcSeriesId) {
    onPlcSeriesChange(s);
    setExpandedGroups(['cpu']);
  }

  return (
    <aside className="w-full flex flex-col h-full">
      {onClose && (
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#4a4a4a] border-b border-[#565656] mb-3 rounded-t-xl flex-shrink-0">
          <span className="text-sm font-semibold text-[#e0e0e0]">{t(UI.series)}</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-[#888888] hover:text-white text-xl leading-none rounded-full hover:bg-[#565656]">×</button>
        </div>
      )}
      <div className="bg-[#4a4a4a] rounded-lg p-3 mb-3 flex-shrink-0">
        <p className="text-xs font-semibold text-[#888888] uppercase tracking-[0.2em] mb-2 px-1">
          {t(UI.series)}
        </p>
        <div className="flex flex-col gap-1">
          {(['CM1', 'CM3'] as PlcSeriesId[]).map((s) => (
            <button
              key={s}
              onClick={() => handleSeriesChange(s)}
              className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors text-left ${
                plcSeries === s
                  ? 'bg-white text-[#191919]'
                  : 'bg-[#565656] text-[#c8c5c0] hover:bg-[#333333]'
              }`}
            >
              {s === 'CM1' ? 'PLC (CM1)' : 'PLC-S (CM3)'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#4a4a4a] rounded-lg overflow-y-auto no-scrollbar flex-1">
        <div className="py-1">
          {tree.map((group) => {
            const isExpanded = expandedGroups.includes(group.id);
            const hasActive = group.children.some((c) => c.id === activeSubType);
            const groupLabel = lang === 'en' ? (group.labelEn ?? group.label) : group.label;

            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-[#565656] ${
                    hasActive ? 'text-white font-bold' : 'text-[#c8c5c0]'
                  }`}
                >
                  <span className="text-sm font-semibold">{groupLabel}</span>
                  <svg
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform text-[#666666] ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="pb-1">
                    {group.children.map((leaf) => {
                      const active = leaf.id === activeSubType;
                      const leafLabel = lang === 'en' ? (leaf.labelEn ?? leaf.label) : leaf.label;
                      return (
                        <button
                          key={leaf.id}
                          onClick={() => onSubTypeChange(leaf.id)}
                          className={`w-full text-left pl-7 pr-4 py-2 text-sm transition-colors ${
                            active
                              ? 'bg-[#565656] text-white font-medium border-l-2 border-white'
                              : 'text-[#888888] hover:bg-[#565656] hover:text-[#e0e0e0] border-l-2 border-transparent'
                          }`}
                        >
                          {leafLabel}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
