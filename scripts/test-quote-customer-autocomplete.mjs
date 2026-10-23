import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const helperPath = join(root, 'src', 'utils', 'customerAutocomplete.ts');
const componentPath = join(root, 'src', 'components', 'QuoteFormPage.tsx');
const helperSource = readFileSync(helperPath, 'utf8');
const componentSource = readFileSync(componentPath, 'utf8');
const helperJs = ts.transpileModule(helperSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const helperUrl = `data:text/javascript;base64,${Buffer.from(helperJs).toString('base64')}`;
const { resolveCustomerAutocomplete } = await import(helperUrl);

const original = {
  id: 'ledger-row-1',
  company: '(주)한빛테크',
  contact: '홍길동',
  phone: '010-1234-5678',
  email: 'hong@example.com',
  quoteNumber: 'TEST 2610-001',
};
const emptyInfo = { company: '', contact: '', phone: '', email: '' };

// 포커스만 빠진 입력은 조회·자동 적용하지 않는다.
assert.deepEqual(
  resolveCustomerAutocomplete([original], 'contact', original.contact, original, new Set(['company'])),
  { mode: 'none', matches: [] },
  '수정하지 않은 고객명 blur는 업체명을 포함한 기존 입력을 건드리면 안 됩니다.',
);

// 알려진 고객의 부분 문자열은 선택 후보로만 보여 주며 원문을 자동으로 바꾸지 않는다.
const partial = resolveCustomerAutocomplete(
  [original],
  'company',
  '한빛테크',
  { ...emptyInfo, company: '한빛테크' },
  new Set(['company']),
);
assert.equal(partial.mode, 'select', '부분 일치는 자동 적용하지 않아야 합니다.');
assert.equal(partial.matches[0].company, original.company);

// 한 건의 정확한 일치이고 나머지 칸이 모두 비어 있을 때만 빈 정보가 자동 완성된다.
const exact = resolveCustomerAutocomplete(
  [original],
  'company',
  original.company,
  { ...emptyInfo, company: original.company },
  new Set(['company']),
);
assert.equal(exact.mode, 'autofill');
assert.deepEqual(exact.values, {
  contact: original.contact,
  phone: original.phone,
  email: original.email,
});
assert.equal(Object.hasOwn(exact.values, 'company'), false, '사용자가 입력한 업체명은 자동완성 결과로 덮지 않아야 합니다.');

// 이미 입력되었거나 직접 수정한 다른 고객 정보가 있으면 후보를 명시적으로 선택하게 한다.
const changedCompanyWithExistingInfo = resolveCustomerAutocomplete(
  [original],
  'company',
  original.company,
  { ...original },
  new Set(['company']),
);
assert.equal(changedCompanyWithExistingInfo.mode, 'select');

const changedPhone = resolveCustomerAutocomplete(
  [original],
  'company',
  original.company,
  { ...emptyInfo, company: original.company, phone: '010-9999-9999' },
  new Set(['company', 'phone']),
);
assert.equal(changedPhone.mode, 'select', '직접 수정한 연락처를 자동으로 덮으면 안 됩니다.');

// 같은 고객의 중복 대장 행은 한 건으로 합쳐 자동완성할 수 있다.
const duplicate = {
  ...original,
  id: 'ledger-row-2',
  phone: '010 1234 5678',
  email: 'HONG@example.com',
  quoteNumber: 'TEST 2610-002',
};
const deduplicated = resolveCustomerAutocomplete(
  [original, duplicate],
  'company',
  original.company,
  { ...emptyInfo, company: original.company },
  new Set(['company']),
);
assert.equal(deduplicated.mode, 'autofill', '동일 고객의 중복 이력은 후보를 여러 건으로 세지 않아야 합니다.');

const multiple = resolveCustomerAutocomplete(
  [original, { ...original, id: 'ledger-row-3', contact: '김철수', email: 'kim@example.com' }],
  'company',
  original.company,
  { ...emptyInfo, company: original.company },
  new Set(['company']),
);
assert.equal(multiple.mode, 'select', '같은 업체명의 서로 다른 고객 정보는 선택해야 합니다.');
assert.equal(multiple.matches.length, 2);

const noMatch = resolveCustomerAutocomplete(
  [original],
  'company',
  '새로운업체',
  { ...emptyInfo, company: '새로운업체' },
  new Set(['company']),
);
assert.equal(noMatch.mode, 'none');

// 폼 이벤트가 dirty 추적/선택 로직을 사용하고, 저장 payload가 현재 견적 업체명을 보낸다.
assert.match(componentSource, /editedCustomerFieldsRef = useRef<Set<CustomerField>>\(new Set\(\)\)/);
assert.match(componentSource, /editedCustomerFieldsRef\.current\.add\(field\)/);
assert.match(componentSource, /resolveCustomerAutocomplete\(/);
assert.match(componentSource, /setCustomerPicker\(\{ field, matches: decision\.matches \}\)/);
assert.match(componentSource, /onChange=\{\(e\) => handleCustomerInputChange\('company', e\.target\.value\)\}/);
assert.match(componentSource, /onChange=\{\(e\) => handleCustomerInputChange\('contact', e\.target\.value\)\}/);
assert.match(componentSource, /onChange=\{\(e\) => handleCustomerInputChange\('phone', e\.target\.value\)\}/);
assert.match(componentSource, /onChange=\{\(e\) => handleCustomerInputChange\('email', e\.target\.value\)\}/);
assert.match(componentSource, /client: \{ company, contact, phone, email \}/);
assert.match(componentSource, /clientName: quote\.client\.company/);

console.log('✅ 고객 자동완성의 부분일치/수정값 보호/명시적 선택 회귀 테스트 통과');
