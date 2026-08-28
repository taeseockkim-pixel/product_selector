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

export interface QuoteAuthor {
  name: string;
  phone: string;
  email: string;
  /** 특정 팀(예: 프로젝트사업실) 소속 견적일 때만 설정. Apps Script가 이 값으로 Drive 저장 경로를 분기한다. */
  authorTeam?: string;
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
