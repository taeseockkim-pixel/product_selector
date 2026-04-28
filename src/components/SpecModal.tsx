import { useState, useEffect } from 'react';
import type { Product, SpecItem } from '../types';
import type { ProductOverride, OverrideLayer } from '../types/overrides';
import { resolveProductImage } from '../utils/imageResolver';
import { getCatalogUrl } from '../config/catalogConfig';
import { useAdmin } from '../contexts/AdminContext';

// ── 카탈로그 버튼 ────────────────────────────────────────────
function CatalogButton({ subType }: { subType: string }) {
  const [open, setOpen] = useState(false);
  const url = getCatalogUrl(subType);
  if (!url) return null;

  return (
    <div className="relative inline-block">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        카탈로그
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[168px]">
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            새 탭에서 열기
          </a>
          <a href={url} download onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            파일 다운로드
          </a>
        </div>
      )}
    </div>
  );
}

// ── 편집용 아이콘 버튼 ────────────────────────────────────────
function EditIconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all flex-shrink-0"
    >
      {children}
    </button>
  );
}

const PencilIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);
const HideIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

// ── 메인 모달 ────────────────────────────────────────────────
export default function SpecModal({
  product,
  baseSpecs,
  overrides,
  onClose,
  onSaveOverride,
}: {
  product: Product;
  baseSpecs?: SpecItem[];
  overrides: OverrideLayer;
  onClose: () => void;
  onSaveOverride: (override: ProductOverride, deleteOverride?: boolean) => Promise<void>;
}) {
  const { isAdmin, adminName } = useAdmin();
  const [imgFailed, setImgFailed] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(product.description);
  const [addingSpec, setAddingSpec] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);

  const imageSrc = resolveProductImage(product.id, product.subType);
  const verifiedSpecs = product.specs.filter((s) => s.source !== 'estimated');
  const currentOverride = overrides.overrides.find((o) => o.productId === product.id);

  const hiddenLabels = new Set(
    (currentOverride?.specOverrides ?? []).filter((so) => so.action === 'hide').map((so) => so.label),
  );
  const hiddenSpecs: SpecItem[] = editMode
    ? (baseSpecs ?? []).filter((s) => hiddenLabels.has(s.label))
    : [];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (editingLabel || editingDesc || addingSpec) {
        setEditingLabel(null); setEditingDesc(false); setAddingSpec(false);
      } else {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, editingLabel, editingDesc, addingSpec]);

  function buildOverride(patch: Partial<ProductOverride>): ProductOverride {
    return {
      productId: product.id,
      appliedAt: new Date().toISOString(),
      appliedBy: adminName,
      ...(currentOverride ?? {}),
      ...patch,
    };
  }

  async function doSave(override: ProductOverride, del?: boolean) {
    setSaving(true);
    try { await onSaveOverride(override, del); } finally { setSaving(false); }
  }

  async function handleHideSpec(label: string) {
    const specOverrides = [
      ...(currentOverride?.specOverrides ?? []).filter((so) => so.label !== label),
      { label, action: 'hide' as const, source: 'user' as const },
    ];
    await doSave(buildOverride({ specOverrides }));
  }

  async function handleUnhideSpec(label: string) {
    const specOverrides = (currentOverride?.specOverrides ?? []).filter((so) => so.label !== label);
    await doSave(buildOverride({ specOverrides }));
  }

  async function handleSaveSpec() {
    if (!editingLabel || !editValue.trim()) return;
    const specOverrides = [
      ...(currentOverride?.specOverrides ?? []).filter(
        (so) => !(so.label === editingLabel && so.action === 'modify'),
      ),
      { label: editingLabel, action: 'modify' as const, newValue: editValue.trim(), source: 'user' as const },
    ];
    await doSave(buildOverride({ specOverrides }));
    setEditingLabel(null);
  }

  async function handleSaveDesc() {
    if (!descValue.trim()) return;
    await doSave(buildOverride({ descriptionOverride: descValue.trim() }));
    setEditingDesc(false);
  }

  async function handleAddSpec() {
    if (!newLabel.trim() || !newValue.trim()) return;
    const specOverrides = [
      ...(currentOverride?.specOverrides ?? []),
      { label: newLabel.trim(), action: 'add' as const, newLabel: newLabel.trim(), newValue: newValue.trim(), source: 'user' as const },
    ];
    await doSave(buildOverride({ specOverrides }));
    setAddingSpec(false); setNewLabel(''); setNewValue('');
  }

  async function handleHideProduct() {
    if (!confirm(`"${product.modelName}" 제품을 목록에서 숨기겠습니까?`)) return;
    await doSave(buildOverride({ hidden: true }));
    onClose();
  }

  async function handleRevertAll() {
    if (!confirm('이 제품의 모든 수정 사항을 원본으로 되돌리겠습니까?')) return;
    await doSave(buildOverride({}), true);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{product.modelName}</h2>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setEditMode((v) => !v)}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                  editMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {editMode ? '편집 중' : '편집'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
          </div>
        </div>

        {/* 편집 모드 안내바 */}
        {editMode && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between text-xs text-amber-700">
            <span>항목에 마우스를 올리면 수정/숨김 버튼이 나타납니다</span>
            <div className="flex items-center gap-3">
              {currentOverride && (
                <button onClick={handleRevertAll} disabled={saving} className="text-red-500 hover:underline disabled:opacity-50">전체 되돌리기</button>
              )}
              <button onClick={handleHideProduct} disabled={saving} className="text-red-500 hover:underline disabled:opacity-50">제품 숨김</button>
            </div>
          </div>
        )}

        {/* 본문 */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {/* 이미지 + 기본 정보 */}
          <div className="flex gap-5">
            {imageSrc && !imgFailed ? (
              <img src={imageSrc} alt={product.modelName} className="flex-shrink-0 w-44 h-36 object-contain rounded-xl bg-gray-50 border border-gray-100" onError={() => setImgFailed(true)} />
            ) : (
              <div className="flex-shrink-0 w-44 h-36 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300 text-xs select-none">NO IMAGE</div>
            )}

            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <p className="text-sm font-semibold text-blue-600">{product.seriesLabel}</p>

              {editMode && editingDesc ? (
                <div className="flex flex-col gap-1">
                  <textarea value={descValue} onChange={(e) => setDescValue(e.target.value)} rows={3} autoFocus className="border border-blue-300 rounded-lg px-2 py-1 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <div className="flex gap-1">
                    <button onClick={handleSaveDesc} disabled={saving} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 disabled:opacity-50">저장</button>
                    <button onClick={() => { setEditingDesc(false); setDescValue(product.description); }} className="text-xs text-gray-500 px-2 py-0.5 rounded hover:bg-gray-100">취소</button>
                  </div>
                </div>
              ) : (
                <div className="group flex items-start gap-1">
                  <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
                  {editMode && (
                    <EditIconBtn onClick={() => { setEditingDesc(true); setDescValue(product.description); }} title="설명 수정">
                      <PencilIcon />
                    </EditIconBtn>
                  )}
                </div>
              )}

              <div className="mt-auto pt-1"><CatalogButton subType={product.subType} /></div>
            </div>
          </div>

          {/* 사양 테이블 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">상세 사양</p>

            {verifiedSpecs.length === 0 && !editMode ? (
              <p className="text-xs text-gray-400 italic">상세 사양 정보 없음 (카탈로그 검증 후 업데이트 예정)</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {verifiedSpecs.map((s) => (
                    <tr key={s.label} className="group">
                      <td className="py-2 pr-4 font-medium text-gray-500 w-44 align-top">
                        <span>{s.label}</span>
                        {s.source === 'user' && <span className="ml-1 text-[10px] bg-amber-100 text-amber-600 px-1 rounded">수정됨</span>}
                      </td>
                      <td className="py-2 text-gray-800">
                        {editMode && editingLabel === s.label ? (
                          <div className="flex items-center gap-1">
                            <input value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSpec(); if (e.key === 'Escape') setEditingLabel(null); }} autoFocus className="border border-blue-300 rounded px-2 py-0.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            <button onClick={handleSaveSpec} disabled={saving} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 disabled:opacity-50 flex-shrink-0">저장</button>
                            <button onClick={() => setEditingLabel(null)} className="text-xs text-gray-500 px-1 py-0.5 rounded hover:bg-gray-100 flex-shrink-0">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{s.value}</span>
                            {editMode && (
                              <>
                                <EditIconBtn onClick={() => { setEditingLabel(s.label); setEditValue(s.value); }} title="값 수정"><PencilIcon /></EditIconBtn>
                                <EditIconBtn onClick={() => handleHideSpec(s.label)} title="숨김 처리"><HideIcon /></EditIconBtn>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* 숨김 처리된 항목 */}
                  {hiddenSpecs.map((s) => (
                    <tr key={`hidden-${s.label}`} className="group">
                      <td className="py-2 pr-4 font-medium text-gray-300 w-44 align-top line-through">{s.label}</td>
                      <td className="py-2 text-gray-300">
                        <div className="flex items-center gap-2">
                          <span className="line-through">{s.value}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-400 px-1 rounded not-line-through">숨김</span>
                          <button onClick={() => handleUnhideSpec(s.label)} disabled={saving} className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:underline disabled:opacity-30">복원</button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* 사양 추가 입력 행 */}
                  {editMode && addingSpec && (
                    <tr>
                      <td className="py-2 pr-2 align-top">
                        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="항목명" autoFocus className="border border-blue-300 rounded px-2 py-0.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="값" onKeyDown={(e) => { if (e.key === 'Enter') handleAddSpec(); }} className="border border-blue-300 rounded px-2 py-0.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
                          <button onClick={handleAddSpec} disabled={saving} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 disabled:opacity-50 flex-shrink-0">추가</button>
                          <button onClick={() => { setAddingSpec(false); setNewLabel(''); setNewValue(''); }} className="text-xs text-gray-500 px-1 rounded hover:bg-gray-100 flex-shrink-0">✕</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {editMode && !addingSpec && (
              <button onClick={() => setAddingSpec(true)} className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                사양 추가
              </button>
            )}
          </div>
        </div>

        {saving && (
          <div className="px-6 pb-4 flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            저장 중...
          </div>
        )}
      </div>
    </div>
  );
}
