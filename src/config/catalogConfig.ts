// ── 카탈로그 ─────────────────────────────────────────────────
// 파일 위치: public/catalogs/{파일명}.pdf
const CAT_CM1       = '/catalogs/CM1-PLC.pdf';
const CAT_CM3       = '/catalogs/CM3-PLCS.pdf';
const CAT_IPC       = '/catalogs/IPC.pdf';
const CAT_SCADA_STD = '/catalogs/SCADA.pdf';
const CAT_SCADA_PRO = '/catalogs/SCADA-PRO.pdf';
const CAT_XPANEL    = '/catalogs/XPANEL.pdf';

// ── 메뉴얼 ───────────────────────────────────────────────────
// 파일 위치: public/manuals/{파일명}.pdf
// 파일을 추가한 뒤 아래 주석을 해제하세요.
// const MAN_CM1       = '/manuals/CM1-PLC.pdf';
// const MAN_CM3       = '/manuals/CM3-PLCS.pdf';
// const MAN_IPC       = '/manuals/IPC.pdf';
// const MAN_SCADA_STD = '/manuals/SCADA.pdf';
// const MAN_SCADA_PRO = '/manuals/SCADA-PRO.pdf';
// const MAN_XPANEL    = '/manuals/XPANEL.pdf';

// ── 도면 ─────────────────────────────────────────────────────
// 파일 위치: public/drawings/{파일명}.pdf
// 파일을 추가한 뒤 아래 주석을 해제하세요.
// const DRW_CM1       = '/drawings/CM1-PLC.pdf';
// const DRW_CM3       = '/drawings/CM3-PLCS.pdf';
// const DRW_IPC       = '/drawings/IPC.pdf';
// const DRW_XPANEL    = '/drawings/XPANEL.pdf';

// ── subType → 카탈로그 URL ────────────────────────────────────
const CATALOG_MAP: Record<string, string> = {
  // CM1 PLC
  CM1_CPU_UP: CAT_CM1, CM1_CPU_XP: CAT_CM1, CM1_CPU_XP_RED: CAT_CM1, CM1_CPU_CP: CAT_CM1,
  CM1_PWR: CAT_CM1, CM1_BASE: CAT_CM1,
  CM1_DI: CAT_CM1, CM1_DO: CAT_CM1, CM1_DIO: CAT_CM1,
  CM1_AI: CAT_CM1, CM1_AO: CAT_CM1,
  CM1_TEMP_RTD: CAT_CM1, CM1_TEMP_TC: CAT_CM1, CM1_TEMP_TH: CAT_CM1,
  CM1_SP_HSC: CAT_CM1, CM1_SP_LC: CAT_CM1, CM1_SP_DL: CAT_CM1, CM1_SP_POS: CAT_CM1,
  CM1_COMM_SERIAL: CAT_CM1, CM1_COMM_ETH: CAT_CM1, CM1_COMM_OPC: CAT_CM1,
  CM1_COMM_DNP: CAT_CM1, CM1_COMM_BAC: CAT_CM1, CM1_COMM_CDMA: CAT_CM1,
  CM1_COMM_CNET: CAT_CM1, CM1_COMM_ECAT: CAT_CM1,
  CM1_RED_COMM: CAT_CM1, CM1_RED_MMI: CAT_CM1, CM1_RED_EXT: CAT_CM1,
  CM1_RED_BASE: CAT_CM1, CM1_RED_PWR: CAT_CM1, CM1_ACC: CAT_CM1,
  // CM3 PLC-S
  CM3_CPU_SLIM: CAT_CM3, CM3_CPU_BRICK: CAT_CM3, CM3_CPU_SPLUS: CAT_CM3,
  CM3_DI: CAT_CM3, CM3_DO: CAT_CM3, CM3_DIO: CAT_CM3, CM3_DO_PWM: CAT_CM3,
  CM3_AI: CAT_CM3, CM3_AO: CAT_CM3, CM3_AIO: CAT_CM3, CM3_AI_MUX: CAT_CM3,
  CM3_TEMP_RTD: CAT_CM3, CM3_TEMP_TC: CAT_CM3,
  CM3_COMM_ETH: CAT_CM3, CM3_COMM_OPC: CAT_CM3, CM3_COMM_SERIAL: CAT_CM3, CM3_COMM_CDMA: CAT_CM3,
  CM3_SP_HSC: CAT_CM3, CM3_SP_POS: CAT_CM3, CM3_PWR: CAT_CM3, CM3_ACC: CAT_CM3,
  // IPC
  PANEL: CAT_IPC, MONITOR: CAT_IPC, RACK: CAT_IPC, BOX: CAT_IPC,
  // SCADA
  SCADA_STD: CAT_SCADA_STD, SCADA_PRO: CAT_SCADA_PRO,
  // XPANEL
  XPANEL_HMI: CAT_XPANEL, HYBRID_XP: CAT_XPANEL,
};

// ── subType → 메뉴얼 URL ─────────────────────────────────────
// 파일 추가 후 각 subType에 해당 변수를 할당하세요.
const MANUAL_MAP: Record<string, string> = {
  // CM1 PLC — 예시: CM1_CPU_UP: MAN_CM1,
  // CM3 PLC-S — 예시: CM3_CPU_SLIM: MAN_CM3,
  // IPC        — 예시: PANEL: MAN_IPC,
  // SCADA      — 예시: SCADA_STD: MAN_SCADA_STD,
  // XPANEL     — 예시: XPANEL_HMI: MAN_XPANEL,
};

// ── subType → 도면 URL ───────────────────────────────────────
// 파일 추가 후 각 subType에 해당 변수를 할당하세요.
const DRAWING_MAP: Record<string, string> = {
  // CM1 PLC — 예시: CM1_CPU_UP: DRW_CM1,
  // CM3 PLC-S — 예시: CM3_CPU_SLIM: DRW_CM3,
  // IPC        — 예시: PANEL: DRW_IPC,
  // XPANEL     — 예시: XPANEL_HMI: DRW_XPANEL,
};

export function getCatalogUrl(subType: string): string | null {
  return CATALOG_MAP[subType] ?? null;
}

export function getManualUrl(subType: string): string | null {
  return MANUAL_MAP[subType] ?? null;
}

export function getDrawingUrl(subType: string): string | null {
  return DRAWING_MAP[subType] ?? null;
}
