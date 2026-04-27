// 폴더별 경로 상수
const CM1 = '/products/PLC_CM1';
const IPC = '/products/IPC_IAC';
// PLC_CM3, SCADA, XPANEL 폴더는 이미지 준비 시 여기에 경로 추가

// ── CM1: 파일명 정확 일치 ────────────────────────────────────
const CM1_EXACT = new Set([
  'CM0-DM', 'CM0-SCB15I', 'CM0-TB32M',
  'CM1-AD04W', 'CM1-AD16VI', 'CM1-BN01A',
  'CM1-DA08V', 'CM1-DC10A', 'CM1-EC10A', 'CM1-EC10OPC',
  'CM1-EP02F', 'CM1-HS02E', 'CM1-LG02G',
  'CM1-PS02A', 'CM1-PS08N', 'CM1-RC10A',
  'CM1-RD04A', 'CM1-RPW', 'CM1-SC01DNP', 'CM1-SC02A',
  'CM1-SC02D', 'CM1-SPC', 'CM1-TC04A', 'CM1-TH08A',
  'CM1-WG02C', 'CM1-XD32E', 'CM1-XP1F', 'CM1-XP1R', 'CM1-XP1S',
  'CM1-XY16E', 'CM1-YT16E',
]);

// ── CM1: n 패턴 매핑 (n = 숫자 1자 이상) ────────────────────
const CM1_PATTERNS: { regex: RegExp; file: string }[] = [
  { regex: /^CM1-BS0\d+A$/, file: 'CM1-BS0nA' },
  { regex: /^CM1-CP\d+F$/,  file: 'CM1-CPnF'  },
  { regex: /^CM1-UP\d+F$/,  file: 'CM1-UPnF'  },
  { regex: /^CM1-XP\d+E$/,  file: 'CM1-XPnE'  },
];

// ── CM1: subType 기반 폴백 ────────────────────────────────────
const CM1_SUBTYPE: Record<string, string> = {
  CM1_CPU_XP:      `${CM1}/CM1-XP1F.jpg`,
  CM1_CPU_CP:      `${CM1}/CM1-CPnF.jpg`,
  CM1_CPU_XP_RED:  `${CM1}/CM1-XP1S.jpg`,
  CM1_PWR:         `${CM1}/CM1-SPC.jpg`,
  CM1_BASE:        `${CM1}/CM1-BS0nA.jpg`,
  CM1_RED_BASE:    `${CM1}/CM1-BS0nA.jpg`,
  CM1_RED_PWR:     `${CM1}/CM1-RPW.jpg`,
  CM1_DI:          `${CM1}/CM1-XD32E.jpg`,
  CM1_DO:          `${CM1}/CM1-YT16E.jpg`,
  CM1_DIO:         `${CM1}/CM1-XY16E.jpg`,
  CM1_AI:          `${CM1}/CM1-AD16VI.jpg`,
  CM1_AO:          `${CM1}/CM1-DA08V.jpg`,
  CM1_TEMP_RTD:    `${CM1}/CM1-RD04A.jpg`,
  CM1_TEMP_TC:     `${CM1}/CM1-TC04A.jpg`,
  CM1_TEMP_TH:     `${CM1}/CM1-TH08A.jpg`,
  CM1_SP_HSC:      `${CM1}/CM1-HS02E.jpg`,
  CM1_SP_LC:       `${CM1}/CM1-WG02C.jpg`,
  CM1_SP_DL:       `${CM1}/CM1-LG02G.jpg`,
  CM1_SP_POS:      `${CM1}/CM1-PS02A.jpg`,
  CM1_COMM_SERIAL: `${CM1}/CM1-SC02A.jpg`,
  CM1_COMM_ETH:    `${CM1}/CM1-EC10A.jpg`,
  CM1_COMM_OPC:    `${CM1}/CM1-EC10OPC.jpg`,
  CM1_COMM_DNP:    `${CM1}/CM1-SC01DNP.jpg`,
  CM1_COMM_BAC:    `${CM1}/CM1-BN01A.jpg`,
  CM1_COMM_CDMA:   `${CM1}/CM1-SC02A.jpg`,
  CM1_COMM_CNET:   `${CM1}/CM1-SC02A.jpg`,
  CM1_COMM_ECAT:   `${CM1}/CM1-EC10A.jpg`,
  CM1_RED_COMM:    `${CM1}/CM1-RC10A.jpg`,
  CM1_RED_MMI:     `${CM1}/CM1-RC10A.jpg`,
  CM1_RED_EXT:     `${CM1}/CM1-RPW.jpg`,
  CM1_ACC:         `${CM1}/CM0-TB32M.jpg`,
};

// ── IPC: 제품 ID → 이미지 파일 직접 매핑 ────────────────────
const IPC_MAP: Record<string, string> = {
  // iNT 500 Series (소형 패널 PC)
  'iNT510':    `${IPC}/500 Series.jpg`,
  'iNT512':    `${IPC}/500 Series.jpg`,
  'iNT515':    `${IPC}/500 Series.jpg`,
  'iNT519':    `${IPC}/500 Series.jpg`,
  // NT 3000 / 5000 Series
  'NT3612':    `${IPC}/3000_5000 Series.jpg`,
  'NT3615':    `${IPC}/3000_5000 Series.jpg`,
  'NT5615':    `${IPC}/3000_5000 Series.jpg`,
  'iNT5619':   `${IPC}/3000_5000 Series.jpg`,
  // iNT 5xxW / 7xxW Wide Series
  'iNT51115W': `${IPC}/50000W_70000W Series.jpg`,
  'iNT51121W': `${IPC}/50000W_70000W Series.jpg`,
  'iNT71115W': `${IPC}/50000W_70000W Series.jpg`,
  'iNT71121W': `${IPC}/50000W_70000W Series.jpg`,
  // 터치 모니터
  'CM-IM12W':  `${IPC}/CM-IM Series.jpg`,
  'CM-IM15W':  `${IPC}/CM-IM Series.jpg`,
  'CM-IM21W':  `${IPC}/CM-IM Series.jpg`,
  // BOX PC
  'CM-NB200-D':  `${IPC}/CM-NB200-D.jpg`,
  'CM-NB5011-D': `${IPC}/CM-NB5000_7000 Series.jpg`,
  'CM-NB7011-D': `${IPC}/CM-NB5000_7000 Series.jpg`,
  // RACK PC — 이미지 미준비, 추가 시 여기에 매핑
};

// ── 메인 해석 함수 ────────────────────────────────────────────
export function resolveProductImage(productId: string, subType: string): string | null {
  // 1. IPC 직접 매핑
  if (productId in IPC_MAP) return IPC_MAP[productId];

  // 2. CM1 정확 일치
  if (CM1_EXACT.has(productId)) return `${CM1}/${productId}.jpg`;

  // 3. CM1 n 패턴 매핑
  for (const { regex, file } of CM1_PATTERNS) {
    if (regex.test(productId)) return `${CM1}/${file}.jpg`;
  }

  // 4. CM1 subType 폴백
  if (subType in CM1_SUBTYPE) return CM1_SUBTYPE[subType];

  // 5. 이미지 없음 → 플레이스홀더
  return null;
}
