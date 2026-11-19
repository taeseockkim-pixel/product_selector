export interface CustomerInfo {
  company: string;
  contact: string;
  phone: string;
  email: string;
}

export interface CustomerRecord extends CustomerInfo {
  id: string;
  quoteNumber?: string;
}

export type CustomerField = keyof CustomerInfo;

export interface CustomerAutocompleteDecision {
  mode: 'none' | 'autofill' | 'select' | 'suggest';
  matches: CustomerRecord[];
  values?: Partial<CustomerInfo>;
}

const CUSTOMER_FIELDS: CustomerField[] = ['company', 'contact', 'phone', 'email'];

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase('ko-KR');
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .toLocaleLowerCase('ko-KR');
}

function differsByAtMostOneCharacter(left: string, right: string) {
  if (Math.abs(left.length - right.length) > 1) return false;

  let leftIndex = 0;
  let rightIndex = 0;
  let differences = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex++;
      rightIndex++;
      continue;
    }

    if (++differences > 1) return false;
    if (left.length > right.length) leftIndex++;
    else if (right.length > left.length) rightIndex++;
    else {
      leftIndex++;
      rightIndex++;
    }
  }

  if (leftIndex < left.length || rightIndex < right.length) differences++;
  return differences <= 1;
}

export function customerRecordDedupKey(record: CustomerInfo) {
  return [
    normalizeText(record.company),
    normalizeText(record.contact),
    record.phone.replace(/[^\d]/g, ''),
    normalizeText(record.email),
  ].join('|');
}

/**
 * 자동완성은 실제로 편집한 입력칸에서만 실행한다.
 * 정확히 한 건이 일치하고 나머지 입력란이 모두 비어 있을 때만 빈 칸을 보완하며,
 * 부분 일치/복수 후보/이미 입력된 정보가 있으면 명시적 선택을 요구한다.
 */
export function resolveCustomerAutocomplete(
  records: CustomerRecord[],
  field: CustomerField,
  value: string,
  current: CustomerInfo,
  editedFields: ReadonlySet<CustomerField>,
): CustomerAutocompleteDecision {
  const query = normalizeSearchText(value);
  if (!query || !editedFields.has(field)) return { mode: 'none', matches: [] };

  const seen = new Set<string>();
  const matches: CustomerRecord[] = [];
  for (const record of records) {
    if (!normalizeSearchText(record[field]).includes(query)) continue;
    const key = customerRecordDedupKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push(record);
  }

  if (matches.length === 0) {
    // 회사명 4자 이상에서 한 글자 오타 후보만 제안한다. 유사 후보는 자동 적용하지 않는다.
    if (field === 'company' && query.length >= 4) {
      const similarSeen = new Set<string>();
      const similarMatches = records.filter((record) => {
        if (!differsByAtMostOneCharacter(query, normalizeSearchText(record.company))) return false;
        const key = customerRecordDedupKey(record);
        if (similarSeen.has(key)) return false;
        similarSeen.add(key);
        return true;
      });
      if (similarMatches.length > 0) return { mode: 'suggest', matches: similarMatches.slice(0, 8) };
    }
    return { mode: 'none', matches };
  }

  const exactMatches = matches.filter((record) => normalizeSearchText(record[field]) === query);
  const relatedFieldsAreBlankAndUntouched = CUSTOMER_FIELDS
    .filter((candidate) => candidate !== field)
    .every((candidate) => !current[candidate].trim() && !editedFields.has(candidate));

  if (matches.length === 1 && exactMatches.length === 1 && relatedFieldsAreBlankAndUntouched) {
    const record = exactMatches[0];
    const values: Partial<CustomerInfo> = {};
    for (const candidate of CUSTOMER_FIELDS) {
      if (candidate !== field) values[candidate] = record[candidate];
    }
    return { mode: 'autofill', matches: exactMatches, values };
  }

  return { mode: 'select', matches };
}
