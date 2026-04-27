import type { CategoryConfig, Product } from '../types';

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  // ── IPC ─────────────────────────────────────────────────────────────────
  {
    id: 'IPC',
    name: 'IPC / IAC',
    subTypes: [
      {
        id: 'PANEL', label: '패널 PC',
        matcher: (p: Product) => p.subType === 'PANEL',
        filters: [
          {
            id: 'screen', title: '화면 크기', type: 'checkboxGrid',
            options: [
              { label: '10.4"', value: '10.4' },
              { label: '12.1"', value: '12.1' },
              { label: '15"', value: '15' },
              { label: '15.6" Wide', value: '15.6' },
              { label: '19"', value: '19' },
              { label: '21.5" Wide', value: '21.5' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(String(p.screenSize ?? 0)),
          },
          {
            id: 'cpu', title: 'CPU', type: 'checkboxGrid',
            options: [
              { label: 'J 시리즈', value: 'J_SERIES' },
              { label: 'Core i3', value: 'I3' },
              { label: 'Core i5', value: 'I5' },
              { label: 'Core i7', value: 'I7' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.cpuTier ?? ''),
          },
          {
            id: 'touch', title: '터치 방식', type: 'buttons',
            options: [
              { label: '감압식', value: 'RESISTIVE' },
              { label: '정전식', value: 'CAPACITIVE' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.touchType ?? ''),
          },
          {
            id: 'options', title: '옵션', type: 'checkboxGrid',
            options: [
              { label: '고휘도(-H)', value: 'hb' },
              { label: 'SCADA 탑재', value: 'scada' },
            ],
            matcher: (p, sel) =>
              sel.every((s) =>
                s === 'hb' ? p.hasHighBrightness :
                s === 'scada' ? p.hasScadaPreinstalled : true
              ),
          },
        ],
      },
      {
        id: 'MONITOR', label: '터치 모니터',
        matcher: (p: Product) => p.subType === 'MONITOR',
        filters: [
          {
            id: 'screen', title: '화면 크기', type: 'checkboxGrid',
            options: [
              { label: '12.1"', value: '12.1' },
              { label: '15.6"', value: '15.6' },
              { label: '21.5"', value: '21.5' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(String(p.screenSize ?? 0)),
          },
          {
            id: 'options', title: '옵션', type: 'checkboxGrid',
            options: [
              { label: '고휘도(-H)', value: 'hb' },
            ],
            matcher: (p, sel) =>
              sel.every((s) => s === 'hb' ? p.hasHighBrightness : true),
          },
        ],
      },
      {
        id: 'RACK', label: '랙 PC',
        matcher: (p: Product) => p.subType === 'RACK',
        filters: [
          {
            id: 'cpu', title: 'CPU', type: 'checkboxGrid',
            options: [
              { label: 'J 시리즈 (1U)', value: 'J_SERIES' },
              { label: 'Core i5 (4U)', value: 'I5' },
              { label: 'Core i7 (4U)', value: 'I7' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.cpuTier ?? ''),
          },
        ],
      },
      {
        id: 'BOX', label: 'BOX PC',
        matcher: (p: Product) => p.subType === 'BOX',
        filters: [
          {
            id: 'cpu', title: 'CPU', type: 'checkboxGrid',
            options: [
              { label: 'J 시리즈', value: 'J_SERIES' },
              { label: 'Core i5', value: 'I5' },
              { label: 'Core i7', value: 'I7' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.cpuTier ?? ''),
          },
        ],
      },
    ],
  },

  // ── SCADA ────────────────────────────────────────────────────────────────
  {
    id: 'SCADA',
    name: 'SCADA',
    subTypes: [
      {
        id: 'SCADA_PRO', label: 'SCADA PRO',
        matcher: (p: Product) => p.subType === 'SCADA_PRO',
        filters: [
          {
            id: 'lineup', title: 'LINE UP', type: 'buttons',
            options: [
              { label: '개발용 / DS', value: 'DS' },
              { label: '실행용 / RS', value: 'RS' },
              { label: 'Web용 / WS', value: 'WS' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.lineup ?? ''),
          },
          {
            id: 'tag', title: 'TAG', type: 'checkboxGrid',
            options: [
              { label: '75 TAG', value: '75' },
              { label: '150 TAG', value: '150' },
              { label: '500 TAG', value: '500' },
              { label: '10,000 TAG', value: '10K' },
              { label: '100,000 TAG', value: '100K' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.tag ?? ''),
          },
          {
            id: 'users', title: '동시접속 (WS)', type: 'checkboxGrid',
            options: [
              { label: '1 User', value: '01' },
              { label: '3 User', value: '03' },
              { label: '5 User', value: '05' },
              { label: '10 User', value: '10' },
              { label: '15 User', value: '15' },
              { label: '20 User', value: '20' },
              { label: '25 User', value: '25' },
              { label: '30 User', value: '30' },
            ],
            matcher: (p, sel) =>
              sel.length === 0 || p.lineup !== 'WS' || sel.includes(p.maxUsers ?? ''),
            disabledWhen: (filters) => {
              const lineup = filters['lineup']?.[0];
              return lineup === 'DS' || lineup === 'RS';
            },
          },
        ],
      },
      {
        id: 'SCADA_STD', label: 'SCADA',
        matcher: (p: Product) => p.subType === 'SCADA_STD',
        filters: [
          {
            id: 'lineup', title: 'LINE UP', type: 'buttons',
            options: [
              { label: '개발용 / DS', value: 'DS' },
              { label: '실행용 / RS', value: 'RS' },
              { label: '뷰 버전 / VS', value: 'VS' },
              { label: '뷰 컨트롤 / CS', value: 'CS' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.lineup ?? ''),
          },
          {
            id: 'tag', title: 'TAG', type: 'checkboxGrid',
            options: [
              { label: '75 TAG', value: '75' },
              { label: '150 TAG', value: '150' },
              { label: '500 TAG', value: '500' },
              { label: '무한 TAG', value: 'FULL' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.tag ?? ''),
          },
          {
            id: 'users', title: '동시접속 (VS/CS)', type: 'checkboxGrid',
            options: [
              { label: '2 User', value: '02' },
              { label: '5 User', value: '05' },
              { label: '10 User', value: '10' },
              { label: '무한 User', value: 'FU' },
            ],
            matcher: (p, sel) =>
              sel.length === 0 ||
              !['VS', 'CS'].includes(p.lineup ?? '') ||
              sel.includes(p.maxUsers ?? ''),
            disabledWhen: (filters) => {
              const lineup = filters['lineup']?.[0];
              return lineup === 'DS' || lineup === 'RS';
            },
          },
        ],
      },
    ],
  },
  // ── XPANEL ──────────────────────────────────────────────────────────────
  {
    id: 'XPANEL' as const,
    name: 'XPANEL',
    subTypes: [
      {
        id: 'XPANEL_HMI', label: 'XPANEL HMI',
        matcher: (p: Product) => p.subType === 'XPANEL_HMI',
        filters: [
          {
            id: 'screen', title: '화면 크기', type: 'checkboxGrid',
            options: [
              { label: '7"', value: '7' },
              { label: '10.1" Wide', value: '10.1' },
              { label: '10.4"', value: '10.4' },
              { label: '12.1"', value: '12.1' },
              { label: '12.1" Wide', value: '12.1W' },
              { label: '15"', value: '15' },
              { label: '15.6" Wide', value: '15.6' },
            ],
            matcher: (p, sel) => {
              if (sel.length === 0) return true;
              const key = (p.screenSize === 12.1 && p.series === 'EXT2') ? '12.1W' : String(p.screenSize ?? 0);
              return sel.includes(key);
            },
          },
          {
            id: 'os', title: 'OS', type: 'buttons',
            options: [
              { label: 'CE 6.0', value: 'CE' },
              { label: 'WEC7', value: 'WEC7' },
              { label: 'Linux', value: 'LINUX' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.xpanelOs ?? ''),
          },
          {
            id: 'power', title: '입력 전원', type: 'buttons',
            options: [
              { label: 'DC 24V', value: 'DC24V' },
              { label: 'AC 100-240V', value: 'AC' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.xpanelPower ?? ''),
          },
          {
            id: 'touch', title: '터치 방식', type: 'buttons',
            options: [
              { label: '저항막', value: 'RESISTIVE' },
              { label: '정전식', value: 'CAPACITIVE' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.touchType ?? ''),
          },
          {
            id: 'options', title: '옵션', type: 'checkboxGrid',
            options: [
              { label: '고휘도', value: 'hb' },
              { label: '광온도 (-20~70°C)', value: 'wideTemp' },
            ],
            matcher: (p, sel) =>
              sel.every((s) =>
                s === 'hb' ? p.hasHighBrightness :
                s === 'wideTemp' ? p.wideTemp : true,
              ),
          },
        ],
      },
      {
        id: 'HYBRID_XP', label: '하이브리드 XPANEL',
        matcher: (p: Product) => p.subType === 'HYBRID_XP',
        filters: [
          {
            id: 'outputType', title: '출력 형태', type: 'buttons',
            options: [
              { label: 'Relay 출력', value: 'RELAY' },
              { label: 'TR Sink 출력', value: 'TR_SINK' },
              { label: 'TR Source 출력', value: 'TR_SOURCE' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.outputType ?? ''),
          },
        ],
      },
    ],
  },
];

export function getCategoryConfig(id: string) {
  return CATEGORY_CONFIGS.find((c) => c.id === id);
}
