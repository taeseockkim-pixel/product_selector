export type DocEntry = { label: string; labelEn?: string; url: string };

// ── 경로 상수 ─────────────────────────────────────────────────
const C  = '/catalogs';
const M1 = '/manuals/CM1-PLC';
const M3 = '/manuals/CM3-PLCS';
const MI = '/manuals/IPC_IAC';
const MX = '/manuals/XPANEL';
const D1 = '/drawings/CM1-PLC';
const D3 = '/drawings/CM3-PLCS';
const DI = '/drawings/IPC_IAC';
const DX = '/drawings/XPANEL';

// ── 카탈로그 ─────────────────────────────────────────────────
const CATALOG_MAP: Record<string, string> = {
  // CM1 PLC
  CM1_CPU_UP: `${C}/CM1-PLC.pdf`, CM1_CPU_XP: `${C}/CM1-PLC.pdf`,
  CM1_CPU_XP_RED: `${C}/CM1-PLC.pdf`, CM1_CPU_CP: `${C}/CM1-PLC.pdf`,
  CM1_PWR: `${C}/CM1-PLC.pdf`, CM1_BASE: `${C}/CM1-PLC.pdf`,
  CM1_DI: `${C}/CM1-PLC.pdf`, CM1_DO: `${C}/CM1-PLC.pdf`, CM1_DIO: `${C}/CM1-PLC.pdf`,
  CM1_AI: `${C}/CM1-PLC.pdf`, CM1_AO: `${C}/CM1-PLC.pdf`,
  CM1_TEMP_RTD: `${C}/CM1-PLC.pdf`, CM1_TEMP_TC: `${C}/CM1-PLC.pdf`, CM1_TEMP_TH: `${C}/CM1-PLC.pdf`,
  CM1_SP_HSC: `${C}/CM1-PLC.pdf`, CM1_SP_LC: `${C}/CM1-PLC.pdf`,
  CM1_SP_DL: `${C}/CM1-PLC.pdf`, CM1_SP_POS: `${C}/CM1-PLC.pdf`,
  CM1_COMM_SERIAL: `${C}/CM1-PLC.pdf`, CM1_COMM_ETH: `${C}/CM1-PLC.pdf`,
  CM1_COMM_OPC: `${C}/CM1-PLC.pdf`, CM1_COMM_DNP: `${C}/CM1-PLC.pdf`,
  CM1_COMM_BAC: `${C}/CM1-PLC.pdf`, CM1_COMM_CDMA: `${C}/CM1-PLC.pdf`,
  CM1_COMM_CNET: `${C}/CM1-PLC.pdf`, CM1_COMM_ECAT: `${C}/CM1-PLC.pdf`,
  CM1_RED_COMM: `${C}/CM1-PLC.pdf`, CM1_RED_MMI: `${C}/CM1-PLC.pdf`,
  CM1_RED_EXT: `${C}/CM1-PLC.pdf`, CM1_RED_BASE: `${C}/CM1-PLC.pdf`,
  CM1_RED_PWR: `${C}/CM1-PLC.pdf`, CM1_ACC: `${C}/CM1-PLC.pdf`,
  CM1_EXT_MOD: `${C}/CM1-PLC.pdf`,
  // CM3 PLC-S
  CM3_CPU_SLIM: `${C}/CM3-PLCS.pdf`, CM3_CPU_BRICK: `${C}/CM3-PLCS.pdf`, CM3_CPU_SPLUS: `${C}/CM3-PLCS.pdf`,
  CM3_DI: `${C}/CM3-PLCS.pdf`, CM3_DO: `${C}/CM3-PLCS.pdf`,
  CM3_DIO: `${C}/CM3-PLCS.pdf`, CM3_DO_PWM: `${C}/CM3-PLCS.pdf`,
  CM3_AI: `${C}/CM3-PLCS.pdf`, CM3_AO: `${C}/CM3-PLCS.pdf`,
  CM3_AIO: `${C}/CM3-PLCS.pdf`, CM3_AI_MUX: `${C}/CM3-PLCS.pdf`,
  CM3_TEMP_RTD: `${C}/CM3-PLCS.pdf`, CM3_TEMP_TC: `${C}/CM3-PLCS.pdf`,
  CM3_COMM_ETH: `${C}/CM3-PLCS.pdf`, CM3_COMM_OPC: `${C}/CM3-PLCS.pdf`,
  CM3_COMM_SERIAL: `${C}/CM3-PLCS.pdf`, CM3_COMM_CDMA: `${C}/CM3-PLCS.pdf`,
  CM3_SP_HSC: `${C}/CM3-PLCS.pdf`, CM3_SP_POS: `${C}/CM3-PLCS.pdf`,
  CM3_PWR: `${C}/CM3-PLCS.pdf`, CM3_ACC: `${C}/CM3-PLCS.pdf`,
  // IPC
  PANEL: `${C}/IPC.pdf`, MONITOR: `${C}/IPC.pdf`, BOX: `${C}/IPC.pdf`,
  // SCADA
  SCADA_STD: `${C}/SCADA.pdf`, SCADA_PRO: `${C}/SCADA-PRO.pdf`,
  // XPANEL
  XPANEL_HMI: `${C}/XPANEL.pdf`, HYBRID_XP: `${C}/XPANEL.pdf`,
};

// ── 메뉴얼 ───────────────────────────────────────────────────
const MANUAL_MAP: Record<string, DocEntry[]> = {
  // ── CM1 CPU ──
  CM1_CPU_UP:    [{ label: 'CPU(UP)', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1 CPU(UP)_v1.0_BCP24480.pdf` }],
  CM1_CPU_XP:    [{ label: 'CPU(XP)', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1 CPU(XP)_v1.0_BCP24479.pdf` }],
  CM1_CPU_CP:    [{ label: 'CPU(CP)', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1 CPU(CP)_v1.0_BCP24478.pdf` }],
  CM1_CPU_XP_RED:[{ label: 'CPU 이중화', labelEn: 'CPU Redundancy', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_Redundancy_v1.0_CPU_BCP65473.pdf` }],
  // ── CM1 전원/베이스 ──
  CM1_PWR:       [{ label: '전원 모듈', labelEn: 'Power Module', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_Power_BCP65470_v1.0_20250602.pdf` }],
  CM1_RED_PWR:   [{ label: '이중화', labelEn: 'Redundancy', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_Redundancy_v1.0_BCP65472_20250617.pdf` }],
  CM1_BASE:      [{ label: '베이스', labelEn: 'Base', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_BASE_v1.0_BCP65457.pdf` }],
  CM1_RED_BASE:  [{ label: '베이스', labelEn: 'Base', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_BASE_v1.0_BCP65457.pdf` }],
  // CM1_ACC: 별도 메뉴얼 없음
  // ── CM1 I/O ──
  CM1_DI:  [{ label: 'DI', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_DI_v1.0_BCP65477.pdf` }],
  CM1_DIO: [{ label: 'DIO', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_DIO_v1.0_BCP65460.pdf` }],
  CM1_DO: [
    { label: 'DO (YT16E/F·YR16A/E)', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_DO(YT16E&F,YR16A&E)_v1.0_BCP65461.pdf` },
    { label: 'DO (YT32E/F·64E)',      url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_DO(YT32E&F,64E)_v1.0_BCP65462.pdf` },
  ],
  // ── CM1 아날로그 ──
  CM1_AI: [
    { label: 'AD(04VI·08V·08I)', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_AD(04VI&08V&08I)_v1.0_BCP65454.pdf` },
    { label: 'AD(04W)',           url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_AD(04W)_v1.0_BCP65455.pdf` },
    { label: 'AD(08VI·16VI)',     url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_AD(08VI&16VI)_v1.0_BCP65456.pdf` },
  ],
  CM1_AO: [{ label: 'DA 아날로그 출력', labelEn: 'DA Analog Output', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_DA_v1.0_BCP65458.pdf` }],
  // ── CM1 온도 ──
  CM1_TEMP_RTD: [{ label: 'RTD', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_RTD_v1.0_BCP65474.pdf` }],
  CM1_TEMP_TC:  [{ label: 'TC 열전대', labelEn: 'TC Thermocouple', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_TC_v1.0_BCP65475.pdf` }],
  CM1_TEMP_TH:  [{ label: 'Thermistor', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_Thermistor_v1.0_BCP65476.pdf` }],
  // ── CM1 통신 ──
  CM1_COMM_ETH:    [{ label: 'Ethernet', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1 Ethernet_v1.0_BCP24481.pdf` }],
  CM1_COMM_ECAT:   [{ label: 'EtherCAT', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_EtherCAT_v1.0_BCP65463.pdf` }],
  CM1_COMM_OPC:    [{ label: 'OPC Server', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_OPC_Server_v1.0_BCP65468.pdf` }],
  CM1_COMM_SERIAL: [{ label: '시리얼', labelEn: 'Serial', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1 Serial_v1.0_BCP24482.pdf` }],
  CM1_COMM_DNP:    [{ label: '시리얼', labelEn: 'Serial', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1 Serial_v1.0_BCP24482.pdf` }],
  CM1_COMM_BAC:    [{ label: '시리얼', labelEn: 'Serial', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1 Serial_v1.0_BCP24482.pdf` }],
  CM1_COMM_CDMA:   [{ label: '시리얼', labelEn: 'Serial', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1 Serial_v1.0_BCP24482.pdf` }],
  CM1_COMM_CNET:   [{ label: '시리얼', labelEn: 'Serial', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1 Serial_v1.0_BCP24482.pdf` }],
  // ── CM1 특수 ──
  CM1_SP_HSC: [
    { label: 'HS02C·F', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_HS02C&F_v1.0_BCP65465.pdf` },
    { label: 'HS02E·E-24', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_HS02E&E-24_v1.0_BCP65466.pdf` },
  ],
  CM1_SP_LC:  [{ label: 'Load Cell', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_LoadCell_v1.0_BCP65467.pdf` }],
  CM1_SP_DL:  [{ label: 'Data Logger', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_DataLogger_v1.0_BCP65459.pdf` }],
  CM1_SP_POS: [{ label: '위치결정', labelEn: 'Positioning', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_Positioning_v1.0_BCP65469.pdf` }],
  // ── CM1 이중화 ──
  CM1_RED_COMM: [{ label: '이중화', labelEn: 'Redundancy', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_Redundancy_v1.0_BCP65472_20250617.pdf` }],
  CM1_RED_EXT:  [{ label: '이중화', labelEn: 'Redundancy', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_Redundancy_v1.0_BCP65472_20250617.pdf` }],
  CM1_RED_MMI:  [{ label: '이중화', labelEn: 'Redundancy', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_Redundancy_v1.0_BCP65472_20250617.pdf` }],
  // ── CM1 증설모듈 ──
  CM1_EXT_MOD:  [{ label: '증설 모듈', labelEn: 'Extension Module', url: `${M1}/간소화매뉴얼(설명서)(국영)CM1_Expansion_v1.0_BCP65464.pdf` }],

  // ── CM3 CPU ──
  CM3_CPU_SLIM: [
    { label: 'CPU 16pt', url: `${M3}/CPU/간소화매뉴얼(설명서)(국영)CM3 CPU 16pt_BCP24439_20250523.pdf` },
    { label: 'CPU 32pt', url: `${M3}/CPU/간소화매뉴얼(설명서)(국영)CM3 CPU 32pt_BCP24440_20251224.pdf` },
  ],
  CM3_CPU_BRICK: [
    { label: 'Brick 16pt', url: `${M3}/Brick Type CPU/간소화매뉴얼(설명서)(국영)CM3 BrickType CPU 16pt_v1.0_BCP24437.pdf` },
    { label: 'Brick 32pt', url: `${M3}/Brick Type CPU/간소화매뉴얼(설명서)(국영)CM3 BrickType CPU 32pt_BCP24438.pdf` },
  ],
  CM3_CPU_SPLUS: [
    { label: 'SPLUS 16pt', url: `${M3}/CPU/간소화매뉴얼(설명서)(국영)CM3 SPLUS CPU 16pt_BXP40156_20241127.pdf` },
    { label: 'SPLUS 32pt', url: `${M3}/CPU/간소화매뉴얼(설명서)(국영)CM3 SPLUS CPU 32pt_BXP40223_20260114.pdf` },
  ],
  // ── CM3 I/O ──
  CM3_DI:     [{ label: 'DI', url: `${M3}/DI, DO, DIO, PWM/간소화매뉴얼(설명서)(국영)CM3 DI_BCP24441.pdf` }],
  CM3_DO:     [{ label: 'DO', url: `${M3}/DI, DO, DIO, PWM/간소화매뉴얼(설명서)(국영)CM3 DO_BCP24443_20260319.pdf` }],
  CM3_DIO:    [{ label: 'DIO', url: `${M3}/DI, DO, DIO, PWM/간소화매뉴얼(설명서)(국영)CM3 DIO_BCP24442_20250602.pdf` }],
  CM3_DO_PWM: [{ label: 'PWM', url: `${M3}/DI, DO, DIO, PWM/간소화매뉴얼(설명서)(국영)CM3 PWM_BCP24444.pdf` }],
  // ── CM3 아날로그 ──
  CM3_AI:     [{ label: 'Analog Input', url: `${M3}/Analog/간소화매뉴얼(설명서)(국영)CM3 Analog Input_BCP24433.pdf` }],
  CM3_AO:     [{ label: 'Analog Output', url: `${M3}/Analog/간소화매뉴얼(설명서)(국영)CM3 Analog Output_BCP24436_20240717.pdf` }],
  CM3_AIO:    [{ label: 'Analog I/O', url: `${M3}/Analog/간소화매뉴얼(설명서)(국영)CM3 Analog IO_BCP24434.pdf` }],
  CM3_AI_MUX: [{ label: 'Analog MUX', url: `${M3}/Analog/간소화매뉴얼(설명서)(국영)CM3 Analog MUX_BCP24435.pdf` }],
  // ── CM3 온도 ──
  CM3_TEMP_RTD: [{ label: 'RTD', url: `${M3}/RTD_TC/간소화매뉴얼(설명서)(국영)CM3 RTD_BCP24447_20250821.pdf` }],
  CM3_TEMP_TC:  [{ label: 'TC 열전대', labelEn: 'TC Thermocouple', url: `${M3}/RTD_TC/간소화매뉴얼(설명서)(국영)CM3 TC_BCP24448.pdf` }],
  // ── CM3 통신 ──
  CM3_COMM_ETH:    [{ label: 'Ethernet', url: `${M3}/Ethernet/간소화매뉴얼(설명서)(국영)CM3 Ethernet_BCP24445.pdf` }],
  CM3_COMM_OPC:    [{ label: 'SPRO (OPC)', url: `${M3}/SPRO/간소화매뉴얼(설명서)(국영)CM3 SPRO_BCP24450.pdf` }],
  CM3_COMM_SERIAL: [{ label: '시리얼', labelEn: 'Serial', url: `${M3}/Serial/간소화매뉴얼(설명서)(국영)CM3 Serial_BCP24449_20260319.pdf` }],
  CM3_COMM_CDMA:   [{ label: '시리얼', labelEn: 'Serial', url: `${M3}/Serial/간소화매뉴얼(설명서)(국영)CM3 Serial_BCP24449_20260319.pdf` }],
  // ── CM3 특수 ──
  CM3_SP_HSC: [
    { label: 'HSC (오픈컬렉터)', labelEn: 'HSC (Open Collector)', url: `${M3}/HSC/간소화매뉴얼(설명서)(국영)CM3 HSC_BCP24446.pdf` },
    { label: 'HSCP (라인드라이브)', labelEn: 'HSCP (Line Drive)', url: `${M3}/HSC/간소화매뉴얼(설명서)(국영)CM3 HSCP_BCP65493.pdf` },
  ],
  CM3_SP_POS: [{ label: '위치결정', labelEn: 'Positioning', url: `${M3}/위치결정/간소화매뉴얼(설명서)(국영)CM3 SP02POS_BCP65441_20250305.pdf` }],
  // ── IPC ──
  PANEL: [
    { label: 'iNT 500 Series',                   url: `${MI}/터치패널_iNP_iNT 500 series(국영)_ver1.1_20250307.pdf` },
    { label: 'iNT PC5000 Series',                  url: `${MI}/iNP_iNT PC5000 series(국영)_ver1.8_BTC30049_20251118.pdf` },
    { label: 'iNT 50000W·70000W Wide Series',     url: `${MI}/터치패널_iNP_iNT_50000W_70000W_series(kr_en)_ver0.4_20250725.pdf` },
  ],
  BOX: [
    { label: 'CM-NB200-D',              url: `${MI}/Box PC CM-NB200-D(kr_en)ver1.3_20231127.pdf` },
    { label: 'CM-NB3011·NB5011·NB7011', url: `${MI}/Box PC CM-NB3011_NB5011_NB7011-D(kr_en)ver1.7_20240125.pdf` },
  ],
  MONITOR: [{ label: 'Touch Monitor (CM-IM)', url: `${MI}/터치모니터 CM-IM-121521W-RCH-D v1.0_BIC52001.pdf` }],
  // ── XPANEL ──
  XPANEL_HMI: [
    { label: 'XT07',        url: `${MX}/CM-XT07CD-DE,DN Manual KOR ENG_BXP40097.pdf` },
    { label: 'XT10·iXT10',  url: `${MX}/CM-XT,iXT10CD-DA Manual KOR ENG_BXP40098.pdf` },
    { label: 'iXT12',       url: `${MX}/CM-iXT12CD-A Manual KOR ENG_BXP40100.pdf` },
    { label: 'iXT15',       url: `${MX}/CM-iXT15CD-A Manual KOR ENG_BXP40099.pdf` },
    { label: 'eXT2 (7·10·12·15인치)', labelEn: 'eXT2 (7·10·12·15-inch)', url: `${MX}/CM-eXT2 국영-101215_BXP30226_20241114.pdf` },
    { label: 'eXT2 Wide',   url: `${MX}/CM-eXT2 wide_Simplified_Finalized_BXP30225_20251126.pdf` },
  ],
};

// ── 도면 ─────────────────────────────────────────────────────
const DRAWING_MAP: Record<string, DocEntry[]> = {
  // ── CM1 ──
  CM1_CPU_UP:    [{ label: 'CPU 모듈', labelEn: 'CPU Module', url: `${D1}/CPU-모듈.zip` }],
  CM1_CPU_XP:    [{ label: 'CPU 모듈', labelEn: 'CPU Module', url: `${D1}/CPU-모듈.zip` }],
  CM1_CPU_CP:    [{ label: 'CPU 모듈', labelEn: 'CPU Module', url: `${D1}/CPU-모듈.zip` }],
  CM1_CPU_XP_RED:[{ label: 'CPU 모듈', labelEn: 'CPU Module', url: `${D1}/CPU-모듈.zip` }, { label: '이중화 전용', labelEn: 'Redundancy', url: `${D1}/이중화-전용.zip` }],
  CM1_PWR:       [{ label: '전원 모듈', labelEn: 'Power Module', url: `${D1}/전원-모듈.zip` }],
  CM1_RED_PWR:   [{ label: '전원 모듈', labelEn: 'Power Module', url: `${D1}/전원-모듈.zip` }, { label: '이중화 전용', labelEn: 'Redundancy', url: `${D1}/이중화-전용.zip` }],
  CM1_BASE:      [{ label: '베이스 모듈', labelEn: 'Base Module', url: `${D1}/베이스-모듈.zip` }],
  CM1_RED_BASE:  [{ label: '베이스 모듈', labelEn: 'Base Module', url: `${D1}/베이스-모듈.zip` }, { label: '이중화 전용', labelEn: 'Redundancy', url: `${D1}/이중화-전용.zip` }],
  CM1_DI:        [{ label: 'Digital I/O 모듈', labelEn: 'Digital I/O Module', url: `${D1}/IO-Digital-모듈.zip` }],
  CM1_DO:        [{ label: 'Digital I/O 모듈', labelEn: 'Digital I/O Module', url: `${D1}/IO-Digital-모듈.zip` }],
  CM1_DIO:       [{ label: 'Digital I/O 모듈', labelEn: 'Digital I/O Module', url: `${D1}/IO-Digital-모듈.zip` }],
  CM1_AI:        [{ label: 'Analog I/O 모듈', labelEn: 'Analog I/O Module', url: `${D1}/IO-Analog-모듈.zip` }],
  CM1_AO:        [{ label: 'Analog I/O 모듈', labelEn: 'Analog I/O Module', url: `${D1}/IO-Analog-모듈.zip` }],
  CM1_TEMP_RTD:  [{ label: 'Analog I/O 모듈', labelEn: 'Analog I/O Module', url: `${D1}/IO-Analog-모듈.zip` }],
  CM1_TEMP_TC:   [{ label: 'Analog I/O 모듈', labelEn: 'Analog I/O Module', url: `${D1}/IO-Analog-모듈.zip` }],
  CM1_TEMP_TH:   [{ label: 'Analog I/O 모듈', labelEn: 'Analog I/O Module', url: `${D1}/IO-Analog-모듈.zip` }],
  CM1_SP_HSC:    [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_SP_LC:     [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_SP_DL:     [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_SP_POS:    [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_COMM_SERIAL: [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_COMM_ETH:    [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_COMM_OPC:    [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_COMM_DNP:    [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_COMM_BAC:    [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_COMM_CDMA:   [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_COMM_CNET:   [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_COMM_ECAT:   [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D1}/특수-모듈.zip` }],
  CM1_RED_COMM:  [{ label: '이중화 전용', labelEn: 'Redundancy', url: `${D1}/이중화-전용.zip` }],
  CM1_RED_MMI:   [{ label: '이중화 전용', labelEn: 'Redundancy', url: `${D1}/이중화-전용.zip` }],
  CM1_RED_EXT:   [{ label: '이중화 전용', labelEn: 'Redundancy', url: `${D1}/이중화-전용.zip` }],
  CM1_EXT_MOD:   [{ label: '이중화 전용', labelEn: 'Redundancy', url: `${D1}/이중화-전용.zip` }],
  CM1_ACC:       [{ label: '악세서리', labelEn: 'Accessory', url: `${D1}/Accessary.zip` }],
  // ── CM3 ──
  CM3_CPU_SLIM:    [{ label: 'CPU 블록', labelEn: 'CPU Block', url: `${D3}/CPU-Main-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_CPU_BRICK:   [{ label: 'CPU 블록', labelEn: 'CPU Block', url: `${D3}/CPU-Main-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_CPU_SPLUS:   [{ label: 'CPU 블록', labelEn: 'CPU Block', url: `${D3}/CPU-Main-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_DI:          [{ label: '디지털 증설 블록', labelEn: 'Digital Extension Block', url: `${D3}/Digital-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_DO:          [{ label: '디지털 증설 블록', labelEn: 'Digital Extension Block', url: `${D3}/Digital-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_DIO:         [{ label: '디지털 증설 블록', labelEn: 'Digital Extension Block', url: `${D3}/Digital-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_DO_PWM:      [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D3}/특수-모듈.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_AI:          [{ label: '아날로그 증설 블록', labelEn: 'Analog Extension Block', url: `${D3}/Analog-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_AO:          [{ label: '아날로그 증설 블록', labelEn: 'Analog Extension Block', url: `${D3}/Analog-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_AIO:         [{ label: '아날로그 증설 블록', labelEn: 'Analog Extension Block', url: `${D3}/Analog-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_AI_MUX:      [{ label: '아날로그 증설 블록', labelEn: 'Analog Extension Block', url: `${D3}/Analog-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_TEMP_RTD:    [{ label: '아날로그 증설 블록', labelEn: 'Analog Extension Block', url: `${D3}/Analog-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_TEMP_TC:     [{ label: '아날로그 증설 블록', labelEn: 'Analog Extension Block', url: `${D3}/Analog-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_COMM_ETH:    [{ label: '통신 증설 블록', labelEn: 'Communication Extension Block', url: `${D3}/통신-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_COMM_OPC:    [{ label: '통신 증설 블록', labelEn: 'Communication Extension Block', url: `${D3}/통신-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_COMM_SERIAL: [{ label: '통신 증설 블록', labelEn: 'Communication Extension Block', url: `${D3}/통신-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_COMM_CDMA:   [{ label: '통신 증설 블록', labelEn: 'Communication Extension Block', url: `${D3}/통신-증설-Block.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_SP_HSC:      [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D3}/특수-모듈.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_SP_POS:      [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D3}/특수-모듈.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  CM3_PWR:         [{ label: '특수 모듈', labelEn: 'Special Module', url: `${D3}/특수-모듈.zip` }, { label: '단자대', labelEn: 'Terminal Block', url: `${D3}/단자대.zip` }],
  // ── IPC ──
  BOX: [
    { label: 'BOX PC (NB200-D)',        url: `${DI}/BOX PC Series_CM-NB200-D-1.zip` },
    { label: 'BOX PC (NB5011·NB7011)', url: `${DI}/BOX PC Series_CM-CM-NB5011-D-CM-NB7011-D.zip` },
  ],
  MONITOR: [{ label: 'Touch Monitor (IM15W)', url: `${DI}/TOUCH Monitor series_CM-IM15W-D.zip` }],
  PANEL: [
    { label: 'IPC 500 (10.4인치)', labelEn: 'IPC 500 (10.4-inch)', url: `${DI}/IPC500Series_10.4inch-1.zip` },
    { label: 'IPC 500 (12인치)',   labelEn: 'IPC 500 (12-inch)',   url: `${DI}/IPC500Series_12inch.zip` },
    { label: 'IPC 500 (15인치)',   labelEn: 'IPC 500 (15-inch)',   url: `${DI}/IPC500Series_15inch.zip` },
    { label: 'IPC 500 (19인치)',   labelEn: 'IPC 500 (19-inch)',   url: `${DI}/IPC500Series_19inch.zip` },
    { label: 'IPC 3000·5000 (12인치)', labelEn: 'IPC 3000·5000 (12-inch)', url: `${DI}/IPC_3000 & 5000 Series_12inch-2.zip` },
    { label: 'IPC 3000·5000 (15인치)', labelEn: 'IPC 3000·5000 (15-inch)', url: `${DI}/IPC_3000 & 5000 Series_15inch.zip` },
    { label: 'IPC 3000·5000 (19인치)', labelEn: 'IPC 3000·5000 (19-inch)', url: `${DI}/IPC_3000 & 5000 Series_19inch-1.zip` },
    { label: 'IPC 50000 & 70000 Wide (15인치)',   labelEn: 'IPC 50000 & 70000 Wide (15-inch)',   url: `${DI}/IPC_50000W & 70000W Series_15inch-Wide.zip` },
    { label: 'IPC 50000 & 70000 Wide (21.5인치)', labelEn: 'IPC 50000 & 70000 Wide (21.5-inch)', url: `${DI}/IPC_50000W & 70000W Series_21.5inch-Wide.zip` },
  ],
  // ── XPANEL ──
  XPANEL_HMI: [
    { label: 'eXT2-07-R-DE', url: `${DX}/CM-eXT2-07-R-DE.zip` },
    { label: 'eXT2-07-R-DF', url: `${DX}/CM-eXT2-07-R-DF.zip` },
    { label: 'eXT2 10인치',  labelEn: 'eXT2 10-inch', url: `${DX}/eXT2_10inch.zip` },
    { label: 'eXT2 12인치',  labelEn: 'eXT2 12-inch', url: `${DX}/eXT2_12inch.zip` },
    { label: 'eXT2 15인치',  labelEn: 'eXT2 15-inch', url: `${DX}/eXT2_15inch.zip` },
  ],
  HYBRID_XP: [{ label: 'Hybrid 7인치', labelEn: 'Hybrid 7-inch', url: `${DX}/XPANEL_Hybrid Series_7inch-1.zip` }],
};

// ── 공개 함수 ─────────────────────────────────────────────────
export function getCatalogUrl(subType: string): string | null {
  return CATALOG_MAP[subType] ?? null;
}

export function getManualEntries(subType: string): DocEntry[] {
  return MANUAL_MAP[subType] ?? [];
}

export function getDrawingEntries(subType: string): DocEntry[] {
  return DRAWING_MAP[subType] ?? [];
}
