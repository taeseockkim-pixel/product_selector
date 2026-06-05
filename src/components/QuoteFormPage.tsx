import { useState, useCallback } from 'react';
import type { Product } from '../types';
import type { Quote, QuoteItem } from '../types/quote';
import { useT, useLang } from '../context/LangContext';
import { UI } from '../i18n/ui';
import { getUnitPrice, isTieredPricing } from '../data/priceData';
import { nextSeq, saveQuote } from '../utils/quoteStorage';
import QuotePrintView from './QuotePrintView';

const AUTHOR_DB: Record<string, { phone: string; email: string }> = {
  '조규광 이사': { phone: '010-8884-2760', email: 'kyukwang.jo@cimon.com' },
  '김태석 차장': { phone: '010-5522-1403', email: 'taeseock.kim@cimon.com' },
  '정성택 차장': { phone: '010-3293-3351', email: 'seongtaek.jeong@cimon.com' },
  '한진희 차장': { phone: '010-2847-6335', email: 'jinhee.han@cimon.com' },
};

function formatKRW(n: number) { return Math.round(n).toLocaleString('ko-KR'); }

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}년 ${m}월 ${day}일`;
}

interface ItemRow { product: Product; qty: number; unitPrice: number | null; }

interface Props {
  cartProducts: Product[];
  onBack: () => void;
  onSuccess: () => void;
}

export default function QuoteFormPage({ cartProducts, onBack, onSuccess }: Props) {
  const t = useT();
  const { lang } = useLang();

  const today = new Date();
  const validity = new Date(today);
  validity.setDate(today.getDate() + 14);

  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [author, setAuthor] = useState('김태석 차장');
  const [deliveryLocation, setDeliveryLocation] = useState('고객 요청 장소로 택배 배송(로젠택배)');
  const [deliveryDeadline, setDeliveryDeadline] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('세금계산서 발행 후 부가세 포함 현금 입금');
  const [validityPeriod, setValidityPeriod] = useState(fmtDate(validity));
  const [packing, setPacking] = useState('제조사 기준 (싸이몬)');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);

  const [items, setItems] = useState<ItemRow[]>(() =>
    cartProducts.map((p) => ({ product: p, qty: 1, unitPrice: getUnitPrice(p.id, 1) })),
  );

  const updateQty = useCallback((idx: number, rawQty: number) => {
    const qty = Math.max(1, rawQty || 1);
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, qty, unitPrice: getUnitPrice(item.product.id, qty) } : item,
      ),
    );
  }, []);

  const authorInfo = AUTHOR_DB[author];
  const subtotal = items.reduce((sum, it) => sum + (it.unitPrice ?? 0) * it.qty, 0);
  const vatTotal = Math.round(subtotal * 1.1);

  function buildQuoteItems(): QuoteItem[] {
    return items.map((it, idx) => {
      const desc = lang === 'en' ? (it.product.descriptionEn ?? it.product.description) : it.product.description;
      const up = it.unitPrice ?? 0;
      return { no: idx + 1, type: it.product.category, name: it.product.modelName, spec: desc, quantity: it.qty, unitPrice: up, totalPrice: up * it.qty };
    });
  }

  function buildDraftQuote(): Quote {
    return {
      id: 'preview',
      quoteNumber: '(저장 후 생성)',
      createdAt: today.toISOString(),
      clientCompany: company,
      clientContact: contact,
      vatTotal,
      authorName: author,
      client: { company, contact, phone, email },
      author: { name: author, phone: authorInfo?.phone ?? '', email: authorInfo?.email ?? '' },
      details: { quoteDate: fmtDate(today), deliveryLocation, deliveryDeadline, paymentTerms, validityPeriod, packing, notes },
      items: buildQuoteItems(),
      subtotal,
    };
  }

  function handleSave() {
    if (!company.trim() || !contact.trim()) {
      alert(t(UI.quoteFieldRequired));
      return;
    }
    setSubmitting(true);
    try {
      const yy = String(today.getFullYear()).slice(-2);
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yymm = `${yy}${mm}`;
      const seq = nextSeq(yymm);
      const quoteNumber = `기술영업 ${yymm}-${String(seq).padStart(3, '0')}`;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const quote: Quote = {
        id,
        quoteNumber,
        createdAt: today.toISOString(),
        clientCompany: company,
        clientContact: contact,
        vatTotal,
        authorName: author,
        client: { company, contact, phone, email },
        author: { name: author, phone: authorInfo?.phone ?? '', email: authorInfo?.email ?? '' },
        details: { quoteDate: fmtDate(today), deliveryLocation, deliveryDeadline, paymentTerms, validityPeriod, packing, notes },
        items: buildQuoteItems(),
        subtotal,
      };

      saveQuote(quote);
      alert(`견적서가 저장되었습니다.\n견적번호: ${quoteNumber}`);
      onSuccess();
    } catch (err) {
      alert(`저장 실패: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (cartProducts.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-16 text-center">
        <p className="text-[#999999] mb-4">담긴 제품이 없습니다. 제품을 먼저 담아주세요.</p>
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-[#191919] text-white text-sm hover:bg-[#333333]">
          {t(UI.back)}
        </button>
      </div>
    );
  }

  return (
    <>
      {previewQuote && <QuotePrintView quote={previewQuote} onClose={() => setPreviewQuote(null)} />}

      <div className="max-w-screen-xl mx-auto w-full px-6 py-6">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between mb-6">
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
            <h1 className="text-lg font-bold text-[#191919]">{t(UI.quoteModalTitle)}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewQuote(buildDraftQuote())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#e6e2dc] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {t(UI.quotePrintBtn)}
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#191919] text-white text-sm font-medium hover:bg-[#333333] disabled:bg-[#999999] transition-colors"
            >
              {submitting ? t(UI.quoteProcessing) : t(UI.quoteSubmitBtn)}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 고객 정보 + 부가 정보 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 고객 정보 */}
            <section className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] p-5">
              <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4">고객 정보</h3>
              <div className="space-y-3">
                {[
                  { label: t(UI.quoteCompany) + ' *', value: company, onChange: setCompany, placeholder: '업체명' },
                  { label: t(UI.quoteContact) + ' *', value: contact, onChange: setContact, placeholder: '담당자명' },
                  { label: t(UI.quotePhone), value: phone, onChange: setPhone, placeholder: '010-0000-0000' },
                  { label: t(UI.quoteEmail), value: email, onChange: setEmail, placeholder: 'email@company.com' },
                ].map(({ label, value, onChange, placeholder }) => (
                  <div key={label}>
                    <label className="block text-xs text-[#555555] mb-1">{label}</label>
                    <input
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={placeholder}
                      className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 거래 조건 */}
            <section className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] p-5">
              <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4">거래 조건</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs text-[#555555] mb-1">납품 장소</label>
                  <input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#191919]" />
                </div>
                <div>
                  <label className="block text-xs text-[#555555] mb-1">납품 기한</label>
                  <input value={deliveryDeadline} onChange={(e) => setDeliveryDeadline(e.target.value)} placeholder="예: 발주 후 2주" className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]" />
                </div>
                <div>
                  <label className="block text-xs text-[#555555] mb-1">결제 조건</label>
                  <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#191919]" />
                </div>
                <div>
                  <label className="block text-xs text-[#555555] mb-1">유효 기간</label>
                  <input value={validityPeriod} onChange={(e) => setValidityPeriod(e.target.value)} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]" />
                </div>
                <div>
                  <label className="block text-xs text-[#555555] mb-1">포장</label>
                  <input value={packing} onChange={(e) => setPacking(e.target.value)} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#191919]" />
                </div>
              </div>
            </section>

            {/* 작성자 + 비고 */}
            <section className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] p-5">
              <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4">작성자 / 비고</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteAuthor)}</label>
                  <select value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]">
                    {Object.keys(AUTHOR_DB).map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteNotes)}</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919] resize-none" placeholder="견적서에 표시할 특이사항" />
                </div>
              </div>
            </section>
          </div>

          {/* 우측: 제품 목록 */}
          <div className="lg:col-span-2">
            <section className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#ddd9d2]">
                <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider">제품 및 수량</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#e6e2dc]">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-[#555555] text-xs">모델명</th>
                      <th className="text-center px-3 py-2.5 font-medium text-[#555555] text-xs w-20">{t(UI.quoteQty)}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[#555555] text-xs w-28">{t(UI.quoteUnitPrice)}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[#555555] text-xs w-28">{t(UI.quoteTotal)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const tiered = isTieredPricing(item.product.id);
                      const rowTotal = (item.unitPrice ?? 0) * item.qty;
                      return (
                        <tr key={item.product.id} className="border-t border-[#ddd9d2] bg-white">
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#191919] text-xs">{item.product.modelName}</p>
                            <p className="text-[#999999] text-xs mt-0.5 line-clamp-2">
                              {lang === 'en' ? (item.product.descriptionEn ?? item.product.description) : item.product.description}
                            </p>
                            {tiered && <p className="text-[10px] text-blue-500 mt-0.5">{t(UI.quoteTieredHint)}</p>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number" min={1} value={item.qty}
                              onChange={(e) => updateQty(idx, parseInt(e.target.value, 10))}
                              className="w-16 text-center border border-[#ddd9d2] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#191919] bg-white"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.unitPrice != null
                              ? <span className="text-[#191919] font-medium text-xs">{formatKRW(item.unitPrice)}</span>
                              : <span className="text-[#999999] text-xs">{t(UI.quotePriceNone)}</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.unitPrice != null
                              ? <span className="font-semibold text-xs">{formatKRW(rowTotal)}</span>
                              : <span className="text-[#999999] text-xs">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 합계 */}
              <div className="px-5 py-4 border-t border-[#ddd9d2] space-y-1.5">
                <div className="flex justify-between text-sm text-[#555555]">
                  <span>{t(UI.quoteSubtotal)}</span>
                  <span>{formatKRW(subtotal)} 원</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#191919] border-t border-[#ddd9d2] pt-2 mt-1">
                  <span>{t(UI.quoteVatTotal)}</span>
                  <span>{formatKRW(vatTotal)} 원</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
