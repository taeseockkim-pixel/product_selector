import { useState } from 'react';
import type { PlcSeriesId } from '../types';
import { PLC_TREE } from '../config/plcTreeConfig';

interface Props {
  plcSeries: PlcSeriesId;
  onPlcSeriesChange: (s: PlcSeriesId) => void;
  activeSubType: string;
  onSubTypeChange: (subType: string) => void;
}

export default function PlcLeftPanel({
  plcSeries,
  onPlcSeriesChange,
  activeSubType,
  onSubTypeChange,
}: Props) {
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
    <aside className="w-60 flex-shrink-0">
      {/* PLC / PLC-S 시리즈 토글 */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
          시리즈
        </p>
        <div className="flex gap-1.5">
          {(['CM1', 'CM3'] as PlcSeriesId[]).map((s) => (
            <button
              key={s}
              onClick={() => handleSeriesChange(s)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                plcSeries === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'CM1' ? 'PLC' : 'PLC-S'}
            </button>
          ))}
        </div>
      </div>

      {/* 계층형 트리 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="py-1">
          {tree.map((group) => {
            const isExpanded = expandedGroups.includes(group.id);
            const hasActive = group.children.some((c) => c.id === activeSubType);

            return (
              <div key={group.id}>
                {/* 대분류 헤더 */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-gray-50 ${
                    hasActive ? 'text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <span className="text-sm font-semibold">{group.label}</span>
                  <svg
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform text-gray-400 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 소분류 목록 */}
                {isExpanded && (
                  <div className="pb-1">
                    {group.children.map((leaf) => {
                      const active = leaf.id === activeSubType;
                      return (
                        <button
                          key={leaf.id}
                          onClick={() => onSubTypeChange(leaf.id)}
                          className={`w-full text-left pl-7 pr-4 py-2 text-sm transition-colors ${
                            active
                              ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-500'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border-l-2 border-transparent'
                          }`}
                        >
                          {leaf.label}
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
