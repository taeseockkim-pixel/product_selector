/**
 * products.json에 descriptionEn / seriesLabelEn 필드를 추가합니다.
 * node scripts/add-en-fields.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dir, '../src/data/products.json');
const products = JSON.parse(readFileSync(dataPath, 'utf8'));

// ── seriesLabel → seriesLabelEn ──────────────────────────────────────────
const SERIES_LABEL_EN = {
  'UP Series': 'UP Series', 'XP Series': 'XP Series',
  'XP 이중화': 'XP Redundancy', 'CP Series': 'CP Series',
  '전원 모듈': 'Power Module', '베이스': 'Base',
  '디지털 입력': 'Digital Input', '디지털 출력': 'Digital Output',
  '디지털 입출력 혼합': 'Digital Mixed I/O',
  '아날로그 입력': 'Analog Input', '아날로그 출력': 'Analog Output',
  '아날로그 입출력': 'Analog Mixed I/O', '4×1 MUX': '4×1 MUX',
  'RTD': 'RTD', 'TC (열전대)': 'TC (Thermocouple)',
  '써미스터': 'Thermistor', '고속카운터': 'High-Speed Counter',
  'Loadcell': 'Loadcell', 'Data Logger': 'Data Logger',
  '위치결정': 'Positioning',
  '시리얼': 'Serial', '시리얼 통신': 'Serial Comm.',
  '이더넷': 'Ethernet', 'Ethernet': 'Ethernet',
  'OPC UA': 'OPC UA', 'DNP3.0': 'DNP3.0', 'BACnet': 'BACnet',
  'CDMA': 'CDMA', 'CIMON-NET RIO': 'CIMON-NET RIO', 'EtherCAT': 'EtherCAT',
  '이중화 통신': 'Redundancy Comm.', '이중화 MMI': 'Redundancy MMI',
  '이중화 증설': 'Redundancy Extension', '이중화 베이스': 'Redundancy Base',
  '이중화 전원': 'Redundancy Power',
  '액세서리': 'Accessories', '액세서리 (CIMON-NET)': 'Accessories (CIMON-NET)',
  'Block Type': 'Block Type', 'Slim Type': 'Slim Type',
  'SPLUS (고속)': 'SPLUS (High-Speed)', 'PWM 출력': 'PWM Output',
  '전원 공급': 'Power Supply',
  '500 Series': '500 Series', '3000 Series': '3000 Series',
  '5000 Series': '5000 Series', '50000W Series': '50000W Series',
  '70000W Series': '70000W Series', 'Touch Monitor': 'Touch Monitor',
  'NU1R (1U)': 'NU1R (1U)', 'NU4R (4U)': 'NU4R (4U)', 'BOX PC': 'BOX PC',
  'SCADA Standard': 'SCADA Standard', 'SCADA PRO': 'SCADA PRO',
  'XPANEL XT': 'XPANEL XT', 'XPANEL iXT': 'XPANEL iXT',
  'XPANEL eXT2': 'XPANEL eXT2', '하이브리드 XPANEL': 'Hybrid XPANEL',
};

// ── 순서 중요: 더 긴/구체적 표현 먼저 ──────────────────────────────────
const TOKEN_PAIRS = [
  // 규모 (순서 중요)
  ['중대규모 고속 제어',                'Mid-to-large-scale high-speed control'],
  ['중대규모 제어',                     'Mid-to-large-scale control'],
  ['대규모 고속 제어',                  'Large-scale high-speed control'],
  ['대규모 이중화',                     'Large-scale redundancy'],
  ['대규모 제어',                       'Large-scale control'],
  ['중규모 네트워크 대응',              'Mid-scale network control'],
  ['중규모 제어',                       'Mid-scale control'],
  ['소규모 제어',                       'Small-scale control'],
  // 출력
  ['TR Sink/Source 출력',               'TR Sink/Source output'],
  ['TR Sink 출력',                      'TR Sink output'],
  ['TR Source 출력',                    'TR Source output'],
  ['Relay 출력',                        'Relay output'],
  ['PWM 출력',                          'PWM output'],
  // 통신 구성 (더 구체적 패턴 먼저)
  ['Full 통신 / 소형 블록형',           'Full comm. / compact block type'],
  ['Full 통신',                         'Full comm.'],
  ['소형 블록형',                       'compact block type'],
  // 없음/만 (영어 내 한국어 조각)
  ['Ethernet 없음',                     'no Ethernet'],
  ['RS485 없음',                        'no RS-485'],
  ['RS485·Ethernet 없음',              'no RS-485/Ethernet'],
  ['RS232C만',                          'RS-232C only'],
  ['RS232C만 (RS485·Ethernet 없음)',    'RS-232C only (no RS-485/Ethernet)'],
  // 아날로그 신호 종류 (순서 중요)
  ['전압·전류 공용',                    'voltage/current universal'],
  ['전압 입력',                         'voltage input'],
  ['전류 입력',                         'current input'],
  ['전압 출력',                         'voltage output'],
  ['전류 출력',                         'current output'],
  // 수식어
  ['채널간 절연',                       'channel isolation'],
  ['Ring 증설',                         'Ring topology extension'],
  ['이코노미',                          'Economy'],
  ['기존형',                            'legacy type'],
  ['SD/MMC 옵션',                       'SD/MMC option'],
  ['고속 CPU',                          'High-speed CPU'],
  // 이중화
  ['이중화 전원 공급 모듈',             'Redundancy power supply module'],
  ['이중화 설정용 MMI 모듈',            'Redundancy MMI module'],
  ['이중화 데이터 동기 통신 모듈',      'Redundancy data sync comm. module'],
  ['이중화 CPU용 증설',                 'Extension for redundant CPU'],
  ['3Port 증설 Hub 내장',               '3-port extension hub built-in'],
  ['이중화',                            'Redundancy'],
  // I/O 내장
  ['내장 이더넷',                       'Built-in Ethernet'],
  ['이더넷 내장',                       'Built-in Ethernet'],
  ['Ethernet 내장',                     'Built-in Ethernet'],
  ['내장 시리얼',                       'Built-in Serial'],
  // IPC
  ['초소형 BOX PC',                     'Compact BOX PC'],
  ['1U 랙 PC',                          '1U Rack PC'],
  ['감압식',                            'resistive touch'],
  ['정전식',                            'capacitive touch'],
  // 써미스터
  ['써미스터',                          'Thermistor'],
  ['NTC형',                             'NTC type'],
  // 특수
  ['오픈 컬렉터 방식',                  'open collector type'],
  ['오픈 컬렉터',                       'open collector'],
  ['라인 드라이버',                     'line driver'],
  ['직선·원호 보간',                    'linear/circular interpolation'],
  ['단순 펄스',                         'simple pulse'],
  ['엔코더 PNP Open Collector (-Common)', 'encoder PNP open collector (-common)'],
  ['위치·속도 제어',                    'position/speed control'],
  ['종 원점 복귀',                      'types of home return'],
  ['블록 일체형',                       'integrated block type'],
  ['탑재',                              'preinstalled'],
  // CIMON-NET
  ['CIMON HMI Protocol',               'CIMON HMI Protocol'],
  ['CIMON-NET Master',                  'CIMON-NET Master'],
  // 일반
  ['더미 모듈 (베이스 빈 슬롯 마감)',    'Dummy module (blank slot cover)'],
  ['더미 모듈',                         'Dummy module'],
  ['Multi-Terminal 단자대',             'Multi-Terminal block'],
  ['단자대',                            'terminal block'],
  // 특수 복합 표현
  // 순서 중요: 더 긴 구 먼저
  ['최고성능 BOX PC',                   'Top-performance BOX PC'],
  ['고성능 BOX PC',                     'High-performance BOX PC'],
  ['CPU 이중화용 증설',                 'extension for CPU redundancy'],
  ['Redundancy용 증설',                 'extension for redundancy'],
  ['표준형',                            'Standard'],
  ['동적계량용',                        'dynamic weighing'],
  ['메모리',                            'memory'],
  ['전압/전류',                         'voltage/current'],
  ['전류,',                             'current,'],
  ['전압,',                             'voltage,'],
  ['전류)',                              'current)'],
  ['전압)',                              'voltage)'],
  ['라인 드라이브',                     'line drive'],
  ['세대',                              'th Gen'],
  ['고휘도',                            'High Brightness'],
  ['랙 PC',                             'Rack PC'],
  ['사용 가능',                         'compatible'],
  // SCADA
  ['무한 TAG',                          'Unlimited TAG'],
  ['무한 User',                         'Unlimited User'],
  ['View Control 버전',                 'View Control version'],
  ['View 버전',                         'View version'],
  ['Runtime + Keylock',                 'Runtime + Keylock'],
  ['동시접속',                          'Concurrent'],
  ['버전',                              'version'],
  ['포함',                              'incl.'],
  // 인치 변환 (regex)
  [/(\d+(?:\.\d+)?)인치/g,             '$1"'],
  // 기타 XPANEL / IPC 용어
  ['저항막 터치',                       'resistive touch'],
  ['오디오 포트',                       'audio port'],
  ['오디오',                            'audio'],
  ['포트',                              'port'],
  ['색상',                              'color'],
  ['알루미늄 하우징',                   'aluminum housing'],
  ['광온도',                            'wide temp.'],
  ['표준 휘도',                         'standard brightness'],
  ['HMI+PLC 일체형',                    'integrated HMI+PLC'],
  ['일체형',                            'integrated'],
  ['고성능',                            'high-performance'],
  // 복합 I/O 표현 (순서 중요: 복합어 먼저)
  ['입출력 혼합',                       'Mixed I/O'],
  ['입출력',                            'I/O'],
  ['DC 24V 입력',                       'DC 24V input'],
  // 숫자+단위 패턴 - 입력/출력은 점 치환 전에 먼저 처리
  [/입력 (\d[\d,]*)점/g,               '$1 input pts'],
  [/출력 (\d[\d,]*)점/g,               '$1 output pts'],
  [/(\d[\d,]*)점/g,                    '$1 pts'],
  [/(\d+)\s*Slot\s+Redundancy/g,       '$1-slot Redundancy'],
  [/(\d+)축/g,                         '$1-axis'],
  [/(\d+)ch/gi,                        '$1 ch'],
  [/(\d+)개/g,                         '$1 ea'],
  [/최대\s+(\d)/g,                     'Max. $1'],
  // 나머지 한국어
  ['분해능',                            'resolution'],
  ['동적계량용',                        'dynamic weighing'],
  ['광통신',                            'fiber optic comm.'],
  ['모뎀',                              'modem'],
  ['유무선',                            'wired/wireless'],
  ['운전 모드 설정',                    'operating mode setting'],
  ['이중화용',                          'for redundancy'],
  ['전원용',                            'power'],
  ['베이스',                            'base'],
  ['전원 공급 상태 모니터링 모듈',      'power supply status monitoring module'],
  ['통신 케이블',                       'comm. cable'],
  ['배선용',                            'for wiring'],
  ['배선 케이블',                       'wiring cable'],
  ['대응',                              'compatible'],
  ['위치결정',                          'positioning'],
  ['지원',                              'supported'],
  // 독립 한국어 단어 (마지막에 처리)
  ['고속',                              'high-speed'],
  ['엔코더',                            'encoder'],
  ['입력',                              'input'],
  ['출력',                              'output'],
];

function translateDescription(desc) {
  if (!desc) return desc;
  let r = desc;
  for (const [from, to] of TOKEN_PAIRS) {
    if (typeof from === 'string') r = r.replaceAll(from, to);
    else r = r.replace(from, to);
  }
  return r;
}

const updated = products.map((p) => ({
  ...p,
  seriesLabelEn: SERIES_LABEL_EN[p.seriesLabel] ?? p.seriesLabel,
  descriptionEn: translateDescription(p.description),
}));

writeFileSync(dataPath, JSON.stringify(updated, null, 2), 'utf8');

// 검증: 한국어가 남은 항목 출력
const remaining = updated.filter(p => /[가-힣]/.test(p.descriptionEn));
if (remaining.length > 0) {
  console.log(`⚠ 한국어 잔존 ${remaining.length}건:`);
  remaining.slice(0, 20).forEach(p => console.log(' ', p.description, '→', p.descriptionEn));
} else {
  console.log('✓ 모든 description 번역 완료');
}
console.log(`총 ${updated.length}개 제품 처리`);
