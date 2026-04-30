import type { PlcSeriesId } from '../types';

export interface PlcTreeLeaf {
  id: string;
  label: string;
  labelEn?: string;
}

export interface PlcTreeGroup {
  id: string;
  label: string;
  labelEn?: string;
  children: PlcTreeLeaf[];
}

const CM1_TREE: PlcTreeGroup[] = [
  {
    id: 'cpu', label: 'CPU 모듈', labelEn: 'CPU Module',
    children: [
      { id: 'CM1_CPU_UP',     label: 'UP Series' },
      { id: 'CM1_CPU_XP',     label: 'XP Series' },
      { id: 'CM1_CPU_XP_RED', label: 'XP 이중화', labelEn: 'XP Redundancy' },
      { id: 'CM1_CPU_CP',     label: 'CP Series' },
    ],
  },
  {
    id: 'power', label: '전원 모듈', labelEn: 'Power Module',
    children: [
      { id: 'CM1_PWR', label: '전원공급', labelEn: 'Power Supply' },
    ],
  },
  {
    id: 'base', label: '베이스', labelEn: 'Base',
    children: [
      { id: 'CM1_BASE', label: '베이스', labelEn: 'Base' },
    ],
  },
  {
    id: 'dio', label: '디지털 I/O', labelEn: 'Digital I/O',
    children: [
      { id: 'CM1_DI',  label: '입력', labelEn: 'Input' },
      { id: 'CM1_DO',  label: '출력', labelEn: 'Output' },
      { id: 'CM1_DIO', label: '입출력 혼합', labelEn: 'Mixed I/O' },
    ],
  },
  {
    id: 'analog', label: '아날로그', labelEn: 'Analog',
    children: [
      { id: 'CM1_AI', label: '입력', labelEn: 'Input' },
      { id: 'CM1_AO', label: '출력', labelEn: 'Output' },
    ],
  },
  {
    id: 'temp', label: '온도 계측', labelEn: 'Temperature',
    children: [
      { id: 'CM1_TEMP_RTD',  label: 'RTD' },
      { id: 'CM1_TEMP_TC',   label: 'TC (열전대)', labelEn: 'TC (Thermocouple)' },
      { id: 'CM1_TEMP_TH',   label: '써미스터', labelEn: 'Thermistor' },
    ],
  },
  {
    id: 'special', label: '특수 모듈', labelEn: 'Special Module',
    children: [
      { id: 'CM1_SP_HSC', label: '고속카운터', labelEn: 'High-Speed Counter' },
      { id: 'CM1_SP_LC',  label: 'Loadcell' },
      { id: 'CM1_SP_DL',  label: 'Data Logger' },
      { id: 'CM1_SP_POS', label: '위치결정', labelEn: 'Positioning' },
    ],
  },
  {
    id: 'comm', label: '통신 모듈', labelEn: 'Communication Module',
    children: [
      { id: 'CM1_COMM_SERIAL', label: '시리얼', labelEn: 'Serial' },
      { id: 'CM1_COMM_ETH',    label: '이더넷', labelEn: 'Ethernet' },
      { id: 'CM1_COMM_OPC',    label: 'OPC UA' },
      { id: 'CM1_COMM_DNP',    label: 'DNP3.0' },
      { id: 'CM1_COMM_BAC',    label: 'BACnet' },
      { id: 'CM1_COMM_CDMA',   label: 'CDMA' },
      { id: 'CM1_COMM_CNET',   label: 'CIMON-NET RIO' },
      { id: 'CM1_COMM_ECAT',   label: 'EtherCAT' },
    ],
  },
  {
    id: 'redundancy', label: '이중화', labelEn: 'Redundancy',
    children: [
      { id: 'CM1_RED_COMM', label: '이중화 통신', labelEn: 'Redundancy Comm.' },
      { id: 'CM1_RED_MMI',  label: '이중화 MMI', labelEn: 'Redundancy MMI' },
      { id: 'CM1_RED_EXT',  label: '이중화 증설', labelEn: 'Redundancy Extension' },
      { id: 'CM1_RED_BASE', label: '이중화 베이스', labelEn: 'Redundancy Base' },
      { id: 'CM1_RED_PWR',  label: '이중화 전원', labelEn: 'Redundancy Power' },
    ],
  },
  {
    id: 'acc', label: '액세서리', labelEn: 'Accessories',
    children: [
      { id: 'CM1_ACC', label: '액세서리', labelEn: 'Accessories' },
    ],
  },
];

const CM3_TREE: PlcTreeGroup[] = [
  {
    id: 'cpu', label: 'CPU', labelEn: 'CPU',
    children: [
      { id: 'CM3_CPU_BRICK', label: 'Block Type' },
      { id: 'CM3_CPU_SLIM',  label: 'Slim Type' },
      { id: 'CM3_CPU_SPLUS', label: '고속 CPU (SPLUS)', labelEn: 'High-Speed CPU (SPLUS)' },
    ],
  },
  {
    id: 'dio', label: '디지털 I/O', labelEn: 'Digital I/O',
    children: [
      { id: 'CM3_DI',     label: '입력', labelEn: 'Input' },
      { id: 'CM3_DO',     label: '출력', labelEn: 'Output' },
      { id: 'CM3_DIO',    label: '입출력 혼합', labelEn: 'Mixed I/O' },
      { id: 'CM3_DO_PWM', label: 'PWM 출력', labelEn: 'PWM Output' },
    ],
  },
  {
    id: 'analog', label: '아날로그', labelEn: 'Analog',
    children: [
      { id: 'CM3_AI',     label: '입력', labelEn: 'Input' },
      { id: 'CM3_AO',     label: '출력', labelEn: 'Output' },
      { id: 'CM3_AIO',    label: '입출력 혼합', labelEn: 'Mixed I/O' },
      { id: 'CM3_AI_MUX', label: '4×1 MUX' },
    ],
  },
  {
    id: 'temp', label: '온도계측', labelEn: 'Temperature',
    children: [
      { id: 'CM3_TEMP_RTD', label: 'RTD' },
      { id: 'CM3_TEMP_TC',  label: 'TC (열전대)', labelEn: 'TC (Thermocouple)' },
    ],
  },
  {
    id: 'comm', label: '통신모듈', labelEn: 'Comm. Module',
    children: [
      { id: 'CM3_COMM_ETH',    label: 'Ethernet' },
      { id: 'CM3_COMM_OPC',    label: 'OPC UA' },
      { id: 'CM3_COMM_SERIAL', label: '시리얼', labelEn: 'Serial' },
      { id: 'CM3_COMM_CDMA',   label: 'CDMA' },
    ],
  },
  {
    id: 'special', label: '특수모듈', labelEn: 'Special Module',
    children: [
      { id: 'CM3_SP_HSC', label: '고속카운터', labelEn: 'High-Speed Counter' },
      { id: 'CM3_SP_POS', label: '위치결정', labelEn: 'Positioning' },
    ],
  },
  {
    id: 'power', label: '전원 공급 모듈', labelEn: 'Power Supply Module',
    children: [
      { id: 'CM3_PWR', label: '전원공급', labelEn: 'Power Supply' },
    ],
  },
  {
    id: 'acc', label: '액세서리', labelEn: 'Accessories',
    children: [
      { id: 'CM3_ACC', label: '액세서리', labelEn: 'Accessories' },
    ],
  },
];

export const PLC_TREE: Record<PlcSeriesId, PlcTreeGroup[]> = {
  CM1: CM1_TREE,
  CM3: CM3_TREE,
};

export function getDefaultSubType(series: PlcSeriesId): string {
  return PLC_TREE[series][0]?.children[0]?.id ?? '';
}
