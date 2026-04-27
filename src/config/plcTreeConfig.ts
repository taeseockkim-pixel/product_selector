import type { PlcSeriesId } from '../types';

export interface PlcTreeLeaf {
  id: string;   // = subType value used for filtering
  label: string;
}

export interface PlcTreeGroup {
  id: string;
  label: string;
  children: PlcTreeLeaf[];
}

const CM1_TREE: PlcTreeGroup[] = [
  {
    id: 'cpu', label: 'CPU 모듈',
    children: [
      { id: 'CM1_CPU_UP',     label: 'UP Series' },
      { id: 'CM1_CPU_XP',     label: 'XP Series' },
      { id: 'CM1_CPU_XP_RED', label: 'XP 이중화' },
      { id: 'CM1_CPU_CP',     label: 'CP Series' },
    ],
  },
  {
    id: 'power', label: '전원 모듈',
    children: [
      { id: 'CM1_PWR', label: '전원공급' },
    ],
  },
  {
    id: 'base', label: '베이스',
    children: [
      { id: 'CM1_BASE', label: '베이스' },
    ],
  },
  {
    id: 'dio', label: '디지털 I/O',
    children: [
      { id: 'CM1_DI',  label: '입력' },
      { id: 'CM1_DO',  label: '출력' },
      { id: 'CM1_DIO', label: '입출력 혼합' },
    ],
  },
  {
    id: 'analog', label: '아날로그',
    children: [
      { id: 'CM1_AI', label: '입력' },
      { id: 'CM1_AO', label: '출력' },
    ],
  },
  {
    id: 'temp', label: '온도 계측',
    children: [
      { id: 'CM1_TEMP_RTD',  label: 'RTD' },
      { id: 'CM1_TEMP_TC',   label: 'TC (열전대)' },
      { id: 'CM1_TEMP_TH',   label: '써미스터' },
    ],
  },
  {
    id: 'special', label: '특수 모듈',
    children: [
      { id: 'CM1_SP_HSC', label: '고속카운터' },
      { id: 'CM1_SP_LC',  label: 'Loadcell' },
      { id: 'CM1_SP_DL',  label: 'Data Logger' },
      { id: 'CM1_SP_POS', label: '위치결정' },
    ],
  },
  {
    id: 'comm', label: '통신 모듈',
    children: [
      { id: 'CM1_COMM_SERIAL', label: '시리얼' },
      { id: 'CM1_COMM_ETH',    label: '이더넷' },
      { id: 'CM1_COMM_OPC',    label: 'OPC UA' },
      { id: 'CM1_COMM_DNP',    label: 'DNP3.0' },
      { id: 'CM1_COMM_BAC',    label: 'BACnet' },
      { id: 'CM1_COMM_CDMA',   label: 'CDMA' },
      { id: 'CM1_COMM_CNET',   label: 'CIMON-NET RIO' },
      { id: 'CM1_COMM_ECAT',   label: 'EtherCAT' },
    ],
  },
  {
    id: 'redundancy', label: '이중화',
    children: [
      { id: 'CM1_RED_COMM', label: '이중화 통신' },
      { id: 'CM1_RED_MMI',  label: '이중화 MMI' },
      { id: 'CM1_RED_EXT',  label: '이중화 증설' },
      { id: 'CM1_RED_BASE', label: '이중화 베이스' },
      { id: 'CM1_RED_PWR',  label: '이중화 전원' },
    ],
  },
  {
    id: 'acc', label: '액세서리',
    children: [
      { id: 'CM1_ACC', label: '액세서리' },
    ],
  },
];

const CM3_TREE: PlcTreeGroup[] = [
  {
    id: 'cpu', label: 'CPU',
    children: [
      { id: 'CM3_CPU_BRICK', label: 'Block Type' },
      { id: 'CM3_CPU_SLIM',  label: 'Slim Type' },
      { id: 'CM3_CPU_SPLUS', label: '고속 CPU (SPLUS)' },
    ],
  },
  {
    id: 'dio', label: '디지털 I/O',
    children: [
      { id: 'CM3_DI',     label: '입력' },
      { id: 'CM3_DO',     label: '출력' },
      { id: 'CM3_DIO',    label: '입출력 혼합' },
      { id: 'CM3_DO_PWM', label: 'PWM 출력' },
    ],
  },
  {
    id: 'analog', label: '아날로그',
    children: [
      { id: 'CM3_AI',     label: '입력' },
      { id: 'CM3_AO',     label: '출력' },
      { id: 'CM3_AIO',    label: '입출력 혼합' },
      { id: 'CM3_AI_MUX', label: '4×1 MUX' },
    ],
  },
  {
    id: 'temp', label: '온도계측',
    children: [
      { id: 'CM3_TEMP_RTD', label: 'RTD' },
      { id: 'CM3_TEMP_TC',  label: 'TC (열전대)' },
    ],
  },
  {
    id: 'comm', label: '통신모듈',
    children: [
      { id: 'CM3_COMM_ETH',    label: 'Ethernet' },
      { id: 'CM3_COMM_OPC',    label: 'OPC UA' },
      { id: 'CM3_COMM_SERIAL', label: '시리얼' },
      { id: 'CM3_COMM_CDMA',   label: 'CDMA' },
    ],
  },
  {
    id: 'special', label: '특수모듈',
    children: [
      { id: 'CM3_SP_HSC', label: '고속카운터' },
      { id: 'CM3_SP_POS', label: '위치결정' },
    ],
  },
  {
    id: 'power', label: '전원 공급 모듈',
    children: [
      { id: 'CM3_PWR', label: '전원공급' },
    ],
  },
  {
    id: 'acc', label: '액세서리',
    children: [
      { id: 'CM3_ACC', label: '액세서리' },
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
