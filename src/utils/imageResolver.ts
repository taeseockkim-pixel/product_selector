// public/products/ 에 있는 이미지 파일 목록
// n = 숫자 자리 와일드카드 (예: CM1-UPnF → CM1-UP1F, CM1-UP2F, CM1-UP3F)
const AVAILABLE_IMAGES = [
  'CM0-DM', 'CM0-SCB15I', 'CM0-TB32M',
  'CM1-AD04W', 'CM1-AD16VI', 'CM1-BN01A',
  'CM1-BS0nA', 'CM1-CPnF',
  'CM1-DA08V', 'CM1-DC10A', 'CM1-EC10A', 'CM1-EC10OPC',
  'CM1-EP02F', 'CM1-HS02E', 'CM1-LG02G',
  'CM1-PS02A', 'CM1-PS08N', 'CM1-RC10A',
  'CM1-RD04A', 'CM1-RPW', 'CM1-SC01DNP', 'CM1-SC02A',
  'CM1-SC02D', 'CM1-SPC', 'CM1-TC04A', 'CM1-TH08A',
  'CM1-UPnF', 'CM1-WG02C',
  'CM1-XD32E', 'CM1-XP1F', 'CM1-XP1R', 'CM1-XP1S',
  'CM1-XPnE', 'CM1-XY16E', 'CM1-YT16E',
];

const EXACT = new Set(AVAILABLE_IMAGES.filter(name => !name.includes('n')));

const PATTERNS: { regex: RegExp; file: string }[] = AVAILABLE_IMAGES
  .filter(name => name.includes('n'))
  .map(name => ({
    regex: new RegExp('^' + name.replace(/n/g, '\\d+') + '$'),
    file: name,
  }));

// subType 기반 폴백 — ID 패턴 매칭 실패 시 같은 subType의 대표 이미지 사용
const SUBTYPE_FALLBACK: Record<string, string> = {
  // CM1 CPU
  CM1_CPU_XP:      'CM1-XP1F',
  CM1_CPU_CP:      'CM1-CPnF',
  CM1_CPU_XP_RED:  'CM1-XP1S',
  // CM1 전원/베이스
  CM1_PWR:         'CM1-SPC',
  CM1_BASE:        'CM1-BS0nA',
  CM1_RED_BASE:    'CM1-BS0nA',
  CM1_RED_PWR:     'CM1-RPW',
  // CM1 디지털 I/O
  CM1_DI:          'CM1-XD32E',
  CM1_DO:          'CM1-YT16E',
  CM1_DIO:         'CM1-XY16E',
  // CM1 아날로그
  CM1_AI:          'CM1-AD16VI',
  CM1_AO:          'CM1-DA08V',
  // CM1 온도
  CM1_TEMP_RTD:    'CM1-RD04A',
  CM1_TEMP_TC:     'CM1-TC04A',
  CM1_TEMP_TH:     'CM1-TH08A',
  // CM1 특수
  CM1_SP_HSC:      'CM1-HS02E',
  CM1_SP_LC:       'CM1-WG02C',
  CM1_SP_DL:       'CM1-LG02G',
  CM1_SP_POS:      'CM1-PS02A',
  // CM1 통신
  CM1_COMM_SERIAL: 'CM1-SC02A',
  CM1_COMM_ETH:    'CM1-EC10A',
  CM1_COMM_OPC:    'CM1-EC10OPC',
  CM1_COMM_DNP:    'CM1-SC01DNP',
  CM1_COMM_BAC:    'CM1-BN01A',
  CM1_COMM_CDMA:   'CM1-SC02A',
  CM1_COMM_CNET:   'CM1-SC02A',
  CM1_COMM_ECAT:   'CM1-EC10A',
  // CM1 이중화
  CM1_RED_COMM:    'CM1-RC10A',
  CM1_RED_MMI:     'CM1-RC10A',
  CM1_RED_EXT:     'CM1-RPW',
  // CM1 액세서리
  CM1_ACC:         'CM0-TB32M',
};

export function resolveProductImage(productId: string, subType: string): string | null {
  // 1단계: 정확한 파일명 일치
  if (EXACT.has(productId)) return `/products/${productId}.jpg`;

  // 2단계: n 패턴 매칭 (예: CM1-UP1F → CM1-UPnF.jpg)
  for (const { regex, file } of PATTERNS) {
    if (regex.test(productId)) return `/products/${file}.jpg`;
  }

  // 3단계: subType 기반 폴백 (같은 종류 대표 이미지)
  const fallback = SUBTYPE_FALLBACK[subType];
  if (fallback) return `/products/${fallback}.jpg`;

  // 4단계: 이미지 없음 → 플레이스홀더 표시
  return null;
}
