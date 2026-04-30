// 순서 중요: 더 구체적인 패턴을 먼저 처리
const TOKENS: [RegExp, string][] = [
  // 숫자+단위 패턴
  [/(\d[\d,]*)점/g,                     '$1 pts'],
  [/(\d+)배/g,                           '$1x'],
  [/(\d+)개/g,                           '$1 ea'],
  [/(\d+)축/g,                           '$1-axis'],
  [/(\d+)채널/g,                         '$1 ch'],
  // 동작/연산 방식
  [/반복 연산,?\s*/g,                     'Cyclic, '],
  [/정주기 인터럽트 연산/g,               'Fixed-period interrupt'],
  [/정주기 연산/g,                        'Fixed-period operation'],
  [/Stored Program \(ROM모드 방식\)/g,    'Stored Program (ROM mode)'],
  [/Stored Program/g,                    'Stored Program'],
  // 방향
  [/입력 (\d+)점/g,                      '$1 input pts'],
  [/출력 (\d+)점/g,                      '$1 output pts'],
  [/입력 (\d+)점\s*\/\s*출력 (\d+)점 \(([^)]+)\)/g, '$1 input pts / $2 output pts ($3)'],
  // 최대/지원
  [/최대 (\d+)/g,                        'Max. $1'],
  [/최대\s+(\d)/g,                       'Max. $1'],
  // 이중화 관련
  [/이중화 데이터 동기 통신 모듈/g,       'Redundancy data sync comm. module'],
  [/이중화 설정용 MMI 모듈/g,            'Redundancy MMI config. module'],
  [/이중화 전원 공급 모듈/g,              'Redundancy power supply module'],
  [/이중화 전용/g,                        'Redundancy-only'],
  [/이중화/g,                             'Redundancy'],
  // 증설/확장
  [/로컬 베이스 \+ 최대 (\d+) 증설 베이스 \(([^)]+)\)/g, 'Local base + Max. $1 ext. bases ($2)'],
  [/최대 (\d+)개 베이스 지원,? ?Ring Topology/g, 'Max. $1 bases, Ring Topology'],
  [/최대 (\d+)개 베이스 지원/g,          'Max. $1 bases'],
  [/증설 통신 전용 : /g,                  'Ext. comm. only: '],
  [/증설 통신 전용: /g,                   'Ext. comm. only: '],
  // 일반 단어
  [/표준형/g,                             'Standard'],
  [/옵션가능/g,                           'Optional'],
  [/옵션 가능/g,                          'Optional'],
  [/지원/g,                               'Supported'],
  [/내장 배터리/g,                        'Built-in battery'],
  [/내장 (\d+)CH/gi,                      'Built-in $1 CH'],
  [/비결로/g,                             'non-condensing'],
  [/접속타입 : /g,                        'Connector: '],
  [/접속타입 : /g,                        'Connector: '],
  [/더미 모듈 \(베이스 빈 슬롯 마감\)/g,  'Dummy module (blank slot cover)'],
  [/더미 모듈/g,                          'Dummy module'],
  [/각 (\d+)점/g,                         '$1 pts each'],
  [/실수연산:/g,                           'Float:'],
  [/실수연산 /g,                           'Float '],
  [/기본 명령/g,                           'basic instructions'],
  [/기본\)/g,                              'basic)'],
  [/\(기본\)/g,                            '(default)'],
  [/선택/g,                               'selectable'],
  [/고속카운터/g,                          'HSC'],
  // 통신 접속 방식
  [/Terminal Block/g,                     'Terminal Block'],
];

export function translateSpecValue(value: string, lang: 'ko' | 'en'): string {
  if (lang === 'ko') return value;
  let v = value;
  for (const [re, rep] of TOKENS) {
    v = v.replace(re, rep);
  }
  return v;
}
