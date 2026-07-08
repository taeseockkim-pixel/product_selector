/** 제품 가격 테이블 — Product_Prise.xlsx 기반, 내부 전용 */

export interface PriceTier {
  minQty: number;
  maxQty: number;
  unitPrice: number;
}

export interface PriceEntry {
  tiers: PriceTier[];
}

function fixed(price: number): PriceTier[] {
  return [{ minQty: 1, maxQty: Infinity, unitPrice: price }];
}

export const PRICE_DATA: Record<string, PriceEntry> = {

  // ─── PLC CM1 ─────────────────────────────────────────────────────────────
  // 이중화 전용
  'CM1-XP1S':   { tiers: fixed(1130000) },
  'CM1-RC10A':  { tiers: fixed(505000)  },
  'CM1-RM01B':  { tiers: fixed(156000)  },
  'CM1-SPR':    { tiers: fixed(183000)  },
  'CM1-DC10A':  { tiers: fixed(606000)  },
  'CM1-AD04W-Y':{ tiers: fixed(710000)  },
  // UP/XP/CP CPU
  'CM1-RPW':    { tiers: fixed(198000)  },
  'CM1-BS05S':  { tiers: fixed(156000)  },
  'CM1-BS08S':  { tiers: fixed(171000)  },
  'CM1-BS10S':  { tiers: fixed(391000)  },
  'CM0-TB32DIRC':{ tiers: fixed(183000) },
  'CM0-TB32DORC':{ tiers: fixed(415000) },
  'CM0-TB32AIR': { tiers: fixed(142000) },
  'CM0-TF02M':  { tiers: fixed(166000)  },
  'CM0-TF02D':  { tiers: fixed(190000)  },
  'CM0-TF02S':  { tiers: fixed(1010000)  },
  'CM0-SCB15DIR':{ tiers: fixed(64000)  },
  'CM0-SCB25DIR':{ tiers: fixed(78000)  },
  'CM0-SCB15AI': { tiers: fixed(28000)  },
  'CM0-SCB25AI': { tiers: fixed(36000)  },
  'CM1-UP1F':   { tiers: fixed(1190000) },
  'CM1-UP2F':   { tiers: fixed(871000)  },
  'CM1-UP3F':   { tiers: fixed(543000)  },
  'CM1-XP1E':   { tiers: fixed(781000)  },
  'CM1-XP2E':   { tiers: fixed(652000)  },
  'CM1-XP3E':   { tiers: fixed(479000)  },
  'CM1-XP1F':   { tiers: fixed(920000)  },
  'CM1-XP2F':   { tiers: fixed(727000)  },
  'CM1-XP3F':   { tiers: fixed(517000)  },
  'CM1-CP3E':   { tiers: fixed(238000)  },
  'CM1-CP4E':   { tiers: fixed(119000)  },
  'CM1-CP4F':   { tiers: fixed(157000)  },
  // 전원
  'CM1-SPC':    { tiers: fixed(94000)   },
  'CM1-SP2B':   { tiers: fixed(94000)   },
  'CM1-SPW':    { tiers: fixed(113000)  },
  // 베이스
  'CM1-BS03B':  { tiers: fixed(46000)   },
  'CM1-BS04B':  { tiers: fixed(52000)   },
  'CM1-BS05B':  { tiers: fixed(64000)   },
  'CM1-BS08B':  { tiers: fixed(81000)   },
  'CM1-BS10B':  { tiers: fixed(95000)   },
  'CM1-BS12B':  { tiers: fixed(109000)   },
  // 증설
  'CM1-EP02F':  { tiers: fixed(193000)  },
  'CM1-EP03A':  { tiers: fixed(391000)  },
  // DI/DO
  'CM1-XD16E':  { tiers: fixed(54000)   },
  'CM1-XD16F':  { tiers: fixed(54000)   },
  'CM1-XD32F':  { tiers: fixed(93000)   },
  'CM1-XD32E':  { tiers: fixed(93000)   },
  'CM1-XD64E':  { tiers: fixed(209000)  },
  'CM1-YR16E':  { tiers: fixed(85000)   },
  'CM1-YT16E':  { tiers: fixed(80000)   },
  'CM1-YT16F':  { tiers: fixed(80000)   },
  'CM1-YT32E':  { tiers: fixed(97000)   },
  'CM1-YT32F':  { tiers: fixed(97000)   },
  'CM1-YT64E':  { tiers: fixed(209000)  },
  'CM1-XY16E':  { tiers: fixed(64000)   },
  // 아날로그
  'CM1-AD04VI': { tiers: fixed(275000)  },
  'CM1-AD04W':  { tiers: fixed(505000)  },
  'CM1-AD08V':  { tiers: fixed(352000)  },
  'CM1-AD08I':  { tiers: fixed(365000)  },
  'CM1-AD08VI': { tiers: fixed(429000)  },
  'CM1-AD16VI': { tiers: fixed(610000)  },
  'CM1-DA04V':  { tiers: fixed(293000)  },
  'CM1-DA04VA': { tiers: fixed(293000)  },
  'CM1-DA08V':  { tiers: fixed(470000)  },
  'CM1-DA08VA': { tiers: fixed(470000)  },
  'CM1-DA04I':  { tiers: fixed(275000)  },
  'CM1-DA08I':  { tiers: fixed(431000)  },
  'CM1-RD04A':  { tiers: fixed(329000)  },
  'CM1-RD04B':  { tiers: fixed(329000)  },
  'CM1-TC04A':  { tiers: fixed(446000)  },
  'CM1-TH08A':  { tiers: fixed(329000)  },
  // 고속/통신
  'CM1-HS02C':  { tiers: fixed(279000)  },
  'CM1-HS02F':  { tiers: fixed(279000)  },
  'CM1-HS02E':  { tiers: fixed(312000)  },
  'CM1-WG02C':  { tiers: fixed(460000)  },
  'CM1-WG02D':  { tiers: fixed(460000)  },
  'CM1-WG02E':  { tiers: fixed(460000)  },
  'CM1-LG32A':  { tiers: fixed(1043000)  },
  'CM1-LG02G':  { tiers: fixed(1043000)  },
  'CM1-PS02A':  { tiers: fixed(384000)  },
  'CM1-PS04N':  { tiers: fixed(501000)  },
  'CM1-PS08N':  { tiers: fixed(690000)  },
  'CM1-SC02C':  { tiers: fixed(212000)  },
  'CM1-SC02D':  { tiers: fixed(212000)  },
  'CM1-SC02A':  { tiers: fixed(212000)  },
  'CM1-SC01A':  { tiers: fixed(176000)  },
  'CM1-SC02CDMA':{ tiers: fixed(365000) },
  'CM1-SC01B':  { tiers: fixed(176000)  },
  'CM1-SC01DNP':{ tiers: fixed(1696000) },
  'CM1-EC01G':  { tiers: fixed(501000)  },
  'CM1-EC10A':  { tiers: fixed(460000)  },
  'CM1-EC10B':  { tiers: fixed(505000)  },
  'CM1-EC10C':  { tiers: fixed(537000)  },
  'CM1-EC01DNP':{ tiers: fixed(2216000) },
  'CM1-EC04DNP':{ tiers: fixed(2608000) },
  'CM1-DN01A':  { tiers: fixed(637000)  },
  'CM1-BN01A':  { tiers: fixed(1305000) },
  'CM1-EC10OPC':{ tiers: fixed(614000)  },
  // 케이블/악세서리
  'CM0-DM':     { tiers: fixed(6000)    },
  'CM0-CBL30':  { tiers: fixed(13000)   },
  'CM0-CBE15':  { tiers: fixed(16000)   },
  'CM0-SCB10IR':{ tiers: fixed(38000)   },
  'CM0-SCB15IR':{ tiers: fixed(45000)   },

  // ─── PLC CM3 ─────────────────────────────────────────────────────────────
  'CM3-SP16PDRF':  { tiers: fixed(426000) },
  'CM3-SP16MDR':   { tiers: fixed(157000) },
  'CM3-SP16MDRV':  { tiers: fixed(162000) },
  'CM3-SP16MDRE':  { tiers: fixed(251000) },
  'CM3-SP16MDRF':  { tiers: fixed(267000) },
  'CM3-SP16MDTV':  { tiers: fixed(193000) },
  'CM3-SP16MDTF':  { tiers: fixed(276000) },
  'CM3-SP16MDCV':  { tiers: fixed(193000) },
  'CM3-SP16MDCF':  { tiers: fixed(276000) },
  'CM3-SP32PDCF':  { tiers: fixed(449000) },
  'CM3-SP32MDC':   { tiers: fixed(200000) },
  'CM3-SP32MDCV':  { tiers: fixed(217000) },
  'CM3-SP32MDCE':  { tiers: fixed(300000) },
  'CM3-SP32MDCF':  { tiers: fixed(331000) },
  'CM3-SP32PDTF':  { tiers: fixed(449000) },
  'CM3-SP32MDT':   { tiers: fixed(203000) },
  'CM3-SP32MDT-SD':{ tiers: fixed(218000) },
  'CM3-SP32MDTV':  { tiers: fixed(218000) },
  'CM3-SP32MDTV-SD':{ tiers: fixed(235000) },
  'CM3-SP32MDTE':  { tiers: fixed(302000) },
  'CM3-SP32MDTE-SD':{ tiers: fixed(315000) },
  'CM3-SP32MDTF':  { tiers: fixed(331000) },
  'CM3-SP32MDTF-SD':{ tiers: fixed(346000) },
  'CM3-SB32MDRF':  { tiers: fixed(641000) },
  'CM3-SB32MDCF':  { tiers: fixed(641000) },
  'CM3-SB32MDTF':  { tiers: fixed(641000) },
  'CM3-SB16MDCF':  { tiers: fixed(251000) },
  'CM3-SB16MDTF':  { tiers: fixed(251000) },
  // 증설 DO
  'CM3-SP32EDO':   { tiers: fixed(108000)  },
  'CM3-SP32EDOP':  { tiers: fixed(140000) },
  'CM3-SP32EOT':   { tiers: fixed(141000) },
  'CM3-SP32EOTP':  { tiers: fixed(171000) },
  'CM3-SP32EOC':   { tiers: fixed(149000) },
  'CM3-SP32EOCP':  { tiers: fixed(179000) },
  'CM3-SP32EDT':   { tiers: fixed(141000) },
  'CM3-SP32EDTP':  { tiers: fixed(171000) },
  'CM3-SP32EDCP':  { tiers: fixed(179000) },
  'CM3-SP16EOR':   { tiers: fixed(116000) },
  'CM3-SP16EDR':   { tiers: fixed(113000) },
  'CM3-SP24PWR':   { tiers: fixed(45000)  },
  'CM3-SP32PWM':   { tiers: fixed(226000) },
  // 아날로그
  'CM3-SP04EAO':   { tiers: fixed(213000) },
  'CM3-SP08EAO':   { tiers: fixed(279000) },
  'CM3-SP04EAA':   { tiers: fixed(269000) },
  'CM3-SP04ERO':   { tiers: fixed(245000) },
  'CM3-SP04ETO':   { tiers: fixed(340000) },
  'CM3-SP04EOAI':  { tiers: fixed(221000) },
  'CM3-SP04EOAV':  { tiers: fixed(221000) },
  'CM3-SP04EAM':   { tiers: fixed(136000) },
  // 통신
  'CM3-SP02ERS':   { tiers: fixed(184000) },
  'CM3-SP02ERR':   { tiers: fixed(184000) },
  'CM3-SP01EET':   { tiers: fixed(232000) },
  'CM3-SP02ERRC':  { tiers: fixed(307000) },
  'CM3-SP02ERSC':  { tiers: fixed(307000) },
  'CM3-SP01OPC':   { tiers: fixed(539000) },
  'CM3-SP02HSC':   { tiers: fixed(212000) },
  'CM3-SP02HSD':   { tiers: fixed(212000) },
  'CM3-SP02POS':   { tiers: fixed(251000) },
  // 악세서리 CM3
  'CM0-TB32M':     { tiers: fixed(16000)  },
  'CM0-SCB10M':    { tiers: fixed(30000)  },
  'CM0-SCB15M':    { tiers: fixed(38000)  },
  'CM0-SCB20M':    { tiers: fixed(45000)  },
  'CM0-SCB25M':    { tiers: fixed(52000)  },
  'CM0-SCB30M':    { tiers: fixed(59000)  },
  'CM0-SCB10E':    { tiers: fixed(30000)  },
  'CM0-SCB15E':    { tiers: fixed(38000)  },
  'CM0-SCB20E':    { tiers: fixed(45000)  },
  'CM0-SCB25E':    { tiers: fixed(52000)  },
  'CM0-SCB30E':    { tiers: fixed(59000)  },

  // ─── NET (CAN Bus) / RIO ─────────────────────────────────────────────────
  'CM1-CN01M':  { tiers: fixed(315000) },
  'CM1-CN01S':  { tiers: fixed(312000) },
  'RC-XD16A':   { tiers: fixed(285000)  },
  'RC-XD32A':   { tiers: fixed(301000) },
  'RC-YR16A':   { tiers: fixed(301000)  },
  'RC-XY32DT':  { tiers: fixed(373000) },
  'CM1-CA01M':  { tiers: fixed(529000) },
  'CM1-CA01S':  { tiers: fixed(154000) },

  // ─── SCADA Standard ──────────────────────────────────────────────────────
  'CM01-0075/DS':    { tiers: fixed(693000)   },
  'CM01-0150/DS':    { tiers: fixed(1390000)  },
  'CM01-0500/DS':    { tiers: fixed(2220000)  },
  'CM01-FULL/DS':    { tiers: fixed(4020000)  },
  'CM01-0075/RS':    { tiers: fixed(555000)   },
  'CM01-0150/RS':    { tiers: fixed(1110000)  },
  'CM01-0500/RS':    { tiers: fixed(1670000)  },
  'CM01-FULL/RS':    { tiers: fixed(3190000)  },
  'CM01-ACS':        { tiers: fixed(1260000)  },
  'CM01-Mobile-APL': { tiers: fixed(882000)   },
  // SCADA Web
  'CM01-0002/WS':    { tiers: fixed(6990000)  },
  'CM01-0005/WS':    { tiers: fixed(7750000)  },
  'CM01-0010/WS':    { tiers: fixed(9300000)  },
  'CM01-FULL/WS':    { tiers: fixed(12030000) },
  'CM01-0150-02/VS': { tiers: fixed(2150000)  },
  'CM01-0150-05/VS': { tiers: fixed(2520000)  },
  'CM01-0150-10/VS': { tiers: fixed(2920000)  },
  'CM01-0150-FU/VS': { tiers: fixed(3310000)  },
  'CM01-0500-02/VS': { tiers: fixed(3760000)  },
  'CM01-0500-05/VS': { tiers: fixed(4400000)  },
  'CM01-0500-10/VS': { tiers: fixed(5040000)  },
  'CM01-0500-FU/VS': { tiers: fixed(5690000)  },
  'CM01-FULL-02/VS': { tiers: fixed(7890000)  },
  'CM01-FULL-05/VS': { tiers: fixed(9300000)  },
  'CM01-FULL-10/VS': { tiers: fixed(10730000) },
  'CM01-FULL-FU/VS': { tiers: fixed(12150000) },
  'CM01-0150-02/CS': { tiers: fixed(2440000)  },
  'CM01-0150-05/CS': { tiers: fixed(2920000)  },
  'CM01-0150-10/CS': { tiers: fixed(3410000)  },
  'CM01-0150-FU/CS': { tiers: fixed(3890000)  },
  'CM01-0500-02/CS': { tiers: fixed(4530000)  },
  'CM01-0500-05/CS': { tiers: fixed(5440000)  },
  'CM01-0500-10/CS': { tiers: fixed(6340000)  },
  'CM01-0500-FU/CS': { tiers: fixed(7240000)  },
  'CM01-FULL-02/CS': { tiers: fixed(9050000)  },
  'CM01-FULL-05/CS': { tiers: fixed(10850000) },
  'CM01-FULL-10/CS': { tiers: fixed(12670000) },
  'CM01-FULL-FU/CS': { tiers: fixed(14490000) },

  // ─── SCADA PRO Standard ──────────────────────────────────────────────────
  'CM03-0075/DS':    { tiers: fixed(665000)   },
  'CM03-0150/DS':    { tiers: fixed(1200000)  },
  'CM03-0500/DS':    { tiers: fixed(2000000)  },
  'CM03-10K/DS':     { tiers: fixed(3860000)  },
  'CM03-100K/DS':    { tiers: fixed(5920000)  },
  'CM03-0075/RS':    { tiers: fixed(532000)   },
  'CM03-0150/RS':    { tiers: fixed(930000)   },
  'CM03-0500/RS':    { tiers: fixed(1470000)  },
  'CM03-10K/RS':     { tiers: fixed(3060000)  },
  'CM03-100K/RS':    { tiers: fixed(5720000)  },
  'CM03-Mobile-APL': { tiers: fixed(1210000)  },
  'CM03-PR':         { tiers: fixed(2180000)  },
  'CM03-OPCUA-SE':   { tiers: fixed(1820000)  },
  'CM03-OPCUA-CL':   { tiers: fixed(1820000)  },
  'CM03-61850-CL':   { tiers: fixed(1820000)  },

  // ─── IPC 500 Series (1대 기준 단가, 20대 이상 할인 적용) ──────────────
  // iNT(iNP)510-A/D → products.json id: iNT510 (A 기준 단가 사용)
  'iNT510': {
    tiers: [
      { minQty: 1,  maxQty: 19, unitPrice: 2930000 },
      { minQty: 20, maxQty: Infinity, unitPrice: 2630000 },
    ],
  },
  'iNT512': {
    tiers: [
      { minQty: 1,  maxQty: 19, unitPrice: 3220000 },
      { minQty: 20, maxQty: Infinity, unitPrice: 2900000 },
    ],
  },
  'iNT515': {
    tiers: [
      { minQty: 1,  maxQty: 19, unitPrice: 3800000 },
      { minQty: 20, maxQty: Infinity, unitPrice: 3420000 },
    ],
  },
  'iNT519': {
    tiers: [
      { minQty: 1,  maxQty: 19, unitPrice: 4070000 },
      { minQty: 20, maxQty: Infinity, unitPrice: 3660000 },
    ],
  },

  // ─── IPC 5000 Series ─────────────────────────────────────────────────────
  'NT5615':   { tiers: fixed(4090000) },
  'iNT5619':  { tiers: fixed(4350000) },

  // ─── IPC 50000W / 70000W Series ──────────────────────────────────────────
  'iNT51115W': { tiers: fixed(4430000) },
  'iNT51121W': { tiers: fixed(4750000) },
  'iNT71115W': { tiers: fixed(4810000) },
  'iNT71121W': { tiers: fixed(5020000) },

  // ─── IPC BOX PC Series (NB) ──────────────────────────────────────────────
  // CM-NB200-D: 단종, 단가 미등록
  'CM-NB5011-D': { tiers: fixed(2410000) },
  'CM-NB7011-D': { tiers: fixed(2880000) },

  // ─── XPANEL XT / iXT (수량별 단가) ───────────────────────────────────────
  // CM-XT07CD-DN → products.json id: XT07CD-DN
  'XT07CD-DN': {
    tiers: [
      { minQty: 1,   maxQty: 9,   unitPrice: 276000 },
      { minQty: 10,  maxQty: 99,  unitPrice: 230000 },
      { minQty: 100, maxQty: 199, unitPrice: 207000 },
      { minQty: 200, maxQty: 299, unitPrice: 198000 },
      { minQty: 300, maxQty: Infinity, unitPrice: 189000 },
    ],
  },
  'XT07CD-DE': {
    tiers: [
      { minQty: 1,   maxQty: 9,   unitPrice: 345000 },
      { minQty: 10,  maxQty: 99,  unitPrice: 288000 },
      { minQty: 100, maxQty: 199, unitPrice: 259000 },
      { minQty: 200, maxQty: 299, unitPrice: 242000 },
      { minQty: 300, maxQty: Infinity, unitPrice: 230000 },
    ],
  },
  // XT10 AC (XT10CD-A = iXT10CD-A 동일 단가)
  'XT10CD-A': {
    tiers: [
      { minQty: 1,  maxQty: 4,  unitPrice: 1035000 },
      { minQty: 5,  maxQty: 49, unitPrice: 863000  },
      { minQty: 50, maxQty: 99, unitPrice: 690000  },
      { minQty: 100, maxQty: Infinity, unitPrice: 630000 },
    ],
  },
  'iXT10CD-A': {
    tiers: [
      { minQty: 1,  maxQty: 4,  unitPrice: 1035000 },
      { minQty: 5,  maxQty: 49, unitPrice: 863000  },
      { minQty: 50, maxQty: 99, unitPrice: 690000  },
      { minQty: 100, maxQty: Infinity, unitPrice: 630000 },
    ],
  },
  // XT10 DC (XT10CD-D = iXT10CD-D 동일 단가)
  'XT10CD-D': {
    tiers: [
      { minQty: 1,  maxQty: 4,  unitPrice: 970000 },
      { minQty: 5,  maxQty: 49, unitPrice: 805000 },
      { minQty: 50, maxQty: 99, unitPrice: 644000 },
      { minQty: 100, maxQty: Infinity, unitPrice: 580000 },
    ],
  },
  'iXT10CD-D': {
    tiers: [
      { minQty: 1,  maxQty: 4,  unitPrice: 970000 },
      { minQty: 5,  maxQty: 49, unitPrice: 805000 },
      { minQty: 50, maxQty: 99, unitPrice: 644000 },
      { minQty: 100, maxQty: Infinity, unitPrice: 580000 },
    ],
  },
  // iXT12 AC
  'iXT12CD-A': {
    tiers: [
      { minQty: 1,  maxQty: 9,  unitPrice: 1140000 },
      { minQty: 10, maxQty: 49, unitPrice: 911000  },
      { minQty: 50, maxQty: Infinity, unitPrice: 870000 },
    ],
  },
  // iXT15 AC
  'iXT15CD-A': {
    tiers: [
      { minQty: 1,  maxQty: 4,  unitPrice: 1265000 },
      { minQty: 5,  maxQty: 19, unitPrice: 1020000 },
      { minQty: 20, maxQty: Infinity, unitPrice: 970000 },
    ],
  },

  // ─── eXT2 Series (수량별 단가, id = CM-eXT2-... 그대로) ──────────────────
  'CM-eXT2-07-R-DE': {
    tiers: [
      { minQty: 1,   maxQty: 10,  unitPrice: 584000 },
      { minQty: 11,  maxQty: 50,  unitPrice: 486000 },
      { minQty: 51,  maxQty: 200, unitPrice: 438000 },
      { minQty: 201, maxQty: Infinity, unitPrice: 418000 },
    ],
  },
  'CM-eXT2-07-R-DF': {
    tiers: [
      { minQty: 1,   maxQty: 10,  unitPrice: 654000 },
      { minQty: 11,  maxQty: 50,  unitPrice: 545000 },
      { minQty: 51,  maxQty: 200, unitPrice: 490000 },
      { minQty: 201, maxQty: Infinity, unitPrice: 468000 },
    ],
  },
  'CM-eXT2-10W-C-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 1025000 },
      { minQty: 11, maxQty: 30, unitPrice: 835000 },
      { minQty: 31, maxQty: 60, unitPrice: 665000 },
      { minQty: 61, maxQty: Infinity, unitPrice: 608000 },
    ],
  },
  'CM-eXT2-10W-CH-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 1025000 },
      { minQty: 11, maxQty: 30, unitPrice: 835000 },
      { minQty: 31, maxQty: 60, unitPrice: 665000 },
      { minQty: 61, maxQty: Infinity, unitPrice: 608000 },
    ],
  },
  'CM-eXT2-12W-C-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 1153000 },
      { minQty: 11, maxQty: 20, unitPrice: 977000  },
      { minQty: 21, maxQty: Infinity, unitPrice: 902000 },
    ],
  },
  'CM-eXT2-12W-CH-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 1153000 },
      { minQty: 11, maxQty: 20, unitPrice: 977000  },
      { minQty: 21, maxQty: Infinity, unitPrice: 902000 },
    ],
  },
  'CM-eXT2-15W-C-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 1392000 },
      { minQty: 11, maxQty: 20, unitPrice: 1086000  },
      { minQty: 21, maxQty: Infinity, unitPrice: 1002000 },
    ],
  },
  'CM-eXT2-15W-CH-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 1392000 },
      { minQty: 11, maxQty: 20, unitPrice: 1086000  },
      { minQty: 21, maxQty: Infinity, unitPrice: 1002000 },
    ],
  },

  // ─── HYBRID XPanel ───────────────────────────────────────────────────────
  'CM-sHP07CD-DR': { tiers: fixed(506000) },
  'CM-sHP07CD-DT': { tiers: fixed(483000) },
  'CM-sHP07CD-DC': { tiers: fixed(483000) },

};

/** 제품 ID + 수량으로 단가 조회. 가격 정보 없으면 null 반환 */
export function getUnitPrice(productId: string, qty: number): number | null {
  const entry = PRICE_DATA[productId];
  if (!entry) return null;
  const tier = entry.tiers.find((t) => qty >= t.minQty && qty <= t.maxQty);
  return tier?.unitPrice ?? null;
}

/** 수량별 단가 목록이 있는 제품인지 여부 */
export function isTieredPricing(productId: string): boolean {
  const entry = PRICE_DATA[productId];
  if (!entry) return false;
  return entry.tiers.length > 1;
}
