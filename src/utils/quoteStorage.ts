import type { Quote, QuoteSummary } from '../types/quote';

const STORAGE_KEY = 'cimon-quotes';
const SEQ_KEY = 'cimon-quote-seq';

interface SeqMap { [yymm: string]: number }

export function getSeq(yymm: string): number {
  try {
    const raw = localStorage.getItem(SEQ_KEY);
    const map: SeqMap = raw ? JSON.parse(raw) : {};
    return map[yymm] ?? 0;
  } catch { return 0; }
}

export function nextSeq(yymm: string): number {
  try {
    const raw = localStorage.getItem(SEQ_KEY);
    const map: SeqMap = raw ? JSON.parse(raw) : {};
    const next = (map[yymm] ?? 0) + 1;
    map[yymm] = next;
    localStorage.setItem(SEQ_KEY, JSON.stringify(map));
    return next;
  } catch { return 1; }
}

export function saveQuote(quote: Quote): void {
  const all = loadAllQuotes();
  all.unshift(quote);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function loadAllQuotes(): Quote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Quote[]) : [];
  } catch { return []; }
}

export function loadQuote(id: string): Quote | null {
  return loadAllQuotes().find((q) => q.id === id) ?? null;
}

export function deleteQuote(id: string): void {
  const all = loadAllQuotes().filter((q) => q.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function loadSummaries(): QuoteSummary[] {
  return loadAllQuotes().map((q) => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    createdAt: q.createdAt,
    clientCompany: q.clientCompany,
    clientContact: q.clientContact,
    vatTotal: q.vatTotal,
    authorName: q.authorName,
  }));
}
