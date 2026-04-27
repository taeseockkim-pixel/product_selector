// fix-plc-scada-specs.mjs — CM1/CM3/SCADA 카탈로그 기준 사양 교정
// 카탈로그 확인 기준:
//   CM1-PLC.pdf : 동작 온도 -10~65°C, 보존 온도 -25~80°C
//   CM3-PLCS.pdf: 동작 온도 -10~65°C (SLIM/BRICK), -20~70°C (SPLUS), 보존 온도 -25~80°C
//                 SLIM/BRICK은 ST 미지원, SPLUS는 ST 지원
//   SCADA.pdf   : 기능 스펙 확인
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dir, '../src/data/products.json');
const products = JSON.parse(readFileSync(filePath, 'utf8'));

let changed = 0;

// ── 헬퍼: 특정 label의 spec을 찾아 값/source 수정 ──────────────
function fixSpec(specs, label, newValue, newSource) {
  const s = specs.find(x => x.label === label);
  if (!s) return false;
  let dirty = false;
  if (newValue !== null && s.value !== newValue) { s.value = newValue; dirty = true; }
  if (s.source !== newSource) { s.source = newSource; dirty = true; }
  return dirty;
}

// ── 헬퍼: spec 제거 ──────────────────────────────────────────────
function removeSpec(specs, label) {
  const idx = specs.findIndex(x => x.label === label);
  if (idx === -1) return false;
  specs.splice(idx, 1);
  return true;
}

// ──────────────────────────────────────────────────────────────────
// 1. CM1 — 공통 환경 사양 교정 (모든 CM1 모듈)
// ──────────────────────────────────────────────────────────────────
const CM1_ENV = [
  { label: '동작 온도', value: '-10~65°C' },
  { label: '보존 온도', value: '-25~80°C' },
  { label: '상대 습도', value: null },  // 값 유지, source만 변경
  { label: '보호 등급', value: null },  // 값 유지, source만 변경
];

const CM1_CPU_COMMON = [
  { label: '연산 방식', value: null },
  { label: '내장 시리얼', value: null },
];

for (const p of products) {
  if (p.category !== 'PLC' || p.plcSeries !== 'CM1') continue;
  let dirty = false;

  // 환경 사양
  for (const { label, value } of CM1_ENV) {
    if (fixSpec(p.specs, label, value, 'catalog')) dirty = true;
  }

  // CPU 모듈 공통
  if (['CM1_CPU_UP','CM1_CPU_XP','CM1_CPU_XP_RED','CM1_CPU_CP'].includes(p.subType)) {
    for (const { label, value } of CM1_CPU_COMMON) {
      if (fixSpec(p.specs, label, value, 'catalog')) dirty = true;
    }

    // 프로그램 언어
    const langSpec = p.specs.find(x => x.label === '프로그램 언어');
    if (langSpec) {
      if (p.subType === 'CM1_CPU_UP') {
        // UP Series: ST 지원 (값 그대로, source만 catalog)
        if (langSpec.source !== 'catalog') { langSpec.source = 'catalog'; dirty = true; }
      } else {
        // XP / CP Series: ST 미지원
        const noST = 'LD, IL, SFC, FBD (IEC 61131-3)';
        if (langSpec.value !== noST || langSpec.source !== 'catalog') {
          langSpec.value = noST;
          langSpec.source = 'catalog';
          dirty = true;
        }
      }
    }
  }

  if (dirty) changed++;
}

console.log(`[CM1] ${changed}개 제품 교정`);

// ──────────────────────────────────────────────────────────────────
// 2. CM3 — CPU 사양 + 환경 사양 교정
// ──────────────────────────────────────────────────────────────────
const cm3Changed = { slim: 0, brick: 0, splus: 0, other: 0 };

for (const p of products) {
  if (p.category !== 'PLC' || p.plcSeries !== 'CM3') continue;
  let dirty = false;

  if (p.subType === 'CM3_CPU_SLIM') {
    // 프로그램 언어: ST 제거
    if (fixSpec(p.specs, '프로그램 언어', 'LD, IL, SFC, FBD (IEC 61131-3)', 'catalog')) dirty = true;
    // 전원 전압
    if (fixSpec(p.specs, '전원 전압', 'DC 12V ~ 24V', 'catalog')) dirty = true;
    // 환경 사양
    if (fixSpec(p.specs, '동작 온도', '-10~65°C', 'catalog')) dirty = true;
    if (fixSpec(p.specs, '보존 온도', '-25~80°C', 'catalog')) dirty = true;
    if (fixSpec(p.specs, '상대 습도', null, 'catalog')) dirty = true;
    if (fixSpec(p.specs, '보호 등급', null, 'catalog')) dirty = true;
    if (fixSpec(p.specs, '타이머/카운터', null, 'catalog')) dirty = true;
    if (dirty) cm3Changed.slim++;

  } else if (p.subType === 'CM3_CPU_BRICK') {
    // 프로그램 언어: ST 제거
    if (fixSpec(p.specs, '프로그램 언어', 'LD, IL, SFC, FBD (IEC 61131-3)', 'catalog')) dirty = true;
    // 전원 전압: SB32 계열 → DC 20V ~ 24V, SB16 계열 → DC 12V ~ 24V
    const isSB32 = p.id.startsWith('CM3-SB32');
    const pwrVal = isSB32 ? 'DC 20V ~ 24V' : 'DC 12V ~ 24V';
    if (fixSpec(p.specs, '전원 전압', pwrVal, 'catalog')) dirty = true;
    // 환경 사양
    if (fixSpec(p.specs, '동작 온도', '-10~65°C', 'catalog')) dirty = true;
    if (fixSpec(p.specs, '보존 온도', '-25~80°C', 'catalog')) dirty = true;
    if (fixSpec(p.specs, '상대 습도', null, 'catalog')) dirty = true;
    if (fixSpec(p.specs, '보호 등급', null, 'catalog')) dirty = true;
    if (fixSpec(p.specs, '타이머/카운터', null, 'catalog')) dirty = true;
    if (dirty) cm3Changed.brick++;

  } else if (p.subType === 'CM3_CPU_SPLUS') {
    // 프로그램 언어: ST 포함 OK, source만 catalog
    if (fixSpec(p.specs, '프로그램 언어', null, 'catalog')) dirty = true;
    // 전원 전압
    if (fixSpec(p.specs, '전원 전압', 'DC 12V ~ 24V', 'catalog')) dirty = true;
    // 환경 사양: SPLUS는 -20~70°C
    if (fixSpec(p.specs, '동작 온도', '-20~70°C', 'catalog')) dirty = true;
    if (fixSpec(p.specs, '보존 온도', '-25~80°C', 'catalog')) dirty = true;
    if (fixSpec(p.specs, '보호 등급', null, 'catalog')) dirty = true;
    if (fixSpec(p.specs, '타이머/카운터', null, 'catalog')) dirty = true;
    if (dirty) cm3Changed.splus++;
  }
}

console.log(`[CM3] SLIM: ${cm3Changed.slim}, BRICK: ${cm3Changed.brick}, SPLUS: ${cm3Changed.splus}개 제품 교정`);

// ──────────────────────────────────────────────────────────────────
// 3. SCADA — estimated → catalog, PRO 스크립트 수정
// ──────────────────────────────────────────────────────────────────
const SCADA_COMMON_LABELS = [
  '지원 OS', '지원 드라이버', '트렌드', '알람', '레포트',
  '통신 프로토콜', '데이터베이스', '분산 시스템', '이중화',
];

let scadaChanged = 0;
for (const p of products) {
  if (p.category !== 'SCADA') continue;
  let dirty = false;

  for (const label of SCADA_COMMON_LABELS) {
    if (fixSpec(p.specs, label, null, 'catalog')) dirty = true;
  }

  if (p.subType === 'SCADA_PRO') {
    // PRO: 웹 모니터링 estimated 제거 (HTML5 Web catalog가 이미 있음)
    if (removeSpec(p.specs, '웹 모니터링')) dirty = true;
    // PRO: 스크립트 → VBScript / Python
    if (fixSpec(p.specs, '스크립트', 'VBScript / Python', 'catalog')) dirty = true;
  } else {
    // STD: 스크립트 source만 catalog
    if (fixSpec(p.specs, '스크립트', null, 'catalog')) dirty = true;
  }

  if (dirty) scadaChanged++;
}

console.log(`[SCADA] ${scadaChanged}개 제품 교정`);

// ──────────────────────────────────────────────────────────────────
writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');

const totalChanged = changed + Object.values(cm3Changed).reduce((a, b) => a + b, 0) + scadaChanged;
console.log(`\n완료: 총 ${totalChanged}개 제품 교정`);
