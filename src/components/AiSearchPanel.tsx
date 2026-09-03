import { useRef, useState, type KeyboardEvent } from 'react';
import { useT } from '../context/LangContext';
import { UI } from '../i18n/ui';
import type { LedgerRow } from '../utils/appsScriptBridge';

interface Props {
  open: boolean;
  year: number;
  department: string;
  headers: string[];
  rows: LedgerRow[];
}

interface AiApiResponse {
  success: boolean;
  message?: string;
  answer?: string;
  label?: string;
  model?: string;
}

interface LedgerAiContext {
  source: string;
  selectedYear: number;
  department: string;
  rowCount: number;
  truncated: boolean;
  note: string;
  rows: Array<{
    date: string;
    quoteNumber: string;
    company: string;
    contact: string;
    phone: string;
    email: string;
    category: string;
    product: string;
    amountKrw: number | null;
  }>;
}

type ConnectionState = 'idle' | 'checking' | 'connected' | 'error';

const DEFAULT_MODEL = 'openrouter/auto';
const MAX_CONTEXT_ROWS = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function parseAmount(value: string): number | null {
  const normalized = value.replace(/[^\d.-]/g, '');
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function findColumn(headers: string[], labels: string[]) {
  return headers.findIndex((header) => labels.some((label) => header.includes(label)));
}

function contextFromLedger(headers: string[], rows: LedgerRow[], year: number, department: string): LedgerAiContext {
  const quoteNumberIndex = findColumn(headers, ['견적번호']);
  const dateIndex = findColumn(headers, ['견적일자', '날짜']);
  const yearIndex = findColumn(headers, ['연도', '년도']);
  const monthIndex = findColumn(headers, ['월']);
  const dayIndex = findColumn(headers, ['일']);
  const companyIndex = findColumn(headers, ['업체명', '회사명', '회사']);
  const contactIndex = findColumn(headers, ['고객명', '담당자']);
  const phoneIndex = findColumn(headers, ['연락처', '전화', '휴대폰']);
  const emailIndex = findColumn(headers, ['이메일', '메일']);
  const categoryIndex = findColumn(headers, ['제품군', '제품 항목', '제품분류', '카테고리']);
  const productIndex = findColumn(headers, ['제품명', '품명', '모델명']);
  const amountIndex = findColumn(headers, ['견적금액', '총 견적금액', '금액']);

  const valueAt = (row: LedgerRow, index: number) => index >= 0 ? row.values[index] ?? '' : '';
  const contextRows = rows.slice(0, MAX_CONTEXT_ROWS).map((row) => {
    const yearValue = valueAt(row, yearIndex);
    const monthValue = valueAt(row, monthIndex);
    const dayValue = valueAt(row, dayIndex);
    const date = [yearValue, monthValue, dayValue].every(Boolean)
      ? `${yearValue}-${monthValue}-${dayValue}`
      : valueAt(row, dateIndex);
    const product = valueAt(row, productIndex);

    return {
      date,
      quoteNumber: valueAt(row, quoteNumberIndex),
      company: valueAt(row, companyIndex),
      contact: valueAt(row, contactIndex),
      phone: valueAt(row, phoneIndex),
      email: valueAt(row, emailIndex),
      category: valueAt(row, categoryIndex),
      product,
      amountKrw: parseAmount(valueAt(row, amountIndex)),
    };
  }).filter((row) => row.quoteNumber || row.company || row.product);

  return {
    source: 'CIMON 견적관리대장',
    selectedYear: year,
    department,
    rowCount: rows.length,
    truncated: rows.length > MAX_CONTEXT_ROWS,
    note: '현재 사용자의 부서 대장만 포함합니다. 제품명은 여러 품목 견적에서 요약되어 있을 수 있습니다.',
    rows: contextRows,
  };
}

function parseAiResponse(value: unknown): AiApiResponse | null {
  if (!isRecord(value) || typeof value.success !== 'boolean') return null;
  return {
    success: value.success,
    message: textValue(value.message),
    answer: textValue(value.answer),
    label: textValue(value.label),
    model: textValue(value.model),
  };
}

async function requestAi(payload: Record<string, unknown>): Promise<AiApiResponse> {
  const response = await fetch('/api/ai/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let raw: unknown = null;
  try {
    raw = await response.json();
  } catch {
    raw = null;
  }
  const result = parseAiResponse(raw);
  if (!result) throw new Error('AI 서버 응답 형식을 확인해 주세요.');
  if (!response.ok || !result.success) throw new Error(result.message || 'AI 요청에 실패했습니다.');
  return result;
}

export default function AiSearchPanel({ open, year, department, headers, rows }: Props) {
  const t = useT();
  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [zdrOnly, setZdrOnly] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  if (!open) return null;

  const scopeMessage = t(UI.quoteAiScope)
    .replace('{year}', String(year))
    .replace('{department}', department || t(UI.quoteAiUnknownDepartment))
    .replace('{count}', String(rows.length));

  function handleKeyChange(value: string) {
    setApiKey(value);
    setConnectionState('idle');
    setStatusMessage('');
    setError('');
    setAnswer('');
  }

  async function handleConnect() {
    const key = apiKey.trim();
    if (!key) {
      setError(t(UI.quoteAiKeyRequired));
      return;
    }
    setConnectionState('checking');
    setStatusMessage(t(UI.quoteAiChecking));
    setError('');
    try {
      const result = await requestAi({ action: 'validate', apiKey: key });
      setConnectionState('connected');
      setStatusMessage(result.label ? `${t(UI.quoteAiConnected)}: ${result.label}` : t(UI.quoteAiConnected));
    } catch (err) {
      setConnectionState('error');
      setStatusMessage('');
      setError(`${t(UI.quoteAiConnectionFailed)}: ${String(err)}`);
    }
  }

  function handleClearKey() {
    setApiKey('');
    setConnectionState('idle');
    setStatusMessage('');
    setError('');
    setAnswer('');
  }

  function handleChangeKey() {
    handleClearKey();
    apiKeyInputRef.current?.focus();
  }

  async function handleAsk() {
    const key = apiKey.trim();
    const query = question.trim();
    if (!key) {
      setError(t(UI.quoteAiKeyRequired));
      return;
    }
    if (!query) {
      setError(t(UI.quoteAiQuestionRequired));
      return;
    }
    if (connectionState !== 'connected') {
      setError(t(UI.quoteAiConnectFirst));
      return;
    }

    setSearching(true);
    setError('');
    setAnswer('');
    try {
      const result = await requestAi({
        action: 'query',
        apiKey: key,
        model: model.trim() || DEFAULT_MODEL,
        zdr: zdrOnly,
        question: query,
        department,
        context: contextFromLedger(headers, rows, year, department),
      });
      setAnswer(result.answer ?? '');
    } catch (err) {
      setError(`${t(UI.quoteAiSearchFailed)}: ${String(err)}`);
    } finally {
      setSearching(false);
    }
  }

  function handleQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleAsk();
    }
  }

  return (
    <section className="mb-5 rounded-xl border border-blue-200 bg-blue-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-[#191919]">{t(UI.quoteAiTitle)}</h2>
          <p className="text-xs text-[#555555] mt-1">{scopeMessage}</p>
        </div>
        {connectionState === 'connected' && (
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
            {t(UI.quoteAiConnected)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(180px,0.8fr)] gap-3">
        <div>
          <label className="block text-xs font-medium text-[#555555] mb-1">{t(UI.quoteAiApiKey)}</label>
          <div className="flex flex-wrap gap-2">
            <input
              ref={apiKeyInputRef}
              type="password"
              value={apiKey}
              onChange={(event) => handleKeyChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleConnect();
              }}
              placeholder={t(UI.quoteAiApiKeyPlaceholder)}
              autoComplete="off"
              readOnly={connectionState === 'connected'}
              className="min-w-0 flex-1 border border-[#c9d8ee] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={!apiKey.trim() || connectionState === 'checking'}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {connectionState === 'checking' ? t(UI.quoteAiChecking) : t(UI.quoteAiConnect)}
            </button>
            {apiKey && connectionState !== 'connected' && (
              <button
                type="button"
                onClick={handleClearKey}
                className="rounded-lg border border-[#c9d8ee] bg-white px-3 py-2 text-sm text-[#555555] hover:bg-blue-100"
              >
                {t(UI.quoteAiClearKey)}
              </button>
            )}
            {connectionState === 'connected' && (
              <button
                type="button"
                onClick={handleChangeKey}
                className="rounded-lg border border-[#c9d8ee] bg-white px-3 py-2 text-sm text-[#555555] hover:bg-blue-100"
              >
                {t(UI.quoteAiChangeKey)}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-[#667085]">{t(UI.quoteAiSecurityHint)}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#555555] mb-1">{t(UI.quoteAiModel)}</label>
          <input
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder={t(UI.quoteAiModelPlaceholder)}
            className="w-full border border-[#c9d8ee] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
          />
          <label className="flex items-center gap-2 mt-2 text-xs text-[#555555]">
            <input type="checkbox" checked={zdrOnly} onChange={(event) => setZdrOnly(event.target.checked)} />
            {t(UI.quoteAiZdr)}
          </label>
        </div>
      </div>

      {statusMessage && <p className="mt-3 text-xs text-green-700">{statusMessage}</p>}
      {error && <p className="mt-3 text-xs text-red-600" role="alert">{error}</p>}

      <div className="mt-4">
        <label className="block text-xs font-medium text-[#555555] mb-1">{t(UI.quoteAiQuestion)}</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            placeholder={t(UI.quoteAiQuestionPlaceholder)}
            rows={2}
            className="min-h-20 flex-1 border border-[#c9d8ee] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 resize-y"
          />
          <button
            type="button"
            onClick={() => void handleAsk()}
            disabled={searching || connectionState !== 'connected' || !question.trim() || rows.length === 0}
            className="sm:self-stretch rounded-lg bg-[#191919] px-5 py-2 text-sm font-semibold text-white hover:bg-[#333333] disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {searching ? t(UI.quoteAiSearching) : t(UI.quoteAiAsk)}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[#667085]">{t(UI.quoteAiZdrHint)}</p>
      </div>

      {answer && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-white p-4">
          <h3 className="text-xs font-bold text-[#555555] mb-2">{t(UI.quoteAiAnswer)}</h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#191919]">{answer}</p>
        </div>
      )}
    </section>
  );
}
