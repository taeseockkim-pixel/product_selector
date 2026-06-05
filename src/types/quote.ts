export interface QuoteItem {
  no: number;
  type: string;
  name: string;
  spec: string;
  quantity: number;
  unitPrice: number;
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
