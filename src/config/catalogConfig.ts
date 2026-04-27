// 카탈로그 PDF 파일 경로 매핑 (public/catalogs/ 기준)
// 파일 추가 방법: public/catalogs/{파일명}.pdf 로 업로드 후 아래 경로와 일치 확인
const CM1  = '/catalogs/CM1-PLC.pdf';
const CM3  = '/catalogs/CM3-PLCS.pdf';
const IPC  = '/catalogs/IPC.pdf';
const SCADA_STD = '/catalogs/SCADA.pdf';
const SCADA_PRO = '/catalogs/SCADA-PRO.pdf';
const XPANEL    = '/catalogs/XPANEL.pdf';

const CATALOG_MAP: Record<string, string> = {
  // ── CM1 PLC ──────────────────────────────────────────────
  CM1_CPU_UP: CM1, CM1_CPU_XP: CM1, CM1_CPU_XP_RED: CM1, CM1_CPU_CP: CM1,
  CM1_PWR: CM1, CM1_BASE: CM1,
  CM1_DI: CM1, CM1_DO: CM1, CM1_DIO: CM1,
  CM1_AI: CM1, CM1_AO: CM1,
  CM1_TEMP_RTD: CM1, CM1_TEMP_TC: CM1, CM1_TEMP_TH: CM1,
  CM1_SP_HSC: CM1, CM1_SP_LC: CM1, CM1_SP_DL: CM1, CM1_SP_POS: CM1,
  CM1_COMM_SERIAL: CM1, CM1_COMM_ETH: CM1, CM1_COMM_OPC: CM1,
  CM1_COMM_DNP: CM1, CM1_COMM_BAC: CM1, CM1_COMM_CDMA: CM1,
  CM1_COMM_CNET: CM1, CM1_COMM_ECAT: CM1,
  CM1_RED_COMM: CM1, CM1_RED_MMI: CM1, CM1_RED_EXT: CM1,
  CM1_RED_BASE: CM1, CM1_RED_PWR: CM1, CM1_ACC: CM1,
  // ── CM3 PLC-S ────────────────────────────────────────────
  CM3_CPU_SLIM: CM3, CM3_CPU_BRICK: CM3, CM3_CPU_SPLUS: CM3,
  CM3_DI: CM3, CM3_DO: CM3, CM3_DIO: CM3, CM3_DO_PWM: CM3,
  CM3_AI: CM3, CM3_AO: CM3, CM3_AIO: CM3, CM3_AI_MUX: CM3,
  CM3_TEMP_RTD: CM3, CM3_TEMP_TC: CM3,
  CM3_COMM_ETH: CM3, CM3_COMM_OPC: CM3, CM3_COMM_SERIAL: CM3, CM3_COMM_CDMA: CM3,
  CM3_SP_HSC: CM3, CM3_SP_POS: CM3, CM3_PWR: CM3, CM3_ACC: CM3,
  // ── IPC ──────────────────────────────────────────────────
  PANEL: IPC, MONITOR: IPC, RACK: IPC, BOX: IPC,
  // ── SCADA ────────────────────────────────────────────────
  SCADA_STD: SCADA_STD, SCADA_PRO: SCADA_PRO,
  // ── XPANEL ───────────────────────────────────────────────
  XPANEL_HMI: XPANEL, HYBRID_XP: XPANEL,
};

export function getCatalogUrl(subType: string): string | null {
  return CATALOG_MAP[subType] ?? null;
}
