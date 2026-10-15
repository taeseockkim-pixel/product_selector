/** 수기 품목 textarea를 입력한 줄바꿈과 예상 자동 줄바꿈에 맞춰 키운다. */
export function quoteItemTextareaRows(value: string, displayUnitsPerLine: number) {
  const maxUnitsPerLine = Number.isFinite(displayUnitsPerLine)
    ? Math.max(1, Math.trunc(displayUnitsPerLine))
    : 1;
  const lineCount = String(value ?? '').replace(/\r\n?/g, '\n').split('\n').reduce((count, line) => {
    const units = Array.from(line).reduce((total, character) => (
      total + (/^[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7A3\uD7B0-\uD7FF\uFFA0-\uFFDC]$/u.test(character) ? 2 : 1)
    ), 0);
    return count + Math.max(1, Math.ceil(units / maxUnitsPerLine));
  }, 0);
  return Math.max(2, lineCount);
}
