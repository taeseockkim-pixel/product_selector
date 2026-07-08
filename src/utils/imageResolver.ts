// 폴더별 경로 상수
const CM1    = '/products/PLC_CM1';
const CM3    = '/products/PLC_CM3';
const IPC    = '/products/IPC_IAC';
const SCADA  = '/products/SCADA';
const XPANEL = '/products/XPANEL';

// ── CM3: 제품 ID → 이미지 파일 직접 매핑 ────────────────────
const CM3_MAP: Record<string, string> = {
  // CPU SLIM (TR Sink 16pts)
  'CM3-SP32MDT':   `${CM3}/CM3-SP32MDT.jpg`,
  'CM3-SP32MDTV':  `${CM3}/CM3-SP32MDTV.jpg`,
  'CM3-SP32MDTE':  `${CM3}/CM3-SP32MDTE.jpg`,
  'CM3-SP32MDTF':  `${CM3}/CM3-SP32MDTF.jpg`,
  // CPU SLIM (TR Source 16pts)
  'CM3-SP32MDC':   `${CM3}/CM3-SP32MDC.jpg`,
  'CM3-SP32MDCV':  `${CM3}/CM3-SP32MDCV.jpg`,
  'CM3-SP32MDCE':  `${CM3}/CM3-SP32MDCE.jpg`,
  'CM3-SP32MDCF':  `${CM3}/CM3-SP32MDCF.jpg`,
  // CPU SLIM (Relay 8pts)
  'CM3-SP16MDR':   `${CM3}/CM3-SP16MDR.jpg`,
  'CM3-SP16MDRV':  `${CM3}/CM3-SP16MDRV.jpg`,
  'CM3-SP16MDRE':  `${CM3}/CM3-SP16MDRE.jpg`,
  'CM3-SP16MDRF':  `${CM3}/CM3-SP16MDRF.jpg`,
  // CPU SLIM (TR Sink 8pts)
  'CM3-SP16MDTV':  `${CM3}/CM3-SP16MDTV.jpg`,
  'CM3-SP16MDTF':  `${CM3}/CM3-SP16MDTF.jpg`,
  // CPU SLIM (TR Source 8pts)
  'CM3-SP16MDCV':  `${CM3}/CM3-SP16MDCV.jpg`,
  'CM3-SP16MDCF':  `${CM3}/CM3-SP16MDCF.jpg`,
  // CPU BRICK (공통 시리즈 이미지 사용)
  'CM3-SB32MDTF':  `${CM3}/CM3-SB32_Series.jpg`,
  'CM3-SB32MDCF':  `${CM3}/CM3-SB32_Series.jpg`,
  'CM3-SB32MDRF':  `${CM3}/CM3-SB32_Series.jpg`,
  'CM3-SB16MDTF':  `${CM3}/CM3-SB16_Series.jpg`,
  'CM3-SB16MDCF':  `${CM3}/CM3-SB16_Series.jpg`,
  // CPU SPLUS
  'CM3-SP32PDTF':  `${CM3}/CM3-SP32PDTF.jpg`,
  'CM3-SP32PDCF':  `${CM3}/CM3-SP32PDCF.jpg`,
  'CM3-SP16PDRF':  `${CM3}/CM3-SP16PDRF.jpg`,
  // 디지털 I/O 모듈
  'CM3-SP32EDO':   `${CM3}/CM3-SP32EDO.jpg`,
  'CM3-SP32EOT':   `${CM3}/CM3-SP32EOT.jpg`,
  'CM3-SP32EOC':   `${CM3}/CM3-SP32EOC.jpg`,
  'CM3-SP32EDT':   `${CM3}/CM3-SP32EDT.jpg`,
  'CM3-SP32EDOP':  `${CM3}/CM3-SP32EDOP.jpg`,
  'CM3-SP32EOTP':  `${CM3}/CM3-SP32EOTP.jpg`,
  'CM3-SP32EOCP':  `${CM3}/CM3-SP32EOCP.jpg`,
  'CM3-SP32EDTP':  `${CM3}/CM3-SP32EDTP.jpg`,
  'CM3-SP32EDCP':  `${CM3}/CM3-SP32EDCP.jpg`,
  'CM3-SP16EOR':   `${CM3}/CM3-SP16EOR.jpg`,
  'CM3-SP16EDR':   `${CM3}/CM3-SP16EDR.jpg`,
  // 특수 출력
  'CM3-SP32PWM':   `${CM3}/CM3-SP32PWM.jpg`,
  // 전원 모듈
  'CM3-SP24PWR':   `${CM3}/CM3-SP24PWR.jpg`,
  // 아날로그 모듈
  'CM3-SP04EAO':   `${CM3}/CM3-SP04EAO.jpg`,
  'CM3-SP08EAO':   `${CM3}/CM3-SP08EAO.jpg`,
  'CM3-SP04EOAI':  `${CM3}/CM3-SP04EOAI.jpg`,
  'CM3-SP04EOAV':  `${CM3}/CM3-SP04EOAV.jpg`,
  'CM3-SP04EAA':   `${CM3}/CM3-SP04EAA.jpg`,
  'CM3-SP04EAA-E': `${CM3}/CM3-SP04EAA-E.jpg`,
  'CM3-SP04EAM':   `${CM3}/CM3-SP04EAM.jpg`,
  // 온도 모듈
  'CM3-SP04ERO':   `${CM3}/CM3-SP04ERO.jpg`,
  'CM3-SP04ETO':   `${CM3}/CM3-SP04ETO.jpg`,
  // 통신 모듈
  'CM3-SP01EET':   `${CM3}/CM3-SP01EET.jpg`,
  'CM3-SP02ERS':   `${CM3}/CM3-SP02ERS.jpg`,
  'CM3-SP02ERR':   `${CM3}/CM3-SP02ERR.jpg`,
  'CM3-SP02ERRC':  `${CM3}/CM3-SP02ERRC.jpg`,
  'CM3-SP02ERSC':  `${CM3}/CM3-SP02ERSC.jpg`,
  'CM3-SP01OPC':   `${CM3}/CM3-SP01OPC.jpg`,
  // 특수 모듈
  'CM3-SP02HSC':   `${CM3}/CM3-SP02HSC.jpg`,
  'CM3-SP02HSD':   `${CM3}/CM3-SP02HSD.jpg`,
  'CM3-SP02POS':   `${CM3}/CM3-SP02POS.jpg`,
};

// ── CM1: 파일명 정확 일치 ────────────────────────────────────
const CM1_EXACT = new Set([
  'CM0-DM', 'CM0-SCB15I', 'CM0-TB32M',
  'CM1-AD04W', 'CM1-AD16VI', 'CM1-BN01A',
  'CM1-DA08V', 'CM1-DC10A', 'CM1-EC01G', 'CM1-EC10A', 'CM1-EC10OPC',
  'CM1-EP02F', 'CM1-EP03A', 'CM1-HS02E', 'CM1-LG02G',
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
  CM1_EXT_MOD:     `${CM1}/CM1-EP03A.jpg`,
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
  'CM-NB5011-D': `${IPC}/CM-NB5000_7000 Series.jpg`,
  'CM-NB7011-D': `${IPC}/CM-NB5000_7000 Series.jpg`,
  // RACK PC
  'NU1RB-A':  `${IPC}/NU1R.jpg`,
  'NU4R56-A': `${IPC}/NU4R.jpg`,
  'NU4R76-A': `${IPC}/NU4R.jpg`,
};

// ── SCADA: subType → 이미지 ──────────────────────────────────
const SCADA_MAP: Record<string, string> = {
  SCADA_STD: `${SCADA}/SCADA.jpg`,
  SCADA_PRO: `${SCADA}/SCADA_PRO.jpg`,
};

// ── XPANEL: 제품 ID 패턴 → 이미지 ───────────────────────────
const XPANEL_PATTERNS: { regex: RegExp; file: string }[] = [
  { regex: /^(XT|iXT)/,    file: `${XPANEL}/XT_IXT Series.jpg` },
  { regex: /^CM-eXT/,      file: `${XPANEL}/eXT Series.jpg`    },
  { regex: /^CM-sHP/,      file: `${XPANEL}/Hybrid.jpg`        },
];

// ── 메인 해석 함수 ────────────────────────────────────────────
export function resolveProductImage(productId: string, subType: string): string | null {
  // 1. CM3 직접 매핑
  if (productId in CM3_MAP) return CM3_MAP[productId];

  // 2. IPC 직접 매핑
  if (productId in IPC_MAP) return IPC_MAP[productId];

  // 3. SCADA subType 매핑
  if (subType in SCADA_MAP) return SCADA_MAP[subType];

  // 4. XPANEL ID 패턴 매핑
  for (const { regex, file } of XPANEL_PATTERNS) {
    if (regex.test(productId)) return file;
  }

  // 5. CM1 정확 일치
  if (CM1_EXACT.has(productId)) return `${CM1}/${productId}.jpg`;

  // 6. CM1 n 패턴 매핑
  for (const { regex, file } of CM1_PATTERNS) {
    if (regex.test(productId)) return `${CM1}/${file}.jpg`;
  }

  // 7. CM1 subType 폴백
  if (subType in CM1_SUBTYPE) return CM1_SUBTYPE[subType];

  // 8. 이미지 없음
  return null;
}
