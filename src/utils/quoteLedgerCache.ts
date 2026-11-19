import type { LedgerResult } from './appsScriptBridge';

const QUOTE_LEDGER_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_QUOTE_LEDGER_CACHE_ENTRIES = 12;

interface QuoteLedgerCacheEntry {
  result: LedgerResult;
  fetchedAt: number;
}

export interface CachedQuoteLedger {
  result: LedgerResult;
  fetchedAt: number;
  fresh: boolean;
}

const quoteLedgerCache = new Map<string, QuoteLedgerCacheEntry>();

function quoteLedgerCacheKey(ownerEmail: string, year: number, department: string) {
  const email = ownerEmail.trim().toLocaleLowerCase('en-US');
  const dept = department.trim();
  if (!email || !dept || !Number.isInteger(year)) return null;
  return JSON.stringify([email, year, dept]);
}

/** 사용자의 현재 세션 안에서만 견적 대장 응답을 메모리에 보존한다. */
export function cacheQuoteLedger(
  ownerEmail: string | undefined,
  year: number,
  department: string,
  result: LedgerResult,
  now = Date.now(),
) {
  if (!ownerEmail || !result.success) return;
  const key = quoteLedgerCacheKey(ownerEmail, year, department);
  if (!key) return;

  quoteLedgerCache.delete(key);
  quoteLedgerCache.set(key, { result, fetchedAt: now });
  while (quoteLedgerCache.size > MAX_QUOTE_LEDGER_CACHE_ENTRIES) {
    const oldestKey = quoteLedgerCache.keys().next().value;
    if (oldestKey === undefined) break;
    quoteLedgerCache.delete(oldestKey);
  }
}

/** 오래된 응답도 반환해 우선 화면에 쓰고, 호출자가 백그라운드 갱신 여부를 결정하게 한다. */
export function getCachedQuoteLedger(
  ownerEmail: string | undefined,
  year: number,
  department: string,
  now = Date.now(),
): CachedQuoteLedger | null {
  if (!ownerEmail) return null;
  const key = quoteLedgerCacheKey(ownerEmail, year, department);
  if (!key) return null;
  const cached = quoteLedgerCache.get(key);
  if (!cached) return null;

  // 조회 순서대로 Map의 LRU 순서를 갱신한다.
  quoteLedgerCache.delete(key);
  quoteLedgerCache.set(key, cached);
  return {
    ...cached,
    fresh: now - cached.fetchedAt <= QUOTE_LEDGER_CACHE_TTL_MS,
  };
}

export function clearQuoteLedgerCache() {
  quoteLedgerCache.clear();
}
