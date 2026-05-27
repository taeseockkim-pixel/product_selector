import type { CategoryConfig, Product } from '../types';

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  // ── IPC ─────────────────────────────────────────────────────────────────
  {
    id: 'IPC',
    name: 'IPC / IAC',
    nameEn: 'IPC / IAC',
    subTypes: [
      {
        id: 'PANEL', label: '패널 PC', labelEn: 'Panel PC',
        matcher: (p: Product) => p.subType === 'PANEL',
        filters: [
          {
            id: 'screen', title: '화면 크기', titleEn: 'Screen Size', type: 'checkboxGrid',
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
            id: 'cpu', title: 'CPU', titleEn: 'CPU', type: 'checkboxGrid',
            options: [
              { label: 'J 시리즈', labelEn: 'J Series', value: 'J_SERIES' },
              { label: 'Core i3', value: 'I3' },
              { label: 'Core i5', value: 'I5' },
              { label: 'Core i7', value: 'I7' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.cpuTier ?? ''),
          },
          {
            id: 'touch', title: '터치 방식', titleEn: 'Touch Type', type: 'buttons',
            options: [
              { label: '감압식', labelEn: 'Resistive', value: 'RESISTIVE' },
              { label: '정전식', labelEn: 'Capacitive', value: 'CAPACITIVE' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.touchType ?? ''),
          },
          {
            id: 'options', title: '옵션', titleEn: 'Options', type: 'checkboxGrid',
            options: [
              { label: '고휘도(-H)', labelEn: 'High Brightness (-H)', value: 'hb' },
              { label: 'SCADA 탑재', labelEn: 'SCADA Preinstalled', value: 'scada' },
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
        id: 'MONITOR', label: '터치 모니터', labelEn: 'Touch Monitor',
        matcher: (p: Product) => p.subType === 'MONITOR',
        filters: [
          {
            id: 'screen', title: '화면 크기', titleEn: 'Screen Size', type: 'checkboxGrid',
            options: [
              { label: '12.1"', value: '12.1' },
              { label: '15.6"', value: '15.6' },
              { label: '21.5"', value: '21.5' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(String(p.screenSize ?? 0)),
          },
          {
            id: 'options', title: '옵션', titleEn: 'Options', type: 'checkboxGrid',
            options: [
              { label: '고휘도(-H)', labelEn: 'High Brightness (-H)', value: 'hb' },
            ],
            matcher: (p, sel) =>
              sel.every((s) => s === 'hb' ? p.hasHighBrightness : true),
          },
        ],
      },
      {
        id: 'BOX', label: 'BOX PC', labelEn: 'BOX PC',
        matcher: (p: Product) => p.subType === 'BOX',
        filters: [
          {
            id: 'cpu', title: 'CPU', titleEn: 'CPU', type: 'checkboxGrid',
            options: [
              { label: 'J 시리즈', labelEn: 'J Series', value: 'J_SERIES' },
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
    nameEn: 'SCADA',
    subTypes: [
      {
        id: 'SCADA_PRO', label: 'SCADA PRO', labelEn: 'SCADA PRO',
        matcher: (p: Product) => p.subType === 'SCADA_PRO',
        filters: [
          {
            id: 'lineup', title: 'LINE UP', titleEn: 'Line Up', type: 'buttons',
            options: [
              { label: '개발용 / DS', labelEn: 'Development / DS', value: 'DS' },
              { label: '실행용 / RS', labelEn: 'Runtime / RS', value: 'RS' },
              { label: 'Web용 / WS', labelEn: 'Web / WS', value: 'WS' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.lineup ?? ''),
          },
          {
            id: 'tag', title: 'TAG', titleEn: 'TAG', type: 'checkboxGrid',
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
            id: 'users', title: '동시접속 (WS)', titleEn: 'Concurrent Users (WS)', type: 'checkboxGrid',
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
        id: 'SCADA_STD', label: 'SCADA', labelEn: 'SCADA',
        matcher: (p: Product) => p.subType === 'SCADA_STD',
        filters: [
          {
            id: 'lineup', title: 'LINE UP', titleEn: 'Line Up', type: 'buttons',
            options: [
              { label: '개발용 / DS', labelEn: 'Development / DS', value: 'DS' },
              { label: '실행용 / RS', labelEn: 'Runtime / RS', value: 'RS' },
              { label: '뷰 버전 / VS', labelEn: 'View / VS', value: 'VS' },
              { label: '뷰 컨트롤 / CS', labelEn: 'View Control / CS', value: 'CS' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.lineup ?? ''),
          },
          {
            id: 'tag', title: 'TAG', titleEn: 'TAG', type: 'checkboxGrid',
            options: [
              { label: '75 TAG', value: '75' },
              { label: '150 TAG', value: '150' },
              { label: '500 TAG', value: '500' },
              { label: '무한 TAG', labelEn: 'Unlimited TAG', value: 'FULL' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.tag ?? ''),
          },
          {
            id: 'users', title: '동시접속 (VS/CS)', titleEn: 'Concurrent Users (VS/CS)', type: 'checkboxGrid',
            options: [
              { label: '2 User', value: '02' },
              { label: '5 User', value: '05' },
              { label: '10 User', value: '10' },
              { label: '무한 User', labelEn: 'Unlimited User', value: 'FU' },
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
    nameEn: 'XPANEL',
    subTypes: [
      {
        id: 'XPANEL_HMI', label: 'XPANEL HMI', labelEn: 'XPANEL HMI',
        matcher: (p: Product) => p.subType === 'XPANEL_HMI',
        filters: [
          {
            id: 'screen', title: '화면 크기', titleEn: 'Screen Size', type: 'checkboxGrid',
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
            id: 'os', title: 'OS', titleEn: 'OS', type: 'buttons',
            options: [
              { label: 'CE 6.0', value: 'CE' },
              { label: 'WEC7', value: 'WEC7' },
              { label: 'Linux', value: 'LINUX' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.xpanelOs ?? ''),
          },
          {
            id: 'power', title: '입력 전원', titleEn: 'Power Supply', type: 'buttons',
            options: [
              { label: 'DC 24V', value: 'DC24V' },
              { label: 'AC 100-240V', value: 'AC' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.xpanelPower ?? ''),
          },
          {
            id: 'touch', title: '터치 방식', titleEn: 'Touch Type', type: 'buttons',
            options: [
              { label: '저항막', labelEn: 'Resistive', value: 'RESISTIVE' },
              { label: '정전식', labelEn: 'Capacitive', value: 'CAPACITIVE' },
            ],
            matcher: (p, sel) => sel.length === 0 || sel.includes(p.touchType ?? ''),
          },
          {
            id: 'options', title: '옵션', titleEn: 'Options', type: 'checkboxGrid',
            options: [
              { label: '고휘도', labelEn: 'High Brightness', value: 'hb' },
            ],
            matcher: (p, sel) =>
              sel.every((s) =>
                s === 'hb' ? p.hasHighBrightness : true,
              ),
          },
        ],
      },
      {
        id: 'HYBRID_XP', label: '하이브리드 XPANEL', labelEn: 'Hybrid XPANEL',
        matcher: (p: Product) => p.subType === 'HYBRID_XP',
        filters: [
          {
            id: 'outputType', title: '출력 형태', titleEn: 'Output Type', type: 'buttons',
            options: [
              { label: 'Relay 출력', labelEn: 'Relay Output', value: 'RELAY' },
              { label: 'TR Sink 출력', labelEn: 'TR Sink Output', value: 'TR_SINK' },
              { label: 'TR Source 출력', labelEn: 'TR Source Output', value: 'TR_SOURCE' },
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
