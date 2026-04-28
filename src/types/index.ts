export type CategoryId = 'PLC' | 'IPC' | 'SCADA' | 'XPANEL';
export type PlcSeriesId = 'CM1' | 'CM3';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

export interface SpecItem {
  label: string;
  value: string;
  /**
   * 'catalog'  : 공식 카탈로그에서 직접 확인된 값 → UI에 표시
   * 'estimated': AI 추정 또는 미검증 값       → UI에 표시 안 함
   * 'user'     : 관리자가 수정/추가한 값       → UI에 표시 + "수정됨" 배지
   * 미지정      : 'catalog' 과 동일하게 취급
   */
  source?: 'catalog' | 'estimated' | 'user';
}

export interface Product {
  id: string;
  modelName: string;
  category: CategoryId;
  series: string;
  seriesLabel: string;
  description: string;
  specs: SpecItem[];
  // Sub-type 분류용
  subType: string;
  plcSeries?: PlcSeriesId;   // PLC 전용: 'CM1'(PLC) | 'CM3'(PLC-S)
  // PLC / PLCS 필터용
  ioPoints?: number;
  programCapacity?: number;
  hasEthernet?: boolean;
  hasRS485?: boolean;
  hasRedundancy?: boolean;
  hasSDCard?: boolean;
  outputType?: 'TR_SINK' | 'TR_SOURCE' | 'RELAY';
  formFactor?: 'SLIM' | 'BRICK' | 'MODULAR';
  isHighSpeed?: boolean;
  // IPC 필터용
  screenSize?: number;
  cpuTier?: 'J_SERIES' | 'I3' | 'I5' | 'I7';
  hasScadaPreinstalled?: boolean;
  installType?: 'PANEL' | 'RACK' | 'BOX' | 'MONITOR';
  hasHighBrightness?: boolean;
  touchType?: 'RESISTIVE' | 'CAPACITIVE' | 'NONE';
  // SCADA 필터용
  lineup?: string;
  tag?: string;
  maxUsers?: string;
  scadaEdition?: 'SCADA' | 'SCADA_PRO';
  // XPANEL 필터용
  xpanelOs?: 'CE' | 'WEC7' | 'LINUX';
  xpanelPower?: 'DC24V' | 'AC';
  wideTemp?: boolean;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterSection {
  id: string;
  title: string;
  type: 'buttons' | 'checkboxGrid';
  options: FilterOption[];
  matcher: (product: Product, selected: string[]) => boolean;
  /** 현재 필터 상태 기준으로 이 섹션을 비활성화할지 여부 */
  disabledWhen?: (filters: FilterValues) => boolean;
}

export interface SubTypeConfig {
  id: string;
  label: string;
  matcher: (product: Product) => boolean;
  filters: FilterSection[];
}

export interface CategoryConfig {
  id: CategoryId;
  name: string;
  subTypes: SubTypeConfig[];
}

export type FilterValues = Record<string, string[]>;
