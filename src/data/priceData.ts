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
  'CM1-XP1S':   { tiers: fixed(1019000) },
  'CM1-RC10A':  { tiers: fixed(459000)  },
  'CM1-RM01B':  { tiers: fixed(142000)  },
  'CM1-SPR':    { tiers: fixed(166000)  },
  'CM1-DC10A':  { tiers: fixed(551000)  },
  'CM1-AD04W-Y':{ tiers: fixed(646000)  },
  // UP/XP/CP CPU
  'CM1-RPW':    { tiers: fixed(180000)  },
  'CM1-BS05S':  { tiers: fixed(142000)  },
  'CM1-BS08S':  { tiers: fixed(156000)  },
  'CM1-BS10S':  { tiers: fixed(356000)  },
  'CM0-TB32DIRC':{ tiers: fixed(166000) },
  'CM0-TB32DORC':{ tiers: fixed(378000) },
  'CM0-TB32AIR': { tiers: fixed(129000) },
  'CM0-TF02M':  { tiers: fixed(151000)  },
  'CM0-TF02D':  { tiers: fixed(173000)  },
  'CM0-TF02S':  { tiers: fixed(911000)  },
  'CM0-SCB15DIR':{ tiers: fixed(58000)  },
  'CM0-SCB25DIR':{ tiers: fixed(71000)  },
  'CM0-SCB15AI': { tiers: fixed(26000)  },
  'CM0-SCB25AI': { tiers: fixed(33000)  },
  'CM1-UP1F':   { tiers: fixed(1076000) },
  'CM1-UP2F':   { tiers: fixed(792000)  },
  'CM1-UP3F':   { tiers: fixed(494000)  },
  'CM1-XP1E':   { tiers: fixed(710000)  },
  'CM1-XP2E':   { tiers: fixed(593000)  },
  'CM1-XP3E':   { tiers: fixed(435000)  },
  'CM1-XP1F':   { tiers: fixed(837000)  },
  'CM1-XP2F':   { tiers: fixed(661000)  },
  'CM1-XP3F':   { tiers: fixed(470000)  },
  'CM1-CP3E':   { tiers: fixed(217000)  },
  'CM1-CP4E':   { tiers: fixed(109000)  },
  'CM1-CP4F':   { tiers: fixed(143000)  },
  // 전원
  'CM1-SPC':    { tiers: fixed(86000)   },
  'CM1-SP2B':   { tiers: fixed(86000)   },
  'CM1-SPW':    { tiers: fixed(103000)  },
  // 베이스
  'CM1-BS03B':  { tiers: fixed(42000)   },
  'CM1-BS04B':  { tiers: fixed(48000)   },
  'CM1-BS05B':  { tiers: fixed(58000)   },
  'CM1-BS08B':  { tiers: fixed(74000)   },
  'CM1-BS10B':  { tiers: fixed(87000)   },
  'CM1-BS12B':  { tiers: fixed(99000)   },
  // 증설
  'CM1-EP02F':  { tiers: fixed(175000)  },
  'CM1-EP03A':  { tiers: fixed(356000)  },
  // DI/DO
  'CM1-XD16E':  { tiers: fixed(49000)   },
  'CM1-XD16F':  { tiers: fixed(49000)   },
  'CM1-XD32F':  { tiers: fixed(84000)   },
  'CM1-XD32E':  { tiers: fixed(84000)   },
  'CM1-XD64E':  { tiers: fixed(190000)  },
  'CM1-YR16E':  { tiers: fixed(78000)   },
  'CM1-YT16E':  { tiers: fixed(73000)   },
  'CM1-YT16F':  { tiers: fixed(73000)   },
  'CM1-YT32E':  { tiers: fixed(88000)   },
  'CM1-YT32F':  { tiers: fixed(88000)   },
  'CM1-YT64E':  { tiers: fixed(190000)  },
  'CM1-XY16E':  { tiers: fixed(58000)   },
  // 아날로그
  'CM1-AD04VI': { tiers: fixed(250000)  },
  'CM1-AD04W':  { tiers: fixed(459000)  },
  'CM1-AD08V':  { tiers: fixed(320000)  },
  'CM1-AD08I':  { tiers: fixed(332000)  },
  'CM1-AD08VI': { tiers: fixed(390000)  },
  'CM1-AD16VI': { tiers: fixed(555000)  },
  'CM1-DA04V':  { tiers: fixed(266000)  },
  'CM1-DA04VA': { tiers: fixed(266000)  },
  'CM1-DA08V':  { tiers: fixed(427000)  },
  'CM1-DA08VA': { tiers: fixed(427000)  },
  'CM1-DA04I':  { tiers: fixed(250000)  },
  'CM1-DA08I':  { tiers: fixed(391000)  },
  'CM1-RD04A':  { tiers: fixed(299000)  },
  'CM1-RD04B':  { tiers: fixed(299000)  },
  'CM1-TC04A':  { tiers: fixed(405000)  },
  'CM1-TH08A':  { tiers: fixed(299000)  },
  // 고속/통신
  'CM1-HS02C':  { tiers: fixed(253000)  },
  'CM1-HS02F':  { tiers: fixed(253000)  },
  'CM1-HS02E':  { tiers: fixed(283000)  },
  'CM1-WG02C':  { tiers: fixed(418000)  },
  'CM1-WG02D':  { tiers: fixed(418000)  },
  'CM1-WG02E':  { tiers: fixed(418000)  },
  'CM1-LG32A':  { tiers: fixed(948000)  },
  'CM1-LG02G':  { tiers: fixed(948000)  },
  'CM1-PS02A':  { tiers: fixed(349000)  },
  'CM1-PS04N':  { tiers: fixed(456000)  },
  'CM1-PS08N':  { tiers: fixed(627000)  },
  'CM1-SC02C':  { tiers: fixed(193000)  },
  'CM1-SC02D':  { tiers: fixed(193000)  },
  'CM1-SC02A':  { tiers: fixed(193000)  },
  'CM1-SC01A':  { tiers: fixed(160000)  },
  'CM1-SC02CDMA':{ tiers: fixed(332000) },
  'CM1-SC01B':  { tiers: fixed(160000)  },
  'CM1-SC01DNP':{ tiers: fixed(1541000) },
  'CM1-EC01G':  { tiers: fixed(456000)  },
  'CM1-EC10A':  { tiers: fixed(418000)  },
  'CM1-EC10B':  { tiers: fixed(459000)  },
  'CM1-EC10C':  { tiers: fixed(488000)  },
  'CM1-EC01DNP':{ tiers: fixed(2014000) },
  'CM1-EC04DNP':{ tiers: fixed(2371000) },
  'CM1-DN01A':  { tiers: fixed(579000)  },
  'CM1-BN01A':  { tiers: fixed(1186000) },
  'CM1-EC10OPC':{ tiers: fixed(558000)  },
  // 케이블/악세서리
  'CM0-DM':     { tiers: fixed(5000)    },
  'CM0-CBL30':  { tiers: fixed(12000)   },
  'CM0-CBE05':  { tiers: fixed(12000)   },
  'CM0-CBE15':  { tiers: fixed(14000)   },
  'CM0-CBE30':  { tiers: fixed(17000)   },
  'CM0-SCB10IR':{ tiers: fixed(35000)   },
  'CM0-SCB15IR':{ tiers: fixed(41000)   },
  'CM0-SCB20IR':{ tiers: fixed(48000)   },
  'CM0-SCB25IR':{ tiers: fixed(53000)   },
  'CM0-SCB30IR':{ tiers: fixed(60000)   },

  // ─── PLC CM3 ─────────────────────────────────────────────────────────────
  'CM3-SP16PDRF':  { tiers: fixed(355000) },
  'CM3-SP16MDR':   { tiers: fixed(143000) },
  'CM3-SP16MDRV':  { tiers: fixed(148000) },
  'CM3-SP16MDRE':  { tiers: fixed(228000) },
  'CM3-SP16MDRF':  { tiers: fixed(243000) },
  'CM3-SP16MDTV':  { tiers: fixed(175000) },
  'CM3-SP16MDTF':  { tiers: fixed(251000) },
  'CM3-SP16MDCV':  { tiers: fixed(175000) },
  'CM3-SP16MDCF':  { tiers: fixed(251000) },
  'CM3-SP32PDCF':  { tiers: fixed(374000) },
  'CM3-SP32MDC':   { tiers: fixed(182000) },
  'CM3-SP32MDCV':  { tiers: fixed(197000) },
  'CM3-SP32MDCE':  { tiers: fixed(273000) },
  'CM3-SP32MDCF':  { tiers: fixed(301000) },
  'CM3-SP32PDTF':  { tiers: fixed(374000) },
  'CM3-SP32MDT':   { tiers: fixed(184000) },
  'CM3-SP32MDT-SD':{ tiers: fixed(198000) },
  'CM3-SP32MDTV':  { tiers: fixed(198000) },
  'CM3-SP32MDTV-SD':{ tiers: fixed(213000) },
  'CM3-SP32MDTE':  { tiers: fixed(274000) },
  'CM3-SP32MDTE-SD':{ tiers: fixed(287000) },
  'CM3-SP32MDTF':  { tiers: fixed(301000) },
  'CM3-SP32MDTF-SD':{ tiers: fixed(314000) },
  'CM3-SB32MDRF':  { tiers: fixed(582000) },
  'CM3-SB32MDCF':  { tiers: fixed(582000) },
  'CM3-SB32MDTF':  { tiers: fixed(582000) },
  'CM3-SB16MDCF':  { tiers: fixed(228000) },
  'CM3-SB16MDTF':  { tiers: fixed(228000) },
  // 증설 DO
  'CM3-SP32EDO':   { tiers: fixed(98000)  },
  'CM3-SP32EDOP':  { tiers: fixed(127000) },
  'CM3-SP32EOT':   { tiers: fixed(128000) },
  'CM3-SP32EOTP':  { tiers: fixed(156000) },
  'CM3-SP32EOC':   { tiers: fixed(135000) },
  'CM3-SP32EOCP':  { tiers: fixed(163000) },
  'CM3-SP32EDT':   { tiers: fixed(128000) },
  'CM3-SP32EDTP':  { tiers: fixed(156000) },
  'CM3-SP32EDCP':  { tiers: fixed(163000) },
  'CM3-SP16EOR':   { tiers: fixed(105000) },
  'CM3-SP16EDR':   { tiers: fixed(103000) },
  'CM3-SP24PWR':   { tiers: fixed(41000)  },
  'CM3-SP32PWM':   { tiers: fixed(205000) },
  // 아날로그
  'CM3-SP04EAO':   { tiers: fixed(194000) },
  'CM3-SP08EAO':   { tiers: fixed(253000) },
  'CM3-SP04EAA':   { tiers: fixed(244000) },
  'CM3-SP04ERO':   { tiers: fixed(222000) },
  'CM3-SP04ETO':   { tiers: fixed(309000) },
  'CM3-SP04EOAI':  { tiers: fixed(201000) },
  'CM3-SP04EOAV':  { tiers: fixed(201000) },
  'CM3-SP04EAM':   { tiers: fixed(124000) },
  // 통신
  'CM3-SP02ERS':   { tiers: fixed(167000) },
  'CM3-SP02ERR':   { tiers: fixed(167000) },
  'CM3-SP01EET':   { tiers: fixed(211000) },
  'CM3-SP02ERRC':  { tiers: fixed(279000) },
  'CM3-SP02ERSC':  { tiers: fixed(279000) },
  'CM3-SP01OPC':   { tiers: fixed(490000) },
  'CM3-SP02HSC':   { tiers: fixed(193000) },
  'CM3-SP02HSD':   { tiers: fixed(193000) },
  'CM3-SP02POS':   { tiers: fixed(228000) },
  // 악세서리 CM3
  'CM0-TB32M':     { tiers: fixed(14000)  },
  'CM0-SCB10M':    { tiers: fixed(27000)  },
  'CM0-SCB15M':    { tiers: fixed(35000)  },
  'CM0-SCB20M':    { tiers: fixed(41000)  },
  'CM0-SCB25M':    { tiers: fixed(48000)  },
  'CM0-SCB30M':    { tiers: fixed(53000)  },
  'CM0-SCB10E':    { tiers: fixed(27000)  },
  'CM0-SCB15E':    { tiers: fixed(35000)  },
  'CM0-SCB20E':    { tiers: fixed(41000)  },
  'CM0-SCB25E':    { tiers: fixed(48000)  },
  'CM0-SCB30E':    { tiers: fixed(53000)  },

  // ─── NET (CAN Bus) / RIO ─────────────────────────────────────────────────
  'CM1-CN01M':  { tiers: fixed(147000) },
  'CM1-CN01S':  { tiers: fixed(140000) },
  'RC-XD16A':   { tiers: fixed(67000)  },
  'RC-XD32A':   { tiers: fixed(111000) },
  'RC-YR16A':   { tiers: fixed(97000)  },
  'RC-XY32DT':  { tiers: fixed(121000) },
  'CM1-CA01M':  { tiers: fixed(424000) },
  'CM1-CA01S':  { tiers: fixed(140000) },

  // ─── SCADA Standard ──────────────────────────────────────────────────────
  'CM01-0075/DS':    { tiers: fixed(660000)   },
  'CM01-0150/DS':    { tiers: fixed(1320000)  },
  'CM01-0500/DS':    { tiers: fixed(2120000)  },
  'CM01-FULL/DS':    { tiers: fixed(3830000)  },
  'CM01-0075/RS':    { tiers: fixed(530000)   },
  'CM01-0150/RS':    { tiers: fixed(1060000)  },
  'CM01-0500/RS':    { tiers: fixed(1590000)  },
  'CM01-FULL/RS':    { tiers: fixed(3040000)  },
  'CM01-ACS':        { tiers: fixed(1200000)  },
  'CM01-Mobile-APL': { tiers: fixed(840000)   },
  // SCADA Web
  'CM01-0002/WS':    { tiers: fixed(6650000)  },
  'CM01-0005/WS':    { tiers: fixed(7380000)  },
  'CM01-0010/WS':    { tiers: fixed(8860000)  },
  'CM01-FULL/WS':    { tiers: fixed(11450000) },
  'CM01-0150-02/VS': { tiers: fixed(2040000)  },
  'CM01-0150-05/VS': { tiers: fixed(2400000)  },
  'CM01-0150-10/VS': { tiers: fixed(2780000)  },
  'CM01-0150-FU/VS': { tiers: fixed(3150000)  },
  'CM01-0500-02/VS': { tiers: fixed(3580000)  },
  'CM01-0500-05/VS': { tiers: fixed(4190000)  },
  'CM01-0500-10/VS': { tiers: fixed(4800000)  },
  'CM01-0500-FU/VS': { tiers: fixed(5420000)  },
  'CM01-FULL-02/VS': { tiers: fixed(7520000)  },
  'CM01-FULL-05/VS': { tiers: fixed(8860000)  },
  'CM01-FULL-10/VS': { tiers: fixed(10220000) },
  'CM01-FULL-FU/VS': { tiers: fixed(11570000) },
  'CM01-0150-02/CS': { tiers: fixed(2320000)  },
  'CM01-0150-05/CS': { tiers: fixed(2780000)  },
  'CM01-0150-10/CS': { tiers: fixed(3240000)  },
  'CM01-0150-FU/CS': { tiers: fixed(3700000)  },
  'CM01-0500-02/CS': { tiers: fixed(4310000)  },
  'CM01-0500-05/CS': { tiers: fixed(5180000)  },
  'CM01-0500-10/CS': { tiers: fixed(6040000)  },
  'CM01-0500-FU/CS': { tiers: fixed(6890000)  },
  'CM01-FULL-02/CS': { tiers: fixed(8620000)  },
  'CM01-FULL-05/CS': { tiers: fixed(10340000) },
  'CM01-FULL-10/CS': { tiers: fixed(12060000) },
  'CM01-FULL-FU/CS': { tiers: fixed(13800000) },

  // ─── SCADA PRO Standard ──────────────────────────────────────────────────
  'CM03-0075/DS':    { tiers: fixed(640000)   },
  'CM03-0150/DS':    { tiers: fixed(1140000)  },
  'CM03-0500/DS':    { tiers: fixed(1900000)  },
  'CM03-10K/DS':     { tiers: fixed(3670000)  },
  'CM03-100K/DS':    { tiers: fixed(5640000)  },
  'CM03-0075/RS':    { tiers: fixed(510000)   },
  'CM03-0150/RS':    { tiers: fixed(890000)   },
  'CM03-0500/RS':    { tiers: fixed(1400000)  },
  'CM03-10K/RS':     { tiers: fixed(2910000)  },
  'CM03-100K/RS':    { tiers: fixed(5440000)  },
  'CM03-Mobile-APL': { tiers: fixed(1150000)  },
  'CM03-PR':         { tiers: fixed(2070000)  },
  'CM03-OPCUA-SE':   { tiers: fixed(1730000)  },
  'CM03-OPCUA-CL':   { tiers: fixed(1730000)  },
  'CM03-61850-CL':   { tiers: fixed(1730000)  },

  // ─── IPC 500 Series (1대 기준 단가, 20대 이상 할인 적용) ──────────────
  // iNT(iNP)510-A/D → products.json id: iNT510 (A 기준 단가 사용)
  'iNT510': {
    tiers: [
      { minQty: 1,  maxQty: 19, unitPrice: 2660000 },
      { minQty: 20, maxQty: Infinity, unitPrice: 2400000 },
    ],
  },
  'iNT512': {
    tiers: [
      { minQty: 1,  maxQty: 19, unitPrice: 2930000 },
      { minQty: 20, maxQty: Infinity, unitPrice: 2630000 },
    ],
  },
  'iNT515': {
    tiers: [
      { minQty: 1,  maxQty: 19, unitPrice: 3450000 },
      { minQty: 20, maxQty: Infinity, unitPrice: 3110000 },
    ],
  },
  'iNT519': {
    tiers: [
      { minQty: 1,  maxQty: 19, unitPrice: 3720000 },
      { minQty: 20, maxQty: Infinity, unitPrice: 3350000 },
    ],
  },

  // ─── IPC 5000 Series ─────────────────────────────────────────────────────
  'NT5615':   { tiers: fixed(3820000) },
  'iNT5619':  { tiers: fixed(4060000) },

  // ─── IPC 50000W / 70000W Series ──────────────────────────────────────────
  'iNT51115W': { tiers: fixed(4030000) },
  'iNT51121W': { tiers: fixed(4320000) },
  'iNT71115W': { tiers: fixed(4370000) },
  'iNT71121W': { tiers: fixed(4780000) },

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
      { minQty: 1,   maxQty: 10,  unitPrice: 345000 },
      { minQty: 11,  maxQty: 50,  unitPrice: 288000 },
      { minQty: 51,  maxQty: 200, unitPrice: 259000 },
      { minQty: 201, maxQty: Infinity, unitPrice: 248000 },
    ],
  },
  'CM-eXT2-07-R-DF': {
    tiers: [
      { minQty: 1,   maxQty: 10,  unitPrice: 387000 },
      { minQty: 11,  maxQty: 50,  unitPrice: 322000 },
      { minQty: 51,  maxQty: 200, unitPrice: 290000 },
      { minQty: 201, maxQty: Infinity, unitPrice: 277000 },
    ],
  },
  'CM-eXT2-10W-C-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 932000 },
      { minQty: 11, maxQty: 30, unitPrice: 759000 },
      { minQty: 31, maxQty: 60, unitPrice: 604000 },
      { minQty: 61, maxQty: Infinity, unitPrice: 560000 },
    ],
  },
  'CM-eXT2-10W-CH-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 932000 },
      { minQty: 11, maxQty: 30, unitPrice: 759000 },
      { minQty: 31, maxQty: 60, unitPrice: 604000 },
      { minQty: 61, maxQty: Infinity, unitPrice: 560000 },
    ],
  },
  'CM-eXT2-12W-C-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 1050000 },
      { minQty: 11, maxQty: 20, unitPrice: 773000  },
      { minQty: 21, maxQty: Infinity, unitPrice: 820000 },
    ],
  },
  'CM-eXT2-12W-CH-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 1050000 },
      { minQty: 11, maxQty: 20, unitPrice: 773000  },
      { minQty: 21, maxQty: Infinity, unitPrice: 820000 },
    ],
  },
  'CM-eXT2-15W-C-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 1270000 },
      { minQty: 11, maxQty: 20, unitPrice: 987000  },
      { minQty: 21, maxQty: Infinity, unitPrice: 920000 },
    ],
  },
  'CM-eXT2-15W-CH-DF': {
    tiers: [
      { minQty: 1,  maxQty: 10, unitPrice: 1270000 },
      { minQty: 11, maxQty: 20, unitPrice: 987000  },
      { minQty: 21, maxQty: Infinity, unitPrice: 920000 },
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
