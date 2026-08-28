export interface QuoteItem {
  no: number;
  type: string;
  name: string;
  spec: string;
  quantity: number;
  unitPrice: number;
  multiplier?: number;
  totalPrice: number;
}

export interface QuoteClient {
  company: string;
  contact: string;
  phone: string;
  email: string;
}

export interface AuthorInfo {
  name: string;
  phone: string;
  email: string;
  department: string;
}

export interface QuoteAuthor {
  name: string;
  phone: string;
  email: string;
  /** 작성자 부서 (예: 기술영업/영업/프로젝트). Apps Script가 이 값으로 Drive 저장 경로를 분기한다. */
  department?: string;
}

export interface QuoteDetails {
  quoteDate: string;
  deliveryLocation: string;
  deliveryDeadline: string;
  paymentTerms: string;
  validityPeriod: string;
  packing: string;
  notes: string;
}

export interface QuoteSummary {
  id: string;
  quoteNumber: string;
  createdAt: string;
  clientCompany: string;
  clientContact: string;
  vatTotal: number;
  authorName: string;
}

export interface Quote extends QuoteSummary {
  client: QuoteClient;
  author: QuoteAuthor;
  details: QuoteDetails;
  items: QuoteItem[];
  subtotal: number;
}

export interface CreateQuoteRequest {
  client: QuoteClient;
  author: QuoteAuthor;
  details: QuoteDetails;
  items: QuoteItem[];
  subtotal: number;
  vatTotal: number;
}

export interface QuoteMeta {
  sequence: Record<string, number>;
  quotes: Quote[];
}
