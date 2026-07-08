import type { DocEntry } from './catalogConfig';

const CE  = '/certification/CE';
const KC  = '/certification/KC';
const FCC = '/certification/FCC';
const UL  = '/certification/UL';

const CERT_MAP: Record<string, DocEntry[]> = {

  // ── CM1 PLC ─────────────────────────────────────────────────
  CM1_CPU_UP: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-UP1F, CM1-UP3F, CM1-UP2F, SH-WMP.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC적합등록필증[(주)싸이몬_Model No. ]CM1-UP1F.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
    { label: 'UL (UP)',   labelEn: 'UL (UP)',     url: `${UL}/PLC/UL DOC_PLC_CM1_UPnX.pdf` },
  ],
  CM1_CPU_XP: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-XP1F, CM1-XP3F, CM1-XP2G, CM1-XP1S, CM1-XP2F, CM1-XP3G, CM1-XP1G, XP1U, XP2U, XP3U.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC적합등록필증[(주)싸이몬_Model No. ]CM1-XP1F.PDF` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_CPU_CP: [
    { label: 'CE (CP3)', url: `${CE}/PLC/CM1/CE DOC_CM1-CP3A, CM1-CP3B, CM1-CP3U.pdf` },
    { label: 'CE (CP4)', url: `${CE}/PLC/CM1/CE DOC_CM1-CP4A, CM1-CP4B, CM1-CP4C, CM1-CP4D, CM1-CP4U.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
    { label: 'UL (CP4E/F)', url: `${UL}/PLC/UL DOC_PLC_CM1_CP4E_F.pdf` },
  ],
  CM1_CPU_XP_RED: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-XP1F, CM1-XP3F, CM1-XP2G, CM1-XP1S, CM1-XP2F, CM1-XP3G, CM1-XP1G, XP1U, XP2U, XP3U.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_PWR: [
    { label: 'CE (PS02A)', url: `${CE}/PLC/CM1/CE DOC_CM1-PS02A.pdf` },
    { label: 'CE (PS08N)', url: `${CE}/PLC/CM1/CE DOC_CM1-PS08N, ET10M, EC01G, LG02G.pdf` },
    { label: 'KC (PS02A)', url: `${KC}/PLC/KC DOC_CM1-PS02A.pdf` },
  ],
  CM1_RED_PWR: [
    { label: 'KC (RPW)', url: `${KC}/PLC/KC 인증서(EMC)_(주)싸이몬_Redundant Power Monitoring Module_[Model No. CM1-RPW]_서명본.pdf` },
  ],
  CM1_BASE: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-PD01A.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC DOC_CM1-PD01A.pdf` },
  ],
  CM1_DI: [
    { label: 'CE (XD16)', url: `${CE}/PLC/CM1/CE DOC_CM1-XD16E, CM1-XD16F.pdf` },
    { label: 'CE (XD32)', url: `${CE}/PLC/CM1/CE DOC_CM1-XD32E, CM1-XD32F.pdf` },
    { label: 'CE (XD64)', url: `${CE}/PLC/CM1/CE DOC_CM1-XD64E.pdf` },
    { label: 'KC (XD16)', url: `${KC}/PLC/KC DOC_CM1-XD16E.pdf` },
    { label: 'KC (XD32)', url: `${KC}/PLC/KC DOC_CM1-XD32E.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_DO: [
    { label: 'CE (YT16E)', url: `${CE}/PLC/CM1/CE DOC_CM1-YT16E.pdf` },
    { label: 'CE (YT16F)', url: `${CE}/PLC/CM1/CE DOC_CM1-YT16F.pdf` },
    { label: 'CE (YT32)', url: `${CE}/PLC/CM1/CE DOC_CM1-YT32E, CM1-YT32F.pdf` },
    { label: 'CE (YT64E)', url: `${CE}/PLC/CM1/CE DOC_CM1-YT64E.pdf` },
    { label: 'CE (YR16E)', url: `${CE}/PLC/CM1/CE DOC_CM1-YR16E.pdf` },
    { label: 'KC (YT16E)', url: `${KC}/PLC/KC DOC_CM1-YT16E.pdf` },
    { label: 'KC (YT16F)', url: `${KC}/PLC/KC DOC_CM1-YT16F.pdf` },
    { label: 'KC (YT32)', url: `${KC}/PLC/KC DOC_CM1-YT32E_YT32F.pdf` },
    { label: 'KC (YR16E)', url: `${KC}/PLC/KC DOC_CM1-YR16E.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_DIO: [
    { label: 'CE (XY16E)', url: `${CE}/PLC/CM1/CE DOC_CM1-XY16E.pdf` },
    { label: 'KC (XY16E)', url: `${KC}/PLC/KC DOC_CM1-XY16E.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_AI: [
    { label: 'CE (AD04VI)', url: `${CE}/PLC/CM1/CE DOC_CM1-AD04VI.pdf` },
    { label: 'CE (AD04W)',  url: `${CE}/PLC/CM1/CE DOC_CM1-AD04W.pdf` },
    { label: 'CE (AD08)',   url: `${CE}/PLC/CM1/CE DOC_CM1-AD08I, CM1-AD08V.pdf` },
    { label: 'CE (AD16VI)', url: `${CE}/PLC/CM1/CE DOC_CM1-AD16VI.pdf` },
    { label: 'KC (AD04VI)', url: `${KC}/PLC/KC DOC_CM1-AD04VI.pdf` },
    { label: 'KC (AD04W)',  url: `${KC}/PLC/KC DOC_CM1-AD04W.pdf` },
    { label: 'KC (AD08)',   url: `${KC}/PLC/KC DOC_CM1-AD08I_AD08V.pdf` },
    { label: 'KC (AD16VI)', url: `${KC}/PLC/KC DOC_CM1-AD16VI.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_AO: [
    { label: 'CE (DA08I)',  url: `${CE}/PLC/CM1/CE DOC_CM1-DA08I, CM1-DA04I.pdf` },
    { label: 'CE (DA08VA)', url: `${CE}/PLC/CM1/CE DOC_CM1-DA08VA, CM1-DA04VA, CM1-DA08V, CM1-DA04V.pdf` },
    { label: 'KC (DA08I)',  url: `${KC}/PLC/KC DOC_CM1-DA08I_DA04I.pdf` },
    { label: 'KC (DA08VA)', url: `${KC}/PLC/KC DOC_CM1-DA08VA_04VA_08V_04V.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_TEMP_RTD: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-RD04A, CM1-RD04B.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC DOC_CM1-RD04A_B.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_TEMP_TC: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-TC04A.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC DOC_CM1-TC04A.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_TEMP_TH: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-TH08A.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC DOC_CM1-TH08A.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_SP_HSC: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-HS02E, CM1-HS02F, CM1-HS02C.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC DOC_CM1-HS02E_F_C.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_SP_LC: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_SP_DL: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_SP_POS: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_COMM_SERIAL: [
    { label: 'CE (SC02A)', url: `${CE}/PLC/CM1/CE DOC_CM1-SC02A, CM1-SC01A, CM1-SC02CDMA, CM1-SC01DNP.pdf` },
    { label: 'CE (SC02C)', url: `${CE}/PLC/CM1/CE DOC_CM1-SC02C.pdf` },
    { label: 'CE (SC02D)', url: `${CE}/PLC/CM1/CE DOC_CM1-SC02D.pdf` },
    { label: 'KC (SC02C)', url: `${KC}/PLC/KC DOC_CM1-SC02C.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_COMM_ETH: [
    { label: 'CE (EC10)', url: `${CE}/PLC/CM1/CE DOC_CM1-EC10A, EC10V, RC10A, DC10A.pdf` },
    { label: 'CE (EP03)', url: `${CE}/PLC/CM1/CE DOC_CM1-EP03A, CM1-EP01A, CM1-EP02A.pdf` },
    { label: 'KC (EP03)', url: `${KC}/PLC/KC DOC_CM1-EP03A_02A_01A.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_COMM_OPC: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-EC10OPC.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC적합등록필증[(주)싸이몬_Model No. CM1-EC10OPC].pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_COMM_DNP: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-EC01A, CM1-RC01A, CM1-BN01A, CM1-EC04DNP, CM1-EC01DNP.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC DOC_CM1-EC01A_BN01A_RC01A_EC04DNP_EC01DNP.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_COMM_BAC: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_COMM_CDMA: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-WG02C, CM1-WG02D, CM1-WG02E.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC DOC_CM1-WG02C_D_E.pdf` },
  ],
  CM1_COMM_CNET: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_COMM_ECAT: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_ACC: [
    { label: 'CE (TB32M·SCB)', url: `${CE}/PLC/CM1/CE DOC_CM0-TB32M, CM0-SCB15M, CM0-SCB15E, CM0-SCB15I, CM0-SCB20IE.pdf` },
  ],
  CM1_RED_COMM: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_RED_MMI: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_RED_EXT: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],
  CM1_RED_BASE: [
    { label: 'CE', url: `${CE}/PLC/CM1/CE DOC_CM1-PD01A.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC DOC_CM1-PD01A.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM1 common.pdf` },
  ],

  // ── CM3 PLC-S ───────────────────────────────────────────────
  CM3_CPU_SLIM: [
    { label: 'CE (SB16MDC)', url: `${CE}/PLC/CM3/CE DOC_CM3-SB16MDCF, CM3-SB16MDCV.pdf` },
    { label: 'CE (SB16MDT)', url: `${CE}/PLC/CM3/CE DOC_CM3-SB16MDTF, CM3-SB16MDTV.pdf` },
    { label: 'CE (SB32MDC)', url: `${CE}/PLC/CM3/CE DOC_CM3-SB32MDCF, CM3-SB32MDCV.pdf` },
    { label: 'CE (SB32MDT)', url: `${CE}/PLC/CM3/CE DOC_CM3-SB32MDTF, CM3-SB32MDTV.pdf` },
    { label: 'KC (SB16MDT)', url: `${KC}/PLC/KC DOC_CM3-SB16MDTV.pdf` },
    { label: 'KC (SB16MDC)', url: `${KC}/PLC/KC적합등록필증[(주)싸이몬_Model No. ]CM3-SB16MDCF.pdf` },
    { label: 'KC (SB32MDC)', url: `${KC}/PLC/KC적합등록필증[(주)싸이몬_Model No. ]CM3-SB32MDCF.pdf` },
    { label: 'KC (SB32MDT)', url: `${KC}/PLC/KC적합등록필증[(주)싸이몬_Model No. ]CM3-SB32MDTF.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_CPU_BRICK: [
    { label: 'CE (SB16MDC)', url: `${CE}/PLC/CM3/CE DOC_CM3-SB16MDCF, CM3-SB16MDCV.pdf` },
    { label: 'CE (SB32MDT)', url: `${CE}/PLC/CM3/CE DOC_CM3-SB32MDTF, CM3-SB32MDTV.pdf` },
    { label: 'KC (SB32MDT)', url: `${KC}/PLC/KC적합등록필증[(주)싸이몬_Model No. ]CM3-SB32MDTF.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_CPU_SPLUS: [
    { label: 'CE (SP32MDC)', url: `${CE}/PLC/CM3/CE DOC_CM3-SP32MDCF(-SD), SP32MDC(-SD), SP32MDCV(-SD), SP32MDCE(-SD), SP02ERS(C), SP02ERR(C), SP01ERC, SP01EET.pdf` },
    { label: 'CE (SP32MDT)', url: `${CE}/PLC/CM3/CE DOC_CM3-SP32MDTF(-SD), SP32MDT(-SD), SP32MDTV(-SD), SP32MDTE(-SD).pdf` },
    { label: 'CE (SP32PDC)', url: `${CE}/PLC/CM3/CE DOC_CM3-SP32PDCF,CM3-SP32PDC,E,V.pdf` },
    { label: 'KC (SP16MDC)', url: `${KC}/PLC/KC적합등록필증[(주)싸이몬_Model No. ]CM3-SP16MDCF.pdf` },
    { label: 'KC (SP16MDT)', url: `${KC}/PLC/KC적합등록필증[(주)싸이몬_Model No. ]CM3-SP16MDTF.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
    { label: 'UL (SPLUS)',   url: `${UL}/PLC/UL DOC_PLC_CM3 SPLUS.pdf` },
  ],
  CM3_DI: [
    { label: 'CE', url: `${CE}/PLC/CM3/CE DOC_CM3-SP32EOC, CM3-SP32PWM.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_DO: [
    { label: 'CE (SP32EOC)', url: `${CE}/PLC/CM3/CE DOC_CM3-SP32EOC, CM3-SP32PWM.pdf` },
    { label: 'CE (SP32EDT)', url: `${CE}/PLC/CM3/CE DOC_CM3-SP32EDT.pdf` },
    { label: 'KC (SP32EDT)', url: `${KC}/PLC/KC DOC_CM3-SP32EDT.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_DIO: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_DO_PWM: [
    { label: 'CE', url: `${CE}/PLC/CM3/CE DOC_CM3-SP32EOC, CM3-SP32PWM.pdf` },
    { label: 'CE (EOCP)', url: `${CE}/PLC/CM3/CE DOC_CM3-SP32EOCP.pdf` },
    { label: 'KC (EOCP)', url: `${KC}/PLC/KC적합등록필증[(주)싸이몬_Model No. ]CM3-SP32EOCP.PDF` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_AI: [
    { label: 'CE (SP04EAO)', url: `${CE}/PLC/CM3/CE_DoC(EMC)_26STC-E-C-0026_CIMON Co., LTD._PLC-S Analog Input Module_[Model No. CM3-SP04EAO(-A)].pdf` },
    { label: 'CE (SP08EAO)', url: `${CE}/PLC/CM3/CE_DoC(EMC)_26STC-E-C-0027_CIMON Co., LTD._PLC-S Analog Input Module_[Model No. CM3-SP08EAO(-A)].pdf` },
    { label: 'KC (SP04EAO)', url: `${KC}/PLC/KC DOC_CM3-SP04EAO.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_AO: [
    { label: 'CE (SP04EOAI)', url: `${CE}/PLC/CM3/CE_DoC(EMC)_26STC-E-C-0029_CIMON Co., LTD._PLC-S Analog Output Module_[Model No. CM3-SP04EOAI].pdf` },
    { label: 'CE (SP04EOAV)', url: `${CE}/PLC/CM3/CE_DoC(EMC)_26STC-E-C-0030_CIMON Co., LTD._PLC-S Analog Output Module_[Model No. CM3-SP04EOAV].pdf` },
    { label: 'KC (SP04EOAI)', url: `${KC}/PLC/KC DOC_CM3-SP04EOAI.pdf` },
    { label: 'KC (SP04EOAV)', url: `${KC}/PLC/KC DOC_CM3-SP04EOAV.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_AIO: [
    { label: 'CE', url: `${CE}/PLC/CM3/CE_DoC(EMC)_26STC-E-C-0028_CIMON Co., LTD._PLC-S Analog Input-Output Module_[Model No. CM3-SP04EAA(-A)].pdf` },
    { label: 'KC', url: `${KC}/PLC/KC DOC_CM3-SP04EAA.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_AI_MUX: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_TEMP_RTD: [
    { label: 'CE', url: `${CE}/PLC/CM3/CE_DoC(EMC)_26STC-E-C-0031_CIMON Co., LTD._PLC-S RTD Module_[Model No. CM3-SP04ERO(-A)].pdf` },
    { label: 'KC', url: `${KC}/PLC/KC DOC_CM3-SP04ERO.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_TEMP_TC: [
    { label: 'CE', url: `${CE}/PLC/CM3/CE_DoC(EMC)_26STC-E-C-0032_CIMON Co., LTD._PLC-S TC Module_[Model No. CM3-SP04ETO(-A)].pdf` },
    { label: 'KC', url: `${KC}/PLC/KC DOC_CM3-SP04ETO.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_COMM_ETH: [
    { label: 'CE (ET10S)',    url: `${CE}/PLC/CM3/CE DOC_CM3-ET10S.pdf` },
    { label: 'CE (SP01EET)', url: `${CE}/PLC/CM3/CE_DoC(EMC)_26STC-E-C-0033_CIMON Co., LTD._PLC-S Ethernet Module_[Model No. CM3-SP01EET].pdf` },
    { label: 'KC (ET10S)',    url: `${KC}/PLC/KC DOC_CM3-ET10S.PDF` },
    { label: 'UL (CM3 ET10S)', url: `${UL}/PLC/UL DOC_PLC_CM3 ET10S.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_COMM_OPC: [
    { label: 'CE', url: `${CE}/PLC/CM3/CE DOC_CM3-SP01OPC.pdf` },
    { label: 'KC', url: `${KC}/PLC/KC적합등록필증[(주)싸이몬_Model No. ]CM3-SP01OPC.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_COMM_SERIAL: [
    { label: 'CE', url: `${CE}/PLC/CM3/CE_DoC(EMC)_26STC-E-C-0034_CIMON Co., LTD._PLC-S Serial Module_[Model No. CM3-SP02ERS(C), CM3-SP02ERR(C)].pdf` },
    { label: 'KC', url: `${KC}/PLC/KC_CM3-SP02ERRC.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_COMM_CDMA: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_SP_HSC: [
    { label: 'CE', url: `${CE}/PLC/CM3/CE DOC_CM3-SP02HSD.pdf` },
    { label: 'CE (HSC DoC)', url: `${CE}/PLC/CM3/CE_DoC(EMC)_26STC-E-C-0036_CIMON Co., LTD._PLC-S High Speed Counter Module_[Model No. CM3-SP02HSC, CM3-SP32HSCP].pdf` },
    { label: 'KC', url: `${KC}/PLC/KC_자기적합확인서_CM3-SP02HSC,CM3-SP02HSCP.pdf` },
    { label: 'UL', url: `${UL}/PLC/UL DOC_PLC_CM3 SP020HSC, SP02HSCP, SP02HSD, SP02POS.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_SP_POS: [
    { label: 'CE', url: `${CE}/PLC/CM3/CE_DoC(EMC)_26STC-E-C-0035_CIMON Co., LTD._PLC-S Positioning Module_[Model No. CM3-SP02POS].pdf` },
    { label: 'KC', url: `${KC}/PLC/KC_자기적합확인_CM3-SP02POS.pdf` },
    { label: 'UL', url: `${UL}/PLC/UL DOC_PLC_CM3 SP020HSC, SP02HSCP, SP02HSD, SP02POS.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_PWR: [
    { label: 'KC', url: `${KC}/PLC/KC 인증서(EMC)_(주)싸이몬_PLC Power Module_[Model No. CM3-SP24PWR]_서명본.pdf` },
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],
  CM3_ACC: [
    { label: 'UL (공통)', labelEn: 'UL (common)', url: `${UL}/PLC/UL DOC_PLC_CM3 common.pdf` },
  ],

  // ── IPC ──────────────────────────────────────────────────────
  PANEL: [
    { label: 'CE (iNT 500)',    url: `${CE}/PC/CE DOC_CM-iNT510-A, CM-iNP510-A.pdf` },
    { label: 'CE (iNT 510-D)',  url: `${CE}/PC/CE DOC_CM-iNT510-D, CM-iNP510-D.pdf` },
    { label: 'CE (iNT 3000)',   url: `${CE}/PC/CE DOC_CM-NT3612-A, CM-NP3612-A.pdf` },
    { label: 'CE (Wide 51112W)', url: `${CE}/PC/CE_DOC_CM-iNT(iNP)-51112W-C(H)-D, CM-iNT(iNP)-51112W-R(H)-D.pdf` },
    { label: 'KC (iNT 500)',    url: `${KC}/PC/KC DOC_CM-iNT510-A.pdf` },
    { label: 'KC (iNT 510-D)',  url: `${KC}/PC/KC DOC_CM-iNT510-D.pdf` },
    { label: 'KC (Wide 51112W)', url: `${KC}/PC/KC DOC_CM-iNT(iNP)-51112W-C(H)-D, CM-iNT(iNP)-51112W-R(H)-D.pdf` },
    { label: 'FCC (iNT 500)',   url: `${FCC}/PC/FCC DOC_CM-iNT510-A.pdf` },
    { label: 'FCC (iNT 510-D)', url: `${FCC}/PC/FCC DOC_CM-iNT510-D.pdf` },
    { label: 'FCC (Wide 51112W)', url: `${FCC}/PC/FCC_DOC_CM-iNT(iNP)-51112W-C(H)-D, CM-iNT(iNP)-51112W-R(H)-D.pdf` },
    { label: 'UL', url: `${UL}/PC/UL DOC_TOUCH 500_Series.pdf` },
  ],
  RACK: [
    { label: 'CE (NU1R56)', url: `${CE}/PC/CE DOC_CM-NU1R56-A.pdf` },
    { label: 'CE (NU1RB)',  url: `${CE}/PC/CE DOC_CM-NU1RB-A.pdf` },
    { label: 'CE (NU1RP)',  url: `${CE}/PC/CE DOC_CM-NU1RP-A.pdf` },
    { label: 'CE (NU4R56)', url: `${CE}/PC/CE DOC_CM-NU4R56-A.pdf` },
    { label: 'CE (NU4R76)', url: `${CE}/PC/CE DOC_CM-NU4R76-A.pdf` },
    { label: 'KC (NU1RB)',  url: `${KC}/PC/KC DOC_CM-NU1RB-A.PDF` },
    { label: 'KC (NU4R56)', url: `${KC}/PC/KC DOC_CM-NU4R56-A.PDF` },
    { label: 'KC (NU4R76)', url: `${KC}/PC/KC DOC_CM-NU4R76-A.PDF` },
    { label: 'FCC (NU1R56)', url: `${FCC}/PC/FCC DOC_CM-NU1R56-A.pdf` },
    { label: 'FCC (NU4R56)', url: `${FCC}/PC/FCC DOC_CM-NU4R56-A.pdf` },
  ],
  BOX: [
    { label: 'CE (NB7011)',   url: `${CE}/PC/22110185-TECE01-CE Cer (CM-NB7011_5011_3011-D).pdf` },
    { label: 'CE (NB7111)',   url: `${CE}/PC/CE DOC_CM-NB7111-D.pdf` },
    { label: 'KC (NB5011)',   url: `${KC}/PC/KC DOC_CM-NB5011-D_NB 3011,7011-D.pdf` },
    { label: 'KC (NB5111)',   url: `${KC}/PC/KC DOC_CM-NB5111-D.pdf` },
    { label: 'KC (NB7111)',   url: `${KC}/PC/KC DOC_CM-NB7111-D.pdf` },
    { label: 'FCC (NB7011)',  url: `${FCC}/PC/23080131-TEFV01-FCC Cer(CM-NB7011_5011_3011-D).pdf` },
    { label: 'FCC (NB7111)',  url: `${FCC}/PC/FCC DOC_CM-NB7111-D.pdf` },
    { label: 'UL (NB3011~)',  url: `${UL}/PC/UL DOC_NB7011,NB5011,NB3011.pdf` },
  ],
  MONITOR: [
    { label: 'CE (IM12A)',  url: `${CE}/IM/CE DOC_CM-IM12A-D.pdf` },
    { label: 'CE (IM15W)',  url: `${CE}/IM/CE DOC_CM-IM15W-D.pdf` },
    { label: 'CE (IM21W)',  url: `${CE}/IM/CE DOC_CM-IM21W-D.pdf` },
    { label: 'KC (IM 12W)', url: `${KC}/Monitor/KC DOC_CM-IM-12W-CH(RH)-D, CM-IM-12W-C(R)-D.pdf` },
    { label: 'KC (IM 15W)', url: `${KC}/Monitor/KC DOC_CM-IM-15W-CH(RH)-D, CM-IM-15W-C(R)-D.pdf` },
    { label: 'KC (IM 21W)', url: `${KC}/Monitor/KC DOC_CM-IM-21W-CH(RH)-D, CM-IM-21W-C(R)-D.pdf` },
    { label: 'FCC (IM12W)', url: `${FCC}/IM/FCC DOC_CM-IM12W-D.pdf` },
    { label: 'FCC (IM15W)', url: `${FCC}/IM/FCC DOC_CM-IM15W-D.pdf` },
    { label: 'FCC (IM21W)', url: `${FCC}/IM/FCC DOC_CM-IM21W-D.pdf` },
    { label: 'UL', url: `${UL}/PC/UL DOC_IM_Series.pdf` },
  ],

  // ── XPANEL ──────────────────────────────────────────────────
  XPANEL_HMI: [
    { label: 'CE (XT07CD)',    url: `${CE}/Xpanel/CE DOC_CM-XT07CD-DE,DN.pdf` },
    { label: 'CE (XT10CD)',    url: `${CE}/Xpanel/CE DOC_CM-(i)XT10CD-D.pdf` },
    { label: 'CE (XT12CD)',    url: `${CE}/Xpanel/CE DOC_CM-(i)XT12CD-A.pdf` },
    { label: 'CE (XT15CD)',    url: `${CE}/Xpanel/CE DOC_CM-(i)XT15CD-A.pdf` },
    { label: 'CE (eXT2-07)',   url: `${CE}/Xpanel/CE DOC_CM-eXT2-07-R-DF(DE), CM-eXT2-07-C-DF(DE).pdf` },
    { label: 'CE (eXT2-10)',   url: `${CE}/Xpanel/CE_DOC_CM-eXT2-10-R-DF(DE).pdf` },
    { label: 'CE (eXT2-12)',   url: `${CE}/Xpanel/CE_DOC_CM-eXT2-12-R-DF(DE).pdf` },
    { label: 'CE (eXT2-15)',   url: `${CE}/Xpanel/CE_DOC_CM-eXT2-15-R-DF(DE).pdf` },
    { label: 'KC (XT07CD)',    url: `${KC}/Xpanel/KC DOC_CM-XT07CD-DE].pdf` },
    { label: 'KC (XT10CD-A)',  url: `${KC}/Xpanel/KC DOC_CM-XT10CD-A_CM-iXT10CD-A (KC).pdf` },
    { label: 'KC (XT10CD-D)',  url: `${KC}/Xpanel/KC DOC_CM-XT10CD-D_CM-iXT10CD-D (KC).pdf` },
    { label: 'KC (XT12CD)',    url: `${KC}/Xpanel/KC DOC_CM-XT12CD-A_CM-iXT12CD-A].pdf` },
    { label: 'KC (XT15CD)',    url: `${KC}/Xpanel/KC DOC_CM-XT15CD-A_CM-iXT15CD-A].pdf` },
    { label: 'KC (eXT07)',     url: `${KC}/Xpanel/KC DOC_CM-eXT07-D.pdf` },
    { label: 'KC (eXT2-07)',   url: `${KC}/Xpanel/KC DOC_CM-eXT2-07-C-DF(DE).pdf` },
    { label: 'KC (eXT2-10)',   url: `${KC}/Xpanel/KC DOC_CM-eXT2-10-R-DF(DE).pdf` },
    { label: 'KC (eXT2-12)',   url: `${KC}/Xpanel/KC DOC_CM-eXT2-12-R-DF(DE).pdf` },
    { label: 'KC (eXT2-15)',   url: `${KC}/Xpanel/KC DOC_CM-eXT2-15-R-DF(DE).pdf` },
    { label: 'FCC (XT07CD)',   url: `${FCC}/Xpanel/FCC DOC_CM-XT07CD-DE, DN.pdf` },
    { label: 'FCC (XT10CD)',   url: `${FCC}/Xpanel/FCC DOC_CM-(i)XT10CD-D.pdf` },
    { label: 'FCC (eXT2-07)',  url: `${FCC}/Xpanel/FCC DOC_CM-eXT2-07-R-DF(DE), CM-eXT2-07-C-DF(DE).pdf` },
    { label: 'FCC (eXT2-10)',  url: `${FCC}/Xpanel/FCC_DOC_CM-eXT2-10-R-DF(DE).pdf` },
    { label: 'FCC (eXT2-12)',  url: `${FCC}/Xpanel/FCC_DOC_CM-eXT2-12-R-DF(DE).pdf` },
    { label: 'FCC (eXT2-15)',  url: `${FCC}/Xpanel/FCC_DOC_CM-eXT2-15-R-DF(DE).pdf` },
    { label: 'UL (XT common)', url: `${UL}/XPANEL/UL DOC_XPANEL_XT_common.pdf` },
    { label: 'UL (eXT2)',      url: `${UL}/XPANEL/UL DOC_XPANEL_eXT2 series, DM.pdf` },
    { label: 'UL (iXT12/15)',  url: `${UL}/XPANEL/UL DOC_XPANEL_iXT12_15.pdf` },
  ],
  HYBRID_XP: [
    { label: 'CE',  url: `${CE}/Xpanel/CE DOC_CM-HP07CD-AER, CM-HP07CD-ANR, CM-HP-EAA, CM-HP-DM.pdf` },
    { label: 'KC (HP07)',  url: `${KC}/Xpanel/KC DOC_CM-HP07CD-AES.pdf` },
    { label: 'KC (HP-EAA)', url: `${KC}/Xpanel/KC DOC_CM-HP-EAA.pdf` },
    { label: 'FCC (HP-EAA)', url: `${FCC}/Xpanel/FCC DOC_CM-HP-EAA.pdf` },
    { label: 'UL', url: `${UL}/XPANEL/UL DOC_XPANEL_HYBRID.pdf` },
  ],
};

export function getCertEntries(subType: string): DocEntry[] {
  return CERT_MAP[subType] ?? [];
}
