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
  /** 모든 부서를 조회/관리할 수 있는 관리자 여부 */
  isAdmin?: boolean;
  /** 선택 가능한 부서 목록 (예: ['기술영업', '영업', '프로젝트']) */
  availableDepartments?: string[];
}

export interface LedgerRow {
  values: string[];
  links: Array<string | null>;
  /** 라인삭제(취소선) 상태 — true면 대장에 검은 취소선이 표시된 견적 */
  struck?: boolean;
}

export interface LedgerResult {
  success: boolean;
  headers?: string[];
  rows?: LedgerRow[];
  availableYears?: number[];
  department?: string;
  isAdmin?: boolean;
  availableDepartments?: string[];
  message?: string;
}

export interface AppsScriptBridgeResponse {
  source?: string;
  type?: string;
  requestId?: string;
  result?: QuoteProcessResult;
  error?: string;
}

/** 로컬 에이전트에서 읽어 메일에 첨부할 파일 */
export interface OrderDraftFile {
  name: string;
  mimeType: string;
  base64: string;
}

/** 발주등록 요청 메일 초안 생성 요청 */
export interface OrderDraftRequest {
  year: number;
  department: string;
  quoteNumber: string;
  clientName: string;
  productName: string;
  contactName: string;
  contactPhone: string;
  /** 납품 주소 — 필수 */
  deliveryAddress: string;
  /** 로컬 에이전트가 읽어 전달한 첨부 파일 — 1개 이상 필수 */
  files: OrderDraftFile[];
}

export interface OrderDraftResult {
  success: boolean;
  message?: string;
}

/** 발주등록 요청 메일 첨부용 파일 목록 조회 결과 */
export interface QuoteFilesResult {
  success: boolean;
  folder?: string;
  files?: Array<{ name: string; size: number }>;
  message?: string;
}

/** 대시보드 통계용 견적 품목 */
export interface DashboardStatsItem {
  name: string;
  spec: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/** 대시보드 통계용 견적 레코드 (에이전트가 stats/<부서>.json으로 기록) */
export interface DashboardStatsRecord {
  quoteNumber: string;
  quoteDate: string;
  year: number;
  company: string;
  contact: string;
  phone: string;
  email: string;
  authorName: string;
  authorEmail: string;
  amount: number;
  items: DashboardStatsItem[];
  folderName: string;
  fileName: string;
  /** 견적에 발주 체크가 되어 있으면 true (통계 JSON이 없는 경우 기본 false) */
  ordered?: boolean;
}

/** 대시보드 통계 조회 결과 */
export interface DashboardStatsResult {
  success: boolean;
  department?: string;
  generatedAt?: string;
  records?: DashboardStatsRecord[];
  message?: string;
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
              getQuoteLedgerFromReact: (year?: number, department?: string) => void;
              getQuoteForEditFromReact: (year: number, quoteNumber: string, department?: string) => void;
              updateQuoteOrderFromReact: (payload: unknown) => void;
              createOrderDraftFromReact: (payload: unknown) => void;
              getQuoteFilesFromReact: (payload: unknown) => void;
              getDashboardStatsFromReact: (payload: unknown) => void;
              deleteQuoteFromReact: (payload: unknown) => void;
              restoreQuoteFromReact: (payload: unknown) => void;
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
  department?: string,
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
    if (fnName === 'getQuoteLedgerFromReact') call.getQuoteLedgerFromReact(year, department);
    else if (fnName === 'getQuoteForEditFromReact') call.getQuoteForEditFromReact(year ?? 0, quoteNumber ?? '', department);
    else if (fnName === 'getAuthorsFromReact') call.getAuthorsFromReact();
    else call.getAuthorizedUserFromReact();
  });
}

function callAppsScriptFnViaParentBridge<T>(
  resultType: 'LOAD_AUTHORS_RESULT' | 'LOAD_AUTHORIZED_USER_RESULT' | 'LOAD_QUOTE_LEDGER_RESULT' | 'LOAD_QUOTE_EDIT_RESULT' | 'UPDATE_QUOTE_ORDER_RESULT' | 'CREATE_ORDER_DRAFT_RESULT' | 'GET_QUOTE_FILES_RESULT' | 'GET_DASHBOARD_STATS_RESULT' | 'DELETE_QUOTE_RESULT' | 'RESTORE_QUOTE_RESULT',
  requestType: 'LOAD_AUTHORS' | 'LOAD_AUTHORIZED_USER' | 'LOAD_QUOTE_LEDGER' | 'LOAD_QUOTE_EDIT' | 'UPDATE_QUOTE_ORDER' | 'CREATE_ORDER_DRAFT' | 'GET_QUOTE_FILES' | 'GET_DASHBOARD_STATS' | 'DELETE_QUOTE' | 'RESTORE_QUOTE',
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
  fnName: 'updateQuoteOrderFromReact' | 'createOrderDraftFromReact' | 'getQuoteFilesFromReact' | 'getDashboardStatsFromReact' | 'deleteQuoteFromReact' | 'restoreQuoteFromReact',
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

/** 접속 계정(또는 관리자가 선택한 부서)의 대장을 조회한다 */
export function fetchLedger(year?: number, department?: string): Promise<LedgerResult> {
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<LedgerResult>(
      'LOAD_QUOTE_LEDGER_RESULT',
      'LOAD_QUOTE_LEDGER',
      30000,
      { year, department },
    );
  }
  return callAppsScriptFn<LedgerResult>('getQuoteLedgerFromReact', year, undefined, department);
}

/** 선택한 견적의 원본 데이터를 읽어 수정 폼에 전달한다 */
export function fetchQuoteForEdit(year: number, quoteNumber: string, department?: string): Promise<QuoteEditResult> {
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<QuoteEditResult>(
      'LOAD_QUOTE_EDIT_RESULT',
      'LOAD_QUOTE_EDIT',
      30000,
      { year, quoteNumber, department },
    );
  }
  return callAppsScriptFn<QuoteEditResult>('getQuoteForEditFromReact', year, quoteNumber, department);
}

/** 현재 사용자의 대장에 발주 여부를 기록한다 */
export function updateQuoteOrder(year: number, quoteNumber: string, ordered: boolean, department?: string): Promise<QuoteProcessResult> {
  const payload = { year, quoteNumber, ordered, department };
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

/** 발주등록 요청 메일 초안을 현재 로그인한 담당자의 Gmail 임시보관함에 생성한다 */
export function createOrderDraft(request: OrderDraftRequest): Promise<OrderDraftResult> {
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<OrderDraftResult>(
      'CREATE_ORDER_DRAFT_RESULT',
      'CREATE_ORDER_DRAFT',
      60000,
      { payload: request },
    );
  }
  return callAppsScriptPayload<OrderDraftResult>('createOrderDraftFromReact', request);
}

/** 발주등록 요청 메일 첨부용 견적 폴더 파일 목록을 조회한다 */
export function fetchQuoteFiles(payload: { year: number; department: string; quoteNumber: string; company: string }): Promise<QuoteFilesResult> {
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<QuoteFilesResult>(
      'GET_QUOTE_FILES_RESULT',
      'GET_QUOTE_FILES',
      30000,
      { payload },
    );
  }
  return callAppsScriptPayload<QuoteFilesResult>('getQuoteFilesFromReact', payload);
}

/** 대시보드 통계 데이터를 조회한다 (에이전트가 기록한 stats/<부서>.json) */
export function fetchDashboardStats(department: string): Promise<DashboardStatsResult> {
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<DashboardStatsResult>(
      'GET_DASHBOARD_STATS_RESULT',
      'GET_DASHBOARD_STATS',
      30000,
      { payload: { department } },
    );
  }
  return callAppsScriptPayload<DashboardStatsResult>('getDashboardStatsFromReact', { department });
}

/** 견적 삭제 — mode: 'permanent'(영구삭제) | 'strikethrough'(라인삭제/취소선) */
export function deleteQuote(payload: { year: number; department: string; quoteNumber: string; mode: 'permanent' | 'strikethrough' }): Promise<QuoteProcessResult> {
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<QuoteProcessResult>(
      'DELETE_QUOTE_RESULT',
      'DELETE_QUOTE',
      30000,
      { payload },
    );
  }
  return callAppsScriptPayload<QuoteProcessResult>('deleteQuoteFromReact', payload);
}

/** 라인삭제(취소선) 해제 */
export function restoreQuote(payload: { year: number; department: string; quoteNumber: string }): Promise<QuoteProcessResult> {
  if (window.parent && window.parent !== window) {
    return callAppsScriptFnViaParentBridge<QuoteProcessResult>(
      'RESTORE_QUOTE_RESULT',
      'RESTORE_QUOTE',
      30000,
      { payload },
    );
  }
  return callAppsScriptPayload<QuoteProcessResult>('restoreQuoteFromReact', payload);
}

/** 앱 진입 시 접속 계정의 견적 기능 사용 권한을 확인한다 (fetchAuthorization 별칭) */
export function checkQuoteAccess(): Promise<AuthorizationResult> {
  return fetchAuthorization();
}
