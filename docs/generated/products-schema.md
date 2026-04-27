# products.json 스키마 참조

자동 생성: 2026-04-27  
소스: `src/types/index.ts`

---

## Product 인터페이스

```typescript
interface Product {
  // 공통 필수 필드
  id: string              // 유일 식별자. 변경 금지 (카트/비교 키)
  modelName: string       // 표시용 모델명
  category: CategoryId    // 'PLC' | 'IPC' | 'SCADA' | 'XPANEL'
  series: string          // 내부 시리즈 코드
  seriesLabel: string     // 표시용 시리즈 레이블
  description: string     // 한 줄 설명
  specs: SpecItem[]       // 상세 모달에 표시될 사양 배열
  subType: string         // filterConfig/plcTreeConfig leaf id와 일치

  // PLC 전용
  plcSeries?: 'CM1' | 'CM3'
  ioPoints?: number
  programCapacity?: number
  hasEthernet?: boolean
  hasRS485?: boolean
  hasRedundancy?: boolean
  hasSDCard?: boolean
  outputType?: 'TR_SINK' | 'TR_SOURCE' | 'RELAY'
  formFactor?: 'SLIM' | 'BRICK' | 'MODULAR'
  isHighSpeed?: boolean

  // IPC 전용
  screenSize?: number
  cpuTier?: 'J_SERIES' | 'I3' | 'I5' | 'I7'
  hasScadaPreinstalled?: boolean
  installType?: 'PANEL' | 'RACK' | 'BOX' | 'MONITOR'
  hasHighBrightness?: boolean
  touchType?: 'RESISTIVE' | 'CAPACITIVE' | 'NONE'

  // SCADA 전용
  lineup?: string         // 'DS' | 'RS' | 'VS'
  tag?: string            // '75' | '150' | '500' | 'FULL'
  maxUsers?: string       // '02' | '05' | '10' | 'FU'
  scadaEdition?: 'SCADA' | 'SCADA_PRO'

  // XPANEL 전용
  xpanelOs?: 'CE' | 'WEC7' | 'LINUX'
  xpanelPower?: 'DC24V' | 'AC'
  wideTemp?: boolean
}

interface SpecItem {
  label: string  // 사양 항목명 (예: "프로그램 용량")
  value: string  // 사양 값 (예: "256K Step")
}
```

---

## subType ↔ filterConfig/plcTreeConfig 매핑

### PLC (CM1)
| subType | 분류 |
|---|---|
| CM1_CPU_UP | CPU > UP Series |
| CM1_CPU_XP | CPU > XP Series |
| CM1_CPU_XP_RED | CPU > XP 이중화 |
| CM1_CPU_CP | CPU > CP Series |
| CM1_PWR | 전원 모듈 |
| CM1_BASE | 베이스 |
| CM1_DI / CM1_DO / CM1_DIO | 디지털 I/O |
| CM1_AI / CM1_AO | 아날로그 |
| CM1_TEMP_RTD / TC / TH | 온도 측정 |
| CM1_COMM_* | 통신 모듈 |
| CM1_RED_* | 이중화 관련 |
| CM1_ACC | 액세서리 |

### PLC (CM3)
| subType | 분류 |
|---|---|
| CM3_CPU_SLIM | CPU > Slim Type |
| CM3_CPU_BRICK | CPU > Block Type |
| CM3_CPU_SPLUS | CPU > SPLUS (고속) |
| CM3_DI / CM3_DO / CM3_DIO | 디지털 I/O |
| CM3_AI / CM3_AO / CM3_AIO | 아날로그 |
| CM3_COMM_* | 통신 |
| CM3_ACC | 액세서리 |

### IPC
| subType | 분류 |
|---|---|
| PANEL | 패널 PC |
| RACK | 랙 PC |
| BOX | BOX PC |
| MONITOR | 터치 모니터 |

### SCADA
| subType | 분류 |
|---|---|
| SCADA_STD | SCADA Standard |
| SCADA_PRO | SCADA-PRO |

### XPANEL
| subType | 분류 |
|---|---|
| XPANEL_HMI | XPANEL HMI |
