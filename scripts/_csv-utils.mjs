// RFC 4180 CSV 유틸리티

/**
 * RFC 4180 규칙으로 CSV 셀 값을 이스케이프.
 * 쉼표, 큰따옴표, 개행이 포함된 경우 큰따옴표로 감싸고 내부 "는 ""로 이스케이프.
 */
export function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * RFC 4180 규칙으로 CSV 텍스트를 파싱.
 * BOM 제거, 빈 줄 무시.
 * @returns {string[][]} 헤더 포함 2차원 배열
 */
export function parseCSV(text) {
  // UTF-8 BOM 제거
  const clean = text.startsWith('﻿') ? text.slice(1) : text;

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < clean.length) {
    const ch = clean[i];

    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\r' && clean[i + 1] === '\n') {
        row.push(field);
        field = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        i += 2;
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // 마지막 행 처리
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some(c => c !== '')) rows.push(row);
  }

  return rows;
}
