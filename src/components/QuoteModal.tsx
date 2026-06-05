import { useState, useCallback } from 'react';
import type { Product } from '../types';
import { useT, useLang } from '../context/LangContext';
import { UI } from '../i18n/ui';
import { getUnitPrice, isTieredPricing } from '../data/priceData';

const GAS_ENDPOINT = import.meta.env.VITE_GAS_ENDPOINT as string | undefined;

const AUTHOR_DB: Record<string, { phone: string; email: string }> = {
  '조규광 이사': { phone: '010-8884-2760', email: 'kyukwang.jo@cimon.com' },
  '김태석 차장': { phone: '010-5522-1403', email: 'taeseock.kim@cimon.com' },
  '정성택 차장': { phone: '010-3293-3351', email: 'seongtaek.jeong@cimon.com' },
  '한진희 차장': { phone: '010-2847-6335', email: 'jinhee.han@cimon.com' },
};

function formatKRW(n: number): string {
  return n.toLocaleString('ko-KR');
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}년 ${m}월 ${day}일`;
}

interface QuoteItem {
  product: Product;
  qty: number;
  unitPrice: number | null;
}

interface Props {
  cartProducts: Product[];
  onClose: () => void;
}

export default function QuoteModal({ cartProducts, onClose }: Props) {
  const t = useT();
  const { lang } = useLang();

  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [author, setAuthor] = useState('김태석 차장');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>(() =>
    cartProducts.map((p) => ({ product: p, qty: 1, unitPrice: getUnitPrice(p.id, 1) })),
  );


  const updateQty = useCallback((idx: number, rawQty: number) => {
    const qty = Math.max(1, rawQty || 1);
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, qty, unitPrice: getUnitPrice(item.product.id, qty) }
          : item,
      ),
    );
  }, []);

  const authorInfo = AUTHOR_DB[author];
  const subtotal = items.reduce((sum, it) => sum + (it.unitPrice ?? 0) * it.qty, 0);
  const vatTotal = Math.round(subtotal * 1.1);

  async function handleSubmit() {
    if (!company.trim() || !contact.trim()) {
      alert(t(UI.quoteFieldRequired));
      return;
    }
    if (!GAS_ENDPOINT) {
      alert('GAS_ENDPOINT 환경변수가 설정되지 않았습니다.');
      return;
    }

    const today = new Date();
    const validity = new Date(today);
    validity.setDate(today.getDate() + 14);

    const payload = {
      details: {
        clientName: company,
        clientContactPerson: contact,
        clientPhone: phone,
        clientEmail: email,
        quoteNumber: '',
        quoteDate: fmtDate(today),
        deliveryLocation: '고객 요청 장소로 택배 배송(로젠택배)',
        deliveryDeadline: deadline,
        paymentTerms: '세금계산서 발행 후 부가세 포함 현금 입금',
        validityPeriod: fmtDate(validity),
        packing: '제조사 기준 (싸이몬)',
        authorName: author,
        authorPhone: authorInfo?.phone ?? '',
        authorEmail: authorInfo?.email ?? '',
        notes,
      },
      items: items.map((it) => {
        const desc = lang === 'en' ? (it.product.descriptionEn ?? it.product.description) : it.product.description;
        const up = it.unitPrice ?? 0;
        return {
          type: it.product.category,
          name: it.product.modelName,
          spec: desc,
          unitPrice: up,
          quantity: it.qty,
          totalPrice: up * it.qty,
        };
      }),
    };

    setSubmitting(true);
    try {
      const res = await fetch(GAS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      const result = await res.json() as { success: boolean; url?: string; message?: string };
      if (result.success && result.url) {
        alert(t(UI.quoteSuccess));
        window.open(result.url, '_blank');
        onClose();
      } else {
        alert(`${t(UI.quoteError)}\n${result.message ?? ''}`);
      }
    } catch (err) {
      alert(`${t(UI.quoteError)}\n${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ddd9d2] flex-none">
          <h2 className="text-base font-bold text-[#191919]">{t(UI.quoteModalTitle)}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#999999] hover:text-[#191919] hover:bg-[#f0ede8] transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 스크롤 바디 */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* 고객 정보 */}
          <section>
            <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-3">
              {lang === 'ko' ? '고객 정보' : 'Customer Info'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#555555] mb-1">
                  {t(UI.quoteCompany)} <span className="text-red-500">*</span>
                </label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#191919]"
                  placeholder={lang === 'ko' ? '업체명 입력' : 'Company name'}
                />
              </div>
              <div>
                <label className="block text-xs text-[#555555] mb-1">
                  {t(UI.quoteContact)} <span className="text-red-500">*</span>
                </label>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#191919]"
                  placeholder={lang === 'ko' ? '담당자명' : 'Contact person'}
                />
              </div>
              <div>
                <label className="block text-xs text-[#555555] mb-1">{t(UI.quotePhone)}</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#191919]"
                  placeholder="010-0000-0000"
                />
              </div>
              <div>
                <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteEmail)}</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#191919]"
                  placeholder="example@company.com"
                />
              </div>
            </div>
          </section>

          {/* 제품 목록 */}
          <section>
            <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-3">
              {lang === 'ko' ? '제품 및 수량' : 'Products & Quantity'}
            </h3>
            <div className="border border-[#ddd9d2] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#f0ede8]">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-[#555555] text-xs">
                      {lang === 'ko' ? '모델명' : 'Model'}
                    </th>
                    <th className="text-center px-3 py-2.5 font-medium text-[#555555] text-xs w-20">
                      {t(UI.quoteQty)}
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[#555555] text-xs w-28">
                      {t(UI.quoteUnitPrice)}
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-[#555555] text-xs w-28">
                      {t(UI.quoteTotal)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const tiered = isTieredPricing(item.product.id);
                    const rowTotal = (item.unitPrice ?? 0) * item.qty;
                    return (
                      <tr key={item.product.id} className="border-t border-[#ddd9d2]">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#191919] text-xs">{item.product.modelName}</p>
                          <p className="text-[#999999] text-xs mt-0.5 line-clamp-1">
                            {lang === 'en'
                              ? (item.product.descriptionEn ?? item.product.description)
                              : item.product.description}
                          </p>
                          {tiered && (
                            <p className="text-[10px] text-blue-500 mt-0.5">{t(UI.quoteTieredHint)}</p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => updateQty(idx, parseInt(e.target.value, 10))}
                            className="w-16 text-center border border-[#ddd9d2] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#191919]"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.unitPrice != null ? (
                            <span className="text-[#191919] font-medium text-xs">
                              {formatKRW(item.unitPrice)}
                            </span>
                          ) : (
                            <span className="text-[#999999] text-xs">{t(UI.quotePriceNone)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.unitPrice != null ? (
                            <span className="text-[#191919] font-semibold text-xs">
                              {formatKRW(rowTotal)}
                            </span>
                          ) : (
                            <span className="text-[#999999] text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 합계 */}
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-[#555555]">
                <span>{t(UI.quoteSubtotal)}</span>
                <span>{formatKRW(subtotal)} 원</span>
              </div>
              <div className="flex justify-between font-bold text-[#191919] text-base border-t border-[#ddd9d2] pt-2 mt-2">
                <span>{t(UI.quoteVatTotal)}</span>
                <span>{formatKRW(vatTotal)} 원</span>
              </div>
            </div>
          </section>

          {/* 부가 정보 */}
          <section>
            <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-3">
              {lang === 'ko' ? '추가 정보' : 'Additional Info'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteAuthor)}</label>
                <select
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#191919] bg-white"
                >
                  {Object.keys(AUTHOR_DB).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteDeadline)}</label>
                <input
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#191919]"
                  placeholder={lang === 'ko' ? '예: 2026년 07월 말' : 'e.g., End of July 2026'}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteNotes)}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#191919] resize-none"
                placeholder={lang === 'ko' ? '견적서에 표시할 특이사항' : 'Special notes for the quote'}
              />
            </div>
          </section>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-[#ddd9d2] flex items-center justify-end gap-3 flex-none bg-[#f0ede8]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#e6e2dc] transition-colors"
          >
            {lang === 'ko' ? '취소' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-[#191919] text-white text-sm font-medium hover:bg-[#333333] disabled:bg-[#999999] transition-colors flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t(UI.quoteProcessing)}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t(UI.quoteSubmitBtn)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
