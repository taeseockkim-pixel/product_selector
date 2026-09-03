import type { AuthorInfo } from '../types/quote';

/** Apps Script processQuote 처리 결과 */
export interface QuoteProcessResult {
  success: boolean;
  message?: string;
  newQuoteNumber?: string;
  folderUrl?: string;
  pdfUrl?: string;
  sheetUrl?: string;
  url?: string;
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
            };
          };
        };
      };
    };
  }
}

function callAppsScriptFn<T>(
  fnName: 'getAuthorsFromReact' | 'getAuthorizedUserFromReact' | 'getQuoteLedgerFromReact',
  year?: number,
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
    else if (fnName === 'getAuthorsFromReact') call.getAuthorsFromReact();
    else call.getAuthorizedUserFromReact();
  });
}

function callAppsScriptFnViaParentBridge<T>(
  resultType: 'LOAD_AUTHORS_RESULT' | 'LOAD_AUTHORIZED_USER_RESULT' | 'LOAD_QUOTE_LEDGER_RESULT',
  requestType: 'LOAD_AUTHORS' | 'LOAD_AUTHORIZED_USER' | 'LOAD_QUOTE_LEDGER',
  timeoutMs: number,
  payload: { year?: number } = {},
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

/** 앱 진입 시 접속 계정의 견적 기능 사용 권한을 확인한다 (fetchAuthorization 별칭) */
export function checkQuoteAccess(): Promise<AuthorizationResult> {
  return fetchAuthorization();
}
