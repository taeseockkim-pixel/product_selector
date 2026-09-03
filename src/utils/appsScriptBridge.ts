import type { AuthorInfo } from '../types/quote';

/** Apps Script processQuote 처리 결과 */
export interface QuoteProcessResult {
  success: boolean;
  message?: string;
  newQuoteNumber?: string;
  baseQuoteNumber?: string;
  revisionNumber?: number;
  folderUrl?: string;
  pdfUrl?: string;
  sheetUrl?: string;
  url?: string;
}

export interface QuoteEditDetails {
  clientName?: string;
  clientContactPerson?: string;
  clientPhone?: string;
  clientEmail?: string;
  quoteNumber?: string;
  quoteDate?: string;
  deliveryLocation?: string;
  deliveryDeadline?: string;
  paymentTerms?: string;
  validityPeriod?: string;
  packing?: string;
  notes?: string;
  authorName?: string;
  authorPhone?: string;
  authorEmail?: string;
  authorDepartment?: string;
  /** 수정 저장 시 견적 폴더명을 원본과 동일하게 유지하기 위한 값 */
  folderClientName?: string;
}

export interface QuoteEditItem {
  type?: string;
  name: string;
  spec?: string;
  quantity?: number;
  unitPrice?: number;
  multiplier?: number;
  totalPrice?: number;
}

export interface QuoteEditData {
  quoteNumber: string;
  baseQuoteNumber: string;
  /** 원본 견적이 저장된 대장 연도 — 수정본 저장 시 같은 연도 대장을 다시 찾는 데 사용한다 */
  year: number;
  /** 원본 견적이 저장된 부서 — 수정본 저장 시 폼의 작성자 드롭다운과 무관하게 이 부서의 폴더/대장을 사용한다 */
  department: string;
  details: QuoteEditDetails;
  items: QuoteEditItem[];
}

export interface QuoteEditResult {
  success: boolean;
  quote?: QuoteEditData;
  message?: string;
}

/** 작성자 DB 시트 조회 결과 */
export interface AuthorListResult {
  success: boolean;
  authors?: AuthorInfo[];
  message?: string;
}

/** 접속 계정 권한 확인 결과 */
export interface AuthorizationResult {
  success: boolean;
  authorized: boolean;
  /** authorized === true일 때 작성자 시트의 해당 행 */
  author?: AuthorInfo;
  /** authorized === false일 때 확인된 계정 이메일 */
  email?: string;
  message?: string;
}

export interface LedgerRow {
  values: string[];
  links: Array<string | null>;
}

export interface LedgerResult {
  success: boolean;
  headers?: string[];
  rows?: LedgerRow[];
  availableYears?: number[];
  message?: string;
}

export interface AppsScriptBridgeResponse {
  source?: string;
  type?: string;
  requestId?: string;
  result?: QuoteProcessResult;
  error?: string;
}

export interface QuoteEditBridgeResponse {
  source?: string;
  type?: string;
  requestId?: string;
  result?: QuoteEditResult;
  error?: string;
}

export interface AuthorBridgeResponse {
  source?: string;
  type?: string;
  requestId?: string;
  result?: AuthorListResult;
  error?: string;
}

export interface AuthBridgeResponse {
  source?: string;
  type?: string;
  requestId?: string;
  result?: AuthorizationResult;
  error?: string;
}

declare global {
  interface Window {
    google?: {
      script?: {
        run?: {
          withSuccessHandler<T>(handler: (result: T) => void): {
            withFailureHandler: (handler: (error: unknown) => void) => {
              processQuoteFromReact: (payload: unknown) => void;
              getAuthorsFromReact: () => void;
              getAuthorizedUserFromReact: () => void;
              getQuoteLedgerFromReact: (year?: number) => void;
              getQuoteForEditFromReact: (year: number, quoteNumber: string) => void;
              updateQuoteOrderFromReact: (payload: unknown) => void;
            };
          };
        };
      };
    };
  }
}

function callAppsScriptFn<T>(
  fnName: 'getAuthorsFromReact' | 'getAuthorizedUserFromReact' | 'getQuoteLedgerFromReact' | 'getQuoteForEditFromReact',
  year?: number,
  quoteNumber?: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = window.google?.script?.run;
    if (!runner) {
      reject(new Error('google.script.run을 사용할 수 없습니다.'));
      return;
    }
    const call = runner
      .withSuccessHandler<T>(resolve)
      .withFailureHandler((error) => reject(new Error(String(error))));
    if (fnName === 'getQuoteLedgerFromReact') call.getQuoteLedgerFromReact(year);
    else if (fnName === 'getQuoteForEditFromReact') call.getQuoteForEditFromReact(year ?? 0, quoteNumber ?? '');
    else if (fnName === 'getAuthorsFromReact') call.getAuthorsFromReact();
    else call.getAuthorizedUserFromReact();
  });
}

function callAppsScriptFnViaParentBridge<T>(
  resultType: 'LOAD_AUTHORS_RESULT' | 'LOAD_AUTHORIZED_USER_RESULT' | 'LOAD_QUOTE_LEDGER_RESULT' | 'LOAD_QUOTE_EDIT_RESULT' | 'UPDATE_QUOTE_ORDER_RESULT',
  requestType: 'LOAD_AUTHORS' | 'LOAD_AUTHORIZED_USER' | 'LOAD_QUOTE_LEDGER' | 'LOAD_QUOTE_EDIT' | 'UPDATE_QUOTE_ORDER',
  timeoutMs: number,
  payload: Record<string, unknown> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = `${requestType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error('Apps Script 응답 시간이 초과되었습니다.'));
    }, timeoutMs);

    function handleMessage(event: MessageEvent<{ source?: string; type?: string; requestId?: string; result?: T; error?: string }>) {
      const data = event.data;
      if (data?.source !== 'cimon-appscript-bridge' || data.type !== resultType || data.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timer);
      window.removeEventListener('message', handleMessage);
      if (data.error) reject(new Error(data.error));
      else resolve(data.result as T);
    }

    window.addEventListener('message', handleMessage);
    window.parent.postMessage(
      { source: 'cimon-quote-app', type: requestType, requestId, ...payload },
      '*',
    );
  });
}

function callAppsScriptPayload<T>(
  fnName: 'updateQuoteOrderFromReact',
  payload: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = window.google?.script?.run;
    if (!runner) {
      reject(new Error('google.script.run을 사용할 수 없습니다.'));
      return;
    }
    const call = runner
      .withSuccessHandler<T>(resolve)
      .withFailureHandler((error) => reject(new Error(String(error))));
    call[fnName](payload);
  });
}

/** 작성자 DB 시트에서 작성자 목록을 조회한다 */
export function fetchAuthors(): Promise<AuthorListResult> {
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<AuthorListResult>('LOAD_AUTHORS_RESULT', 'LOAD_AUTHORS', 15000);
  }
  return callAppsScriptFn<AuthorListResult>('getAuthorsFromReact');
}

/** 접속 Google 계정이 작성자 DB에 등록되어 있는지 확인한다 */
export function fetchAuthorization(): Promise<AuthorizationResult> {
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<AuthorizationResult>('LOAD_AUTHORIZED_USER_RESULT', 'LOAD_AUTHORIZED_USER', 15000);
  }
  return callAppsScriptFn<AuthorizationResult>('getAuthorizedUserFromReact');
}

/** 접속 계정의 부서 대장을 조회한다 */
export function fetchLedger(year?: number): Promise<LedgerResult> {
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<LedgerResult>(
      'LOAD_QUOTE_LEDGER_RESULT',
      'LOAD_QUOTE_LEDGER',
      30000,
      { year },
    );
  }
  return callAppsScriptFn<LedgerResult>('getQuoteLedgerFromReact', year);
}

/** 선택한 견적의 원본 데이터를 읽어 수정 폼에 전달한다 */
export function fetchQuoteForEdit(year: number, quoteNumber: string): Promise<QuoteEditResult> {
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<QuoteEditResult>(
      'LOAD_QUOTE_EDIT_RESULT',
      'LOAD_QUOTE_EDIT',
      30000,
      { year, quoteNumber },
    );
  }
  return callAppsScriptFn<QuoteEditResult>('getQuoteForEditFromReact', year, quoteNumber);
}

/** 현재 사용자의 대장에 발주 여부를 기록한다 */
export function updateQuoteOrder(year: number, quoteNumber: string, ordered: boolean): Promise<QuoteProcessResult> {
  const payload = { year, quoteNumber, ordered };
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<QuoteProcessResult>(
      'UPDATE_QUOTE_ORDER_RESULT',
      'UPDATE_QUOTE_ORDER',
      30000,
      payload,
    );
  }
  return callAppsScriptPayload<QuoteProcessResult>('updateQuoteOrderFromReact', payload);
}

/** 앱 진입 시 접속 계정의 견적 기능 사용 권한을 확인한다 (fetchAuthorization 별칭) */
export function checkQuoteAccess(): Promise<AuthorizationResult> {
  return fetchAuthorization();
}
