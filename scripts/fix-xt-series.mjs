// fix-xt-series.mjs — XT Series 카탈로그 기준 사양 교정
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dir, '../src/data/products.json');
const products = JSON.parse(readFileSync(filePath, 'utf8'));

// ── 카탈로그 확인 사양 (XT Series 공통 베이스) ────────────────
const BASE_07 = [
  { label: '화면 크기',        value: '7" Color TFT',              source: 'catalog' },
  { label: '해상도',           value: '800 × 480',                 source: 'catalog' },
  { label: '색상',             value: '65K Colors',                source: 'catalog' },
  { label: '휘도',             value: '550 cd/m²',                 source: 'catalog' },
  { label: '백라이트 수명',     value: '50,000시간',                source: 'catalog' },
  { label: '메모리',           value: '128MB DDR2 SDRAM',          source: 'catalog' },
  { label: '저장장치',         value: '128MB SLC NAND Flash',      source: 'catalog' },
  { label: 'OS',               value: 'Windows CE 6.0',            source: 'catalog' },
  { label: '이더넷',           value: '없음',                      source: 'catalog' },
  { label: '시리얼 (COM1)',     value: 'RS232C',                    source: 'catalog' },
  { label: '시리얼 (COM2)',     value: 'RS422/485',                 source: 'catalog' },
  { label: '시리얼 (COM3)',     value: '없음',                      source: 'catalog' },
  { label: 'USB Host',         value: '1포트',                     source: 'catalog' },
  { label: 'Tool Port',        value: '1포트',                     source: 'catalog' },
  { label: 'SD Card',          value: '없음',                      source: 'catalog' },
  { label: '소비전력',         value: '6W',                        source: 'catalog' },
  { label: '외형 치수 (mm)',    value: '185 × 127 × 54',           source: 'catalog' },
  { label: '패널 컷 (mm)',      value: '177 × 119',                source: 'catalog' },
  { label: '재질',             value: 'PLASTIC',                   source: 'catalog' },
  { label: '인증',             value: 'FCC, UL, CE, KC',           source: 'catalog' },
];

const BASE_10 = [
  { label: '화면 크기',        value: '10.4" Color TFT',           source: 'catalog' },
  { label: '해상도',           value: '800 × 600',                 source: 'catalog' },
  { label: '색상',             value: '262K Colors',               source: 'catalog' },
  { label: '휘도',             value: '400 cd/m²',                 source: 'catalog' },
  { label: '백라이트 수명',     value: '50,000시간',                source: 'catalog' },
  { label: '메모리',           value: '512MB DDR2 SDRAM',          source: 'catalog' },
  { label: '저장장치',         value: '128MB SLC NAND Flash',      source: 'catalog' },
  { label: 'OS',               value: 'Windows Embedded Compact 7 (WEC7)', source: 'catalog' },
  { label: '이더넷',           value: '10/100 BaseT',              source: 'catalog' },
  { label: '시리얼 (COM1)',     value: 'RS422/485',                 source: 'catalog' },
  { label: '시리얼 (COM2)',     value: 'RS232C',                    source: 'catalog' },
  { label: '시리얼 (COM3)',     value: 'RS232C',                    source: 'catalog' },
  { label: 'USB Host',         value: '1포트',                     source: 'catalog' },
  { label: 'Tool Port',        value: '1포트',                     source: 'catalog' },
  { label: 'SD Card',          value: '1슬롯',                     source: 'catalog' },
  { label: '소비전력',         value: '9W',                        source: 'catalog' },
  { label: '외형 치수 (mm)',    value: '280 × 220 × 47',           source: 'catalog' },
  { label: '패널 컷 (mm)',      value: '267 × 207',                source: 'catalog' },
  { label: '재질',             value: 'PLASTIC',                   source: 'catalog' },
];

// ── 제품별 교정 데이터 ────────────────────────────────────────
const FIXES = {
  'XT07CD-DN': {
    xpanelPower: 'DC24V',  // 확인: DC24V 맞음
    specs: [
      ...BASE_07,
      { label: '오디오',   value: '없음',  source: 'catalog' },
      { label: '입력 전원', value: 'DC 24V', source: 'catalog' },
    ],
  },
  'XT07CD-DE': {
    xpanelPower: 'DC24V',  // 수정: AC → DC24V (카탈로그 확인)
    specs: [
      ...BASE_07,
      { label: '오디오',   value: '1포트 (오디오 포트 내장)', source: 'catalog' },
      { label: '입력 전원', value: 'DC 24V', source: 'catalog' },
    ],
  },
  'XT10CD-A': {
    xpanelPower: 'AC',     // 수정: DC24V → AC (카탈로그: AC 100~240V)
    specs: [
      ...BASE_10,
      { label: '오디오',   value: '없음',          source: 'catalog' },
      { label: '입력 전원', value: 'AC 100~240V',  source: 'catalog' },
      { label: '인증',     value: 'FCC, UL, CE, KC, KR', source: 'catalog' },
    ],
  },
  'XT10CD-D': {
    xpanelPower: 'DC24V',  // 확인: DC24V 맞음
    specs: [
      ...BASE_10,
      { label: '오디오',   value: '없음',     source: 'catalog' },
      { label: '입력 전원', value: 'DC 24V', source: 'catalog' },
      { label: '인증',     value: 'FCC, UL, CE, KC', source: 'catalog' },
    ],
  },
};

let fixedCount = 0;
for (const p of products) {
  if (!(p.id in FIXES)) continue;
  const fix = FIXES[p.id];
  const oldPower = p.xpanelPower;
  p.xpanelPower = fix.xpanelPower;
  p.specs = fix.specs;
  console.log(`[${p.id}] 전원: ${oldPower} → ${fix.xpanelPower} | specs: ${fix.specs.length}개 (전부 catalog)`);
  fixedCount++;
}

writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
console.log(`\n완료: ${fixedCount}개 제품 교정`);
