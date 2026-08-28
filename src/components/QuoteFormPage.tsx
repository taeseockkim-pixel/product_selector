import { useState, useCallback, useEffect, type DragEvent } from 'react';
import type { Product } from '../types';
import type { Quote, QuoteItem } from '../types/quote';
import { useT, useLang, type Lang } from '../context/LangContext';
import { UI } from '../i18n/ui';
import { translateSpecValue } from '../i18n/specValues';
import { PRODUCTS } from '../data/products';
import { getUnitPrice, isTieredPricing } from '../data/priceData';
import {
  QUOTE_PRODUCT_CATALOG,
  findQuoteCatalogItem,
  getQuoteCatalogUnitPrice,
  type QuoteCatalogItem,
} from '../data/quoteProductCatalog';
import { getSeq, saveQuote } from '../utils/quoteStorage';
import QuotePrintView from './QuotePrintView';
import SpecModal from './SpecModal';

export interface AuthorInfo {
  name: string;
  phone: string;
  email: string;
  department: string;
}

const MAX_ITEMS = 14; // 견적서 샘플.xlsx 품목 행이 16~29행(14행)까지만 준비되어 있음
const AUTHOR_LABELS: Record<string, string> = {
  '조규광 이사': 'Kyukwang Jo, Director',
  '김태석 차장': 'Taeseock Kim, Deputy General Manager',
  '정성택 차장': 'Seongtaek Jeong, Deputy General Manager',
  '한진희 차장': 'Jinhee Han, Deputy General Manager',
  '프로젝트사업실': 'Project Business Division',
};

function authorLabel(name: string, lang: Lang) {
  return lang === 'en' ? (AUTHOR_LABELS[name] ?? name) : name;
}

function formatKRW(n: number) { return Math.round(n).toLocaleString('ko-KR'); }

function parseKRW(value: string) {
  const parsed = Number(value.replace(/[^\d]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function validMultiplier(value: string | number | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function itemTotal(unitPrice: number | null | undefined, multiplier: string | number | undefined, quantity: number) {
  return Math.round((unitPrice ?? 0) * validMultiplier(multiplier) * quantity);
}

function fmtDate(d: Date, lang: Lang): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (lang === 'en') return `${y}-${m}-${day}`;
  return `${y}년 ${m}월 ${day}일`;
}

function quoteDefaults(lang: Lang, validity: Date) {
  return {
    deliveryLocation: lang === 'en' ? 'Delivery by courier to customer requested location (Logen)' : '고객 요청 장소로 택배 배송(로젠택배)',
    deliveryDeadline: lang === 'en' ? '2 weeks after purchase order' : '발주 후 2주',
    paymentTerms: lang === 'en' ? 'Cash payment including VAT after tax invoice issuance' : '세금계산서 발행 후 부가세 포함 현금 입금',
    validityPeriod: fmtDate(validity, lang),
    packing: lang === 'en' ? 'Manufacturer standard (CIMON)' : '제조사 기준 (싸이몬)',
  };
}

interface ItemRow {
  key: string;
  type: string;
  name: string;
  spec: string;
  qty: number;
  unitPrice: number | null;
  multiplier: string;
  catalogItem?: QuoteCatalogItem;
  product?: Product;
}

interface Props {
  cartProducts: Product[];
  onBack: () => void;
  onSuccess: () => void;
}

interface AppsScriptPayload {
  details: {
    clientName: string;
    clientContactPerson: string;
    clientPhone: string;
    clientEmail: string;
    quoteNumber: string;
    quoteDate: string;
    deliveryLocation: string;
    deliveryDeadline: string;
    paymentTerms: string;
    validityPeriod: string;
    packing: string;
    notes: string;
    authorName: string;
    authorPhone: string;
    authorEmail: string;
    authorDepartment: string;
  };
  items: Array<{
    type: string;
    name: string;
    spec: string;
    quantity: number;
    unitPrice: number;
    multiplier: number;
    totalPrice: number;
  }>;
  createDraft: boolean;
  customSubject: string;
  customBody: string;
}

interface QuoteProcessResult {
  success: boolean;
  message?: string;
  newQuoteNumber?: string;
  folderUrl?: string;
  pdfUrl?: string;
  sheetUrl?: string;
  url?: string;
}

interface AuthorListResult {
  success: boolean;
  authors?: AuthorInfo[];
  message?: string;
}

interface AppsScriptBridgeResponse {
  source?: string;
  type?: string;
  requestId?: string;
  result?: QuoteProcessResult;
  error?: string;
}

interface AuthorBridgeResponse {
  source?: string;
  type?: string;
  requestId?: string;
  result?: AuthorListResult;
  error?: string;
}

declare global {
  interface Window {
    google?: {
      script?: {
        run?: {
          withSuccessHandler(handler: (result: QuoteProcessResult) => void): {
            withFailureHandler: (handler: (error: unknown) => void) => {
              processQuoteFromReact: (payload: AppsScriptPayload) => void;
            };
          };
          withSuccessHandler(handler: (result: AuthorListResult) => void): {
            withFailureHandler: (handler: (error: unknown) => void) => {
              getAuthorsFromReact: () => void;
            };
          };
        };
      };
    };
  }
}

function createKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function unitPriceForItem(item: Pick<ItemRow, 'catalogItem' | 'product' | 'unitPrice'>, qty: number): number | null {
  if (item.catalogItem) return getQuoteCatalogUnitPrice(item.catalogItem, qty);
  if (item.product) return getUnitPrice(item.product.id, qty);
  return item.unitPrice;
}

function itemFromProduct(product: Product, lang: 'ko' | 'en'): ItemRow {
  const catalogItem = findQuoteCatalogItem(product.modelName) ?? findQuoteCatalogItem(product.id);
  const spec = catalogItem?.spec || (lang === 'en' ? (product.descriptionEn ?? product.description) : product.description);
  const unitPrice = catalogItem ? getQuoteCatalogUnitPrice(catalogItem, 1) : getUnitPrice(product.id, 1);

  return {
    key: createKey(product.id),
    type: catalogItem?.categoryLabel ?? product.category,
    name: catalogItem?.name ?? product.modelName,
    spec,
    qty: 1,
    unitPrice,
    multiplier: '1',
    catalogItem,
    product,
  };
}

function itemFromCatalog(catalogItem: QuoteCatalogItem, qty: number): ItemRow {
  return {
    key: createKey(catalogItem.id),
    type: catalogItem.categoryLabel,
    name: catalogItem.name,
    spec: catalogItem.spec,
    qty,
    unitPrice: getQuoteCatalogUnitPrice(catalogItem, qty),
    multiplier: '1',
    catalogItem,
  };
}

function displayCategory(value: string, lang: Lang) {
  if (lang === 'ko') return value;
  const categoryMap: Record<string, string> = {
    plc: 'PLC',
    ipc: 'IPC/IAC',
    scada: 'SCADA',
    xpanel: 'XPANEL',
  };
  return categoryMap[value] ?? translateSpecValue(value, lang);
}

function displaySpec(item: ItemRow, lang: Lang) {
  if (item.product) return lang === 'en' ? (item.product.descriptionEn ?? item.product.description) : item.product.description;
  return translateSpecValue(item.spec, lang);
}

function formatMoney(value: number, lang: Lang) {
  return lang === 'ko' ? `${formatKRW(value)} 원` : `${formatKRW(value)} KRW`;
}

function uiText(entry: { ko: string; en: string }, lang: Lang, values: Record<string, string | number> = {}) {
  let text = entry[lang];
  for (const [key, value] of Object.entries(values)) {
    text = text.split(`{${key}}`).join(String(value));
  }
  return text;
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.trim().slice(0, 160);
    throw new Error(
      `서버가 JSON 대신 다른 응답을 반환했습니다. /api/google/quote Apps Script 프록시와 APPS_SCRIPT_WEB_APP_URL 설정을 확인해 주세요. 응답: ${preview || '(empty)'}`,
    );
  }
}

function quoteToAppsScriptPayload(quote: Quote, createDraft: boolean, subject = '', body = ''): AppsScriptPayload {
  return {
    details: {
      clientName: quote.client.company,
      clientContactPerson: quote.client.contact,
      clientPhone: quote.client.phone,
      clientEmail: quote.client.email,
      quoteNumber: quote.quoteNumber,
      quoteDate: quote.details.quoteDate,
      deliveryLocation: quote.details.deliveryLocation,
      deliveryDeadline: quote.details.deliveryDeadline,
      paymentTerms: quote.details.paymentTerms,
      validityPeriod: quote.details.validityPeriod,
      packing: quote.details.packing,
      notes: quote.details.notes,
      authorName: quote.author.name,
      authorPhone: quote.author.phone,
      authorEmail: quote.author.email,
      authorDepartment: quote.author.department ?? '',
    },
    items: quote.items.map((item) => ({
      type: item.type,
      name: item.name,
      spec: item.spec,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      multiplier: item.multiplier ?? 1,
      totalPrice: item.totalPrice,
    })),
    createDraft,
    customSubject: subject,
    customBody: body,
  };
}

function processQuoteViaParentBridge(payload: AppsScriptPayload): Promise<QuoteProcessResult> {
  return new Promise((resolve, reject) => {
    const requestId = `quote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error('Apps Script 응답 시간이 초과되었습니다.'));
    }, 180000);

    function handleMessage(event: MessageEvent<AppsScriptBridgeResponse>) {
      const data = event.data;
      if (data?.source !== 'cimon-appscript-bridge' || data.type !== 'PROCESS_QUOTE_RESULT' || data.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timer);
      window.removeEventListener('message', handleMessage);
      if (data.error) reject(new Error(data.error));
      else resolve(data.result ?? { success: false, message: 'Apps Script 응답이 비어 있습니다.' });
    }

    window.addEventListener('message', handleMessage);
    window.parent.postMessage(
      { source: 'cimon-quote-app', type: 'PROCESS_QUOTE', requestId, payload },
      '*',
    );
  });
}

function processQuoteViaGoogleScript(payload: AppsScriptPayload): Promise<QuoteProcessResult> {
  return new Promise((resolve, reject) => {
    const runner = window.google?.script?.run;
    if (!runner) {
      reject(new Error('google.script.run을 사용할 수 없습니다.'));
      return;
    }
    runner
      .withSuccessHandler(resolve)
      .withFailureHandler((error) => reject(new Error(String(error))))
      .processQuoteFromReact(payload);
  });
}

function loadAuthorsViaParentBridge(): Promise<AuthorListResult> {
  return new Promise((resolve, reject) => {
    const requestId = `authors-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error('작성자 목록 응답 시간이 초과되었습니다.'));
    }, 15000);

    function handleMessage(event: MessageEvent<AuthorBridgeResponse>) {
      const data = event.data;
      if (data?.source !== 'cimon-appscript-bridge' || data.type !== 'LOAD_AUTHORS_RESULT' || data.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timer);
      window.removeEventListener('message', handleMessage);
      if (data.error) reject(new Error(data.error));
      else resolve(data.result ?? { success: false, message: '작성자 목록 응답이 비어 있습니다.' });
    }

    window.addEventListener('message', handleMessage);
    window.parent.postMessage(
      { source: 'cimon-quote-app', type: 'LOAD_AUTHORS', requestId },
      '*',
    );
  });
}

function loadAuthorsViaGoogleScript(): Promise<AuthorListResult> {
  return new Promise((resolve, reject) => {
    const runner = window.google?.script?.run;
    if (!runner) {
      reject(new Error('google.script.run을 사용할 수 없습니다.'));
      return;
    }
    runner
      .withSuccessHandler(resolve)
      .withFailureHandler((error) => reject(new Error(String(error))))
      .getAuthorsFromReact();
  });
}

/** 작성자 DB 시트에서 작성자 목록을 읽어온다. 실패 시 빈 배열을 반환한다. */
async function loadAuthors(): Promise<AuthorInfo[]> {
  try {
    let result: AuthorListResult | null = null;
    if (window.parent && window.parent !== window) {
      result = await loadAuthorsViaParentBridge();
    } else if (window.google?.script?.run) {
      result = await loadAuthorsViaGoogleScript();
    }
    if (result?.success && result.authors?.length) return result.authors;
  } catch (err) {
    console.warn('작성자 목록 조회 실패:', err);
  }
  return [];
}

async function processQuoteRequest(quote: Quote, createDraft: boolean, subject = '', body = ''): Promise<QuoteProcessResult> {
  const appsScriptPayload = quoteToAppsScriptPayload(quote, createDraft, subject, body);

  if (window.parent && window.parent !== window) {
    return processQuoteViaParentBridge(appsScriptPayload);
  }

  if (window.google?.script?.run) {
    return processQuoteViaGoogleScript(appsScriptPayload);
  }

  const res = await fetch('/api/google/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quote, createDraft, subject, body }),
  });
  const result = await readJsonResponse<QuoteProcessResult>(res);
  if (!res.ok) {
    throw new Error(result.message ?? '견적 저장 요청에 실패했습니다.');
  }
  return result;
}

function findProductForItem(item: ItemRow): Product | null {
  if (item.product) return item.product;

  const candidates = [item.name, ...(item.name.match(/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?/g) ?? [])]
    .map((value) => value.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const normalized = candidate.toUpperCase();
    const matched = PRODUCTS.find((product) => {
      const id = product.id.toUpperCase();
      const modelName = product.modelName.toUpperCase();
      return id === normalized || modelName === normalized || `CM-${id}` === normalized || `CM-${modelName}` === normalized;
    });
    if (matched) return matched;
  }

  return null;
}

export default function QuoteFormPage({ cartProducts, onBack, onSuccess }: Props) {
  const t = useT();
  const { lang } = useLang();

  const today = new Date();
  const validity = new Date(today);
  validity.setDate(today.getDate() + 14);
  const defaults = quoteDefaults(lang, validity);

  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [author, setAuthor] = useState('');
  const [authors, setAuthors] = useState<AuthorInfo[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(true);
  const [customAuthorName, setCustomAuthorName] = useState('');
  const [customAuthorPhone, setCustomAuthorPhone] = useState('');
  const [customAuthorEmail, setCustomAuthorEmail] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(defaults.deliveryLocation);
  const [deliveryDeadline, setDeliveryDeadline] = useState(defaults.deliveryDeadline);
  const [paymentTerms, setPaymentTerms] = useState(defaults.paymentTerms);
  const [validityPeriod, setValidityPeriod] = useState(defaults.validityPeriod);
  const [packing, setPacking] = useState(defaults.packing);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const firstCatalogGroup = QUOTE_PRODUCT_CATALOG[0];
  const [selectedSheet, setSelectedSheet] = useState(firstCatalogGroup?.sheet ?? '');
  const [selectedProductId, setSelectedProductId] = useState(firstCatalogGroup?.items[0]?.id ?? '');
  const [addQty, setAddQty] = useState(1);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [items, setItems] = useState<ItemRow[]>(() =>
    cartProducts.map((p) => itemFromProduct(p, lang)),
  );

  useEffect(() => {
    const previous = quoteDefaults(lang === 'ko' ? 'en' : 'ko', validity);
    const next = quoteDefaults(lang, validity);
    setDeliveryLocation((value) => (value === previous.deliveryLocation ? next.deliveryLocation : value));
    setDeliveryDeadline((value) => (value === previous.deliveryDeadline ? next.deliveryDeadline : value));
    setPaymentTerms((value) => (value === previous.paymentTerms ? next.paymentTerms : value));
    setValidityPeriod((value) => (value === previous.validityPeriod ? next.validityPeriod : value));
    setPacking((value) => (value === previous.packing ? next.packing : value));
  }, [lang]);

  // 마운트 시 작성자 DB 시트에서 작성자 목록을 읽어온다
  useEffect(() => {
    let cancelled = false;
    loadAuthors().then((list) => {
      if (cancelled) return;
      setAuthors(list);
      setAuthorsLoading(false);
      setAuthor((current) => (list.some((a) => a.name === current) ? current : (list[0]?.name ?? '')));
    });
    return () => { cancelled = true; };
  }, []);
  const selectedGroup = QUOTE_PRODUCT_CATALOG.find((group) => group.sheet === selectedSheet) ?? firstCatalogGroup;
  const selectedCatalogItem =
    selectedGroup?.items.find((item) => item.id === selectedProductId) ?? selectedGroup?.items[0] ?? null;
  const selectedCatalogPrice = selectedCatalogItem ? getQuoteCatalogUnitPrice(selectedCatalogItem, addQty) : null;
  const selectedCatalogTiered = (selectedCatalogItem?.tiers.length ?? 0) > 1;
  const selectedCatalogBuckets = selectedGroup
    ? selectedGroup.items.reduce<{ label: string; items: QuoteCatalogItem[] }[]>((buckets, item) => {
        const last = buckets[buckets.length - 1];
        if (last?.label === item.categoryLabel) {
          last.items.push(item);
        } else {
          buckets.push({ label: item.categoryLabel, items: [item] });
        }
        return buckets;
      }, [])
    : [];

  const updateQty = useCallback((idx: number, rawQty: number) => {
    const qty = Math.max(1, rawQty || 1);
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, qty, unitPrice: unitPriceForItem(item, qty) } : item,
      ),
    );
  }, []);

  const updatePrice = useCallback((idx: number, rawPrice: number) => {
    const unitPrice = Math.max(0, rawPrice || 0);
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, unitPrice } : item)));
  }, []);

  const updateMultiplier = useCallback((idx: number, rawMultiplier: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, multiplier: rawMultiplier } : item)));
  }, []);

  const normalizeMultiplier = useCallback((idx: number) => {
    setItems((prev) => prev.map((item, i) => (
      i === idx ? { ...item, multiplier: String(validMultiplier(item.multiplier)) } : item
    )));
  }, []);

  const moveItem = useCallback((idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const reorderItem = useCallback((fromIdx: number, toIdx: number) => {
    setItems((prev) => {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= prev.length || toIdx >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const removeItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  function handleDragStart(idx: number, event: DragEvent<HTMLButtonElement>) {
    setDraggedIndex(idx);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(idx));
  }

  function handleDragOver(idx: number, event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverIndex(idx);
  }

  function handleDrop(idx: number, event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
    const rawIndex = event.dataTransfer.getData('text/plain');
    const fromIdx = draggedIndex ?? Number(rawIndex);
    if (Number.isFinite(fromIdx)) reorderItem(fromIdx, idx);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleSheetChange(sheet: string) {
    const group = QUOTE_PRODUCT_CATALOG.find((item) => item.sheet === sheet);
    setSelectedSheet(sheet);
    setSelectedProductId(group?.items[0]?.id ?? '');
  }

  function handleAddItem() {
    if (!selectedCatalogItem) return;
    if (items.length >= MAX_ITEMS) {
      alert(uiText(UI.quoteMaxItems, lang, { max: MAX_ITEMS }));
      return;
    }
    const qty = Math.max(1, addQty || 1);
    setItems((prev) => [...prev, itemFromCatalog(selectedCatalogItem, qty)]);
  }

  const selectedAuthor = authors.find((a) => a.name === author) ?? null;
  // 시트에 연락처/이메일이 비어 있는 작성자는 수기 입력 필드를 표시한다.
  const needsManualAuthor = !selectedAuthor || !selectedAuthor.phone.trim() || !selectedAuthor.email.trim();
  const resolvedAuthorName = needsManualAuthor && customAuthorName.trim() ? customAuthorName.trim() : authorLabel(author, lang);
  const resolvedAuthorPhone = needsManualAuthor ? customAuthorPhone.trim() : (selectedAuthor?.phone ?? '');
  const resolvedAuthorEmail = needsManualAuthor ? customAuthorEmail.trim() : (selectedAuthor?.email ?? '');
  const authorDepartment = selectedAuthor?.department ?? '';
  const subtotal = items.reduce((sum, it) => sum + itemTotal(it.unitPrice, it.multiplier, it.qty), 0);
  const vatTotal = Math.round(subtotal * 1.1);

  function buildQuoteItems(): QuoteItem[] {
    return items.map((it, idx) => {
      const up = it.unitPrice ?? 0;
      return {
        no: idx + 1,
        type: displayCategory(it.type, lang),
        name: it.name,
        spec: displaySpec(it, lang),
        quantity: it.qty,
        unitPrice: up,
        multiplier: validMultiplier(it.multiplier),
        totalPrice: itemTotal(up, it.multiplier, it.qty),
      };
    });
  }

  function nextQuoteYymm() {
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${yy}${mm}`;
  }

  function buildDraftQuote(): Quote {
    const yymm = nextQuoteYymm();
    const previewSeq = getSeq(yymm) + 1;
    return {
      id: 'preview',
      quoteNumber: `${lang === 'en' ? 'Technical Sales' : '기술영업'} ${yymm}-${String(previewSeq).padStart(3, '0')}`,
      createdAt: today.toISOString(),
      clientCompany: company,
      clientContact: contact,
      vatTotal,
      authorName: resolvedAuthorName,
      client: { company, contact, phone, email },
      author: { name: resolvedAuthorName, phone: resolvedAuthorPhone, email: resolvedAuthorEmail, department: authorDepartment || undefined },
      details: { quoteDate: fmtDate(today, lang), deliveryLocation, deliveryDeadline, paymentTerms, validityPeriod, packing, notes },
      items: buildQuoteItems(),
      subtotal,
    };
  }

  function validateForSubmit(): boolean {
    if (authorsLoading) {
      alert(t(UI.quoteAuthorsLoading));
      return false;
    }
    if (!company.trim() || !contact.trim() || !phone.trim() || !email.trim()) {
      alert(t(UI.quoteFieldRequired));
      return false;
    }
    if (authors.length === 0 && !customAuthorName.trim()) {
      alert(t(UI.quoteAuthorRequired));
      return false;
    }
    if (needsManualAuthor && (!customAuthorPhone.trim() || !customAuthorEmail.trim())) {
      alert(t(UI.quoteAuthorRequired));
      return false;
    }
    if (items.length === 0) {
      alert(t(UI.quoteItemsRequired));
      return false;
    }
    if (items.length > MAX_ITEMS) {
      alert(uiText(UI.quoteMaxItemsWithCurrent, lang, { max: MAX_ITEMS, current: items.length }));
      return false;
    }
    return true;
  }

  function closePreview() {
    if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
    setPreviewPdfUrl(null);
    setPreviewQuote(null);
  }

  async function openPreview() {
    if (!validateForSubmit()) return;
    const draft = buildDraftQuote();
    setPreviewQuote(draft);
    setPreviewPdfUrl(null);
    setPreviewLoading(false);
  }

  function openEmailComposer() {
    const quote = previewQuote ?? buildDraftQuote();
    setEmailSubject(`[CIMON] ${quote.client.company} - 제품 견적서 송부 드립니다.`);
    setEmailBody(
      `안녕하세요, ${quote.client.contact} 님\n` +
      `CIMON ${quote.author.name} 입니다.\n\n` +
      `요청하신 제품 견적서 송부 드립니다.\n` +
      `발주 시 발주서와 사업자등록증 전달 부탁 드립니다.\n\n` +
      `추가 문의 사항이 있으시다면 연락 / 회신 부탁 드립니다.\n\n` +
      `감사합니다.`,
    );
    setEmailModalOpen(true);
  }

  async function processGoogleQuote(createDraft: boolean, subject = '', body = '') {
    if (!validateForSubmit()) return;
    if (createDraft) setEmailing(true);
    else setSubmitting(true);
    try {
      const quote = previewQuote ?? buildDraftQuote();
      const result = await processQuoteRequest(quote, createDraft, subject, body);
      if (!result.success) {
        throw new Error(result.message ?? t(UI.quoteGoogleConfigMissing));
      }

      const finalQuote: Quote = {
        ...quote,
        quoteNumber: result.newQuoteNumber ?? quote.quoteNumber,
      };
      saveQuote(finalQuote);
      setPreviewQuote(finalQuote);

      alert(result.message ?? `${t(UI.quoteSaved)}\n${t(UI.quoteNumber)}: ${finalQuote.quoteNumber}`);
      const openUrl = result.pdfUrl ?? result.url ?? result.folderUrl ?? result.sheetUrl;
      if (openUrl) window.open(openUrl, '_blank', 'noopener,noreferrer');
      if (createDraft) window.open('https://mail.google.com/mail/u/0/#drafts', '_blank', 'noopener,noreferrer');

      onSuccess();
    } catch (err) {
      alert(`${t(UI.quoteSaveFailed)}: ${String(err)}`);
    } finally {
      setSubmitting(false);
      setEmailing(false);
    }
  }

  function handleSave() {
    void processGoogleQuote(false);
  }

  function handleEmailDraft() {
    setEmailModalOpen(false);
    void processGoogleQuote(true, emailSubject, emailBody);
  }

  return (
    <>
      {previewQuote && (
        <QuotePrintView
          quote={previewQuote}
          pdfUrl={previewPdfUrl ?? undefined}
          loading={previewLoading}
          onClose={closePreview}
          onGenerate={handleSave}
          onEmail={openEmailComposer}
          generating={submitting}
          emailing={emailing}
        />
      )}
      {emailModalOpen && previewQuote && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-blue-600 text-white">
              <h2 className="text-sm font-bold">{t(UI.quoteEmailTitle)}</h2>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="text-blue-100 hover:text-white text-xl leading-none"
                aria-label={t(UI.close)}
              >
                x
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteEmailTo)}</label>
                <input value={previewQuote.client.email} readOnly className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-[#f7f6f3]" />
              </div>
              <div>
                <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteEmailSubject)}</label>
                <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#191919]" />
              </div>
              <div>
                <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteEmailBody)}</label>
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={10} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#191919] resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 bg-[#f0ede8] border-t border-[#ddd9d2]">
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-white transition-colors"
              >
                {t(UI.quoteCancel)}
              </button>
              <button
                type="button"
                onClick={handleEmailDraft}
                disabled={emailing}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-[#999999] transition-colors"
              >
                {emailing ? t(UI.quoteProcessing) : t(UI.quoteSendBtn)}
              </button>
            </div>
          </div>
        </div>
      )}
      {detailProduct && (
        <SpecModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          allProducts={PRODUCTS}
          onViewDetail={setDetailProduct}
        />
      )}

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
              onClick={openPreview}
              disabled={previewLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ddd9d2] text-sm text-[#555555] hover:bg-[#e6e2dc] disabled:opacity-60 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {previewLoading ? t(UI.quotePreviewLoading) : t(UI.quotePrintBtn)}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 고객 정보 + 부가 정보 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 고객 정보 */}
            <section className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] p-5">
              <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4">{t(UI.quoteCustomerInfo)}</h3>
              <div className="space-y-3">
                {[
                  { label: t(UI.quoteCompany) + ' *', value: company, onChange: setCompany, placeholder: t(UI.quoteCompany) },
                  { label: t(UI.quoteContact) + ' *', value: contact, onChange: setContact, placeholder: t(UI.quoteContact) },
                  { label: t(UI.quotePhone) + ' *', value: phone, onChange: setPhone, placeholder: '010-0000-0000' },
                  { label: t(UI.quoteEmail) + ' *', value: email, onChange: setEmail, placeholder: 'email@company.com' },
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
              <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4">{t(UI.quoteTradeTerms)}</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteDeliveryLocation)}</label>
                  <input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#191919]" />
                </div>
                <div>
                  <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteDeadline)}</label>
                  <input value={deliveryDeadline} onChange={(e) => setDeliveryDeadline(e.target.value)} placeholder={lang === 'en' ? 'e.g. 2 weeks after purchase order' : '예: 발주 후 2주'} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]" />
                </div>
                <div>
                  <label className="block text-xs text-[#555555] mb-1">{t(UI.quotePaymentTerms)}</label>
                  <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#191919]" />
                </div>
                <div>
                  <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteValidityPeriod)}</label>
                  <input value={validityPeriod} onChange={(e) => setValidityPeriod(e.target.value)} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]" />
                </div>
                <div>
                  <label className="block text-xs text-[#555555] mb-1">{t(UI.quotePacking)}</label>
                  <input value={packing} onChange={(e) => setPacking(e.target.value)} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#191919]" />
                </div>
              </div>
            </section>

            {/* 작성자 + 비고 */}
            <section className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] p-5">
              <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-4">{t(UI.quoteAuthorNotes)}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteAuthor)}</label>
                  {authorsLoading ? (
                    <div className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-[#f7f6f3] text-[#999999]">
                      {t(UI.quoteAuthorsLoading)}
                    </div>
                  ) : authors.length > 0 ? (
                    <select value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]">
                      {authors.map((a) => <option key={a.name} value={a.name}>{authorLabel(a.name, lang)}</option>)}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-600">{t(UI.quoteAuthorsLoadFailed)}</p>
                  )}
                </div>
                {!authorsLoading && needsManualAuthor && (
                  <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <div>
                      <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteAuthor)}{authors.length === 0 ? ' *' : ''}</label>
                      <input
                        value={customAuthorName}
                        onChange={(e) => setCustomAuthorName(e.target.value)}
                        placeholder={author || t(UI.quoteAuthor)}
                        className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#555555] mb-1">{t(UI.quotePhone)} *</label>
                      <input
                        value={customAuthorPhone}
                        onChange={(e) => setCustomAuthorPhone(e.target.value)}
                        placeholder="010-0000-0000"
                        className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteEmail)} *</label>
                      <input
                        type="email"
                        value={customAuthorEmail}
                        onChange={(e) => setCustomAuthorEmail(e.target.value)}
                        placeholder="email@company.com"
                        className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-[#555555] mb-1">{t(UI.quoteNotes)}</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919] resize-none" placeholder={lang === 'en' ? 'Notes to show on the quote' : '견적서에 표시할 특이사항'} />
                </div>
              </div>
            </section>
          </div>

          {/* 우측: 제품 목록 */}
          <div className="lg:col-span-2">
            <section className="bg-[#f0ede8] rounded-xl border border-[#ddd9d2] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#ddd9d2]">
                <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider">{t(UI.quoteProductQty)}</h3>
              </div>
              <div className="px-5 py-4 border-b border-[#ddd9d2] bg-white">
                <h4 className="text-sm font-bold text-blue-700 mb-3">{t(UI.quoteProductAdd)}</h4>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_120px_150px] gap-3">
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]"
                  >
                    {QUOTE_PRODUCT_CATALOG.map((group) => (
                      <option key={group.sheet} value={group.sheet}>{group.sheet}</option>
                    ))}
                  </select>
                  <select
                    value={selectedCatalogItem?.id ?? ''}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]"
                  >
                    {selectedCatalogBuckets.map((bucket) => (
                      <optgroup key={bucket.label} label={displayCategory(bucket.label, lang)}>
                        {bucket.items.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={addQty}
                    onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full text-center border border-[#ddd9d2] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#191919]"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedCatalogItem || items.length >= MAX_ITEMS}
                    className="w-full rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {t(UI.quoteAddBtn)}{selectedCatalogPrice != null ? ` (${formatMoney(selectedCatalogPrice, lang)})` : ''}
                  </button>
                </div>
                {selectedCatalogItem?.spec && (
                  <p className="text-xs text-[#777777] mt-2 line-clamp-2">{translateSpecValue(selectedCatalogItem.spec, lang)}</p>
                )}
                {selectedCatalogTiered && (
                  <p className="text-xs text-blue-600 mt-1">{t(UI.quoteTieredHint)}</p>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#e6e2dc]">
                    <tr>
                      <th className="w-10"></th>
                      <th className="text-left px-4 py-2.5 font-medium text-[#555555] text-xs">{t(UI.quoteModelName)}</th>
                      <th className="text-center px-3 py-2.5 font-medium text-[#555555] text-xs w-20">{t(UI.quoteSpecAction)}</th>
                      <th className="text-center px-3 py-2.5 font-medium text-[#555555] text-xs w-20">{t(UI.quoteQty)}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[#555555] text-xs w-28">{t(UI.quoteUnitPrice)}</th>
                      <th className="text-right px-3 py-2.5 font-medium text-[#555555] text-xs w-20">{t(UI.quoteMultiplier)}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-[#555555] text-xs w-28">{t(UI.quoteTotal)}</th>
                      <th className="text-center px-3 py-2.5 font-medium text-[#555555] text-xs w-16">{t(UI.quoteRemove)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const tiered = item.catalogItem ? item.catalogItem.tiers.length > 1 : item.product ? isTieredPricing(item.product.id) : false;
                      const rowTotal = itemTotal(item.unitPrice, item.multiplier, item.qty);
                      const isDragging = draggedIndex === idx;
                      const isDropTarget = dragOverIndex === idx && draggedIndex !== null && draggedIndex !== idx;
                      const matchedProduct = findProductForItem(item);
                      return (
                        <tr
                          key={item.key}
                          onDragOver={(e) => handleDragOver(idx, e)}
                          onDrop={(e) => handleDrop(idx, e)}
                          className={`border-t border-[#ddd9d2] bg-white transition-colors ${
                            isDragging ? 'opacity-50' : ''
                          } ${isDropTarget ? 'bg-blue-50 outline outline-2 outline-blue-300 outline-offset-[-2px]' : ''}`}
                        >
                          <td className="px-1 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                draggable
                                onDragStart={(e) => handleDragStart(idx, e)}
                                onDragEnd={handleDragEnd}
                                className="cursor-grab active:cursor-grabbing text-[#999999] hover:text-[#191919] p-1"
                                aria-label={t(UI.quoteDragReorder)}
                                title={t(UI.quoteDragReorder)}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 12h8M8 17h8" />
                                </svg>
                              </button>
                              <div className="flex flex-col items-center gap-0.5">
                              <button
                                type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                                className="text-[#999999] hover:text-[#191919] disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label={t(UI.quoteMoveUp)}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                type="button" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}
                                className="text-[#999999] hover:text-[#191919] disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label={t(UI.quoteMoveDown)}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#191919] text-xs">
                              <span className="text-[#777777] mr-1">{idx + 1}.</span>
                              {item.name}
                            </p>
                            <p className="text-[#999999] text-xs mt-0.5 line-clamp-2">
                              {displaySpec(item, lang)}
                            </p>
                            {tiered && <p className="text-[10px] text-blue-500 mt-0.5">{t(UI.quoteTieredHint)}</p>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {matchedProduct ? (
                              <button
                                type="button"
                                onClick={() => setDetailProduct(matchedProduct)}
                                className="px-2.5 py-1.5 rounded-lg border border-[#ddd9d2] bg-white text-xs font-medium text-[#555555] hover:bg-[#e6e2dc] hover:text-[#191919] transition-colors"
                              >
                                {t(UI.detailBtn)}
                              </button>
                            ) : (
                              <span className="text-xs text-[#bbbbbb]">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number" min={1} value={item.qty}
                              onChange={(e) => updateQty(idx, parseInt(e.target.value, 10))}
                              className="w-16 text-center border border-[#ddd9d2] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#191919] bg-white"
                            />
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.unitPrice != null ? formatKRW(item.unitPrice) : ''}
                              onChange={(e) => updatePrice(idx, parseKRW(e.target.value))}
                              placeholder={t(UI.quotePriceNone)}
                              className="w-24 text-right border border-[#ddd9d2] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#191919] bg-white"
                            />
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.multiplier}
                              onChange={(e) => updateMultiplier(idx, e.target.value)}
                              onBlur={() => normalizeMultiplier(idx)}
                              aria-label={`${t(UI.quoteMultiplier)} ${idx + 1}`}
                              className="w-20 text-right border border-[#ddd9d2] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#191919] bg-white"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.unitPrice != null
                              ? <span className="font-semibold text-xs">{formatKRW(rowTotal)}</span>
                              : <span className="text-[#999999] text-xs">—</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-xs font-medium text-red-500 hover:text-red-700"
                            >
                              {t(UI.quoteRemove)}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr className="border-t border-[#ddd9d2] bg-white">
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#999999]">
                          {t(UI.quoteEmptyItems)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 합계 */}
              <div className="px-5 py-4 border-t border-[#ddd9d2] space-y-1.5">
                <div className="flex justify-between text-sm text-[#555555]">
                  <span>{t(UI.quoteSubtotal)}</span>
                  <span>{formatMoney(subtotal, lang)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#191919] border-t border-[#ddd9d2] pt-2 mt-1">
                  <span>{t(UI.quoteVatTotal)}</span>
                  <span>{formatMoney(vatTotal, lang)}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
