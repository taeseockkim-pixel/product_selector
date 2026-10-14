export interface QuoteNumberSequenceOptions {
  /** 가장 작은 비어 있는 일련번호 */
  firstMissingSequence: number;
  /** 현재 사용된 가장 큰 번호 다음 */
  nextSequentialSequence: number;
  /** 비어 있는 번호가 최대 사용 번호보다 앞에 있는지 */
  hasGap: boolean;
}

/**
 * 대장 행에서 삭제되어 비어 있는 NO/견적번호 일련번호와 최대 번호 다음 값을 계산한다.
 * 견적번호의 Rev 접미사가 있어도 기본 견적번호의 일련번호를 사용한다.
 */
export function deriveQuoteNumberSequenceOptions(
  rows: Array<{ values: unknown[] }>,
  quoteNumberColumnIndex: number,
): QuoteNumberSequenceOptions {
  const used = new Set<number>();
  let maxSequence = 0;

  const addSequence = (value: unknown) => {
    const sequence = Number(value);
    if (!Number.isInteger(sequence) || sequence <= 0) return;
    used.add(sequence);
    maxSequence = Math.max(maxSequence, sequence);
  };

  rows.forEach((row) => {
    addSequence(row.values[0]);
    const quoteNumber = String(row.values[quoteNumberColumnIndex] ?? '').trim();
    const match = quoteNumber.match(/-(\d+)(?:_Rev\d+)?$/i);
    if (match) addSequence(Number(match[1]));
  });

  let firstMissingSequence = 1;
  while (used.has(firstMissingSequence)) firstMissingSequence += 1;

  return {
    firstMissingSequence,
    nextSequentialSequence: maxSequence + 1,
    hasGap: firstMissingSequence <= maxSequence,
  };
}
