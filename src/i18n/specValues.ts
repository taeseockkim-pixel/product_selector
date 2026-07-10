// 순서 중요: 더 구체적인 패턴을 먼저 처리
const TOKENS: [RegExp, string][] = [
  // ── SCADA 고정 구문 (가장 먼저, 원본 한글 기준) ──────────────
  [/600종 이상 \(PLC, Inverter, 계측기 등\)/g, '600+ types (PLC, Inverter, meters, etc.)'],
  [/실시간 \/ 히스토리 트렌드/g,              'Real-time / History trend'],
  [/알람 목록 \/ 알람 히스토리/g,             'Alarm list / Alarm history'],
  [/일보 \/ 주보 \/ 월보/g,                  'Daily / Weekly / Monthly reports'],
  [/MS SQL, MySQL, Oracle 연동/g,            'MS SQL, MySQL, Oracle integration'],
  [/멀티 서버 지원/g,                        'Multi-server Supported'],
  [/서버 이중화 지원/g,                      'Server Redundancy Supported'],

  // ── 복합 입출력 패턴 (숫자 단위 변환 전에 먼저 처리) ────────────
  [/입력 (\d+)점\s*\/\s*출력 (\d+)점 \(([^)]+)\)/g, '$1 input pts / $2 output pts ($3)'],
  [/입력 (\d+)점/g,                          '$1 input pts'],
  [/출력 (\d+)점/g,                          '$1 output pts'],
  [/각 (\d+)점/g,                            '$1 pts each'],
  [/\/점/g,                                  '/pt'],

  // ── 증설/베이스 관련 (숫자+개 변환 전에 먼저 처리) ──────────────
  [/로컬 베이스 \+ 최대 (\d+) 증설 베이스 \(([^)]+)\)/g, 'Local base + Max. $1 ext. bases ($2)'],
  [/최대 (\d+)개 베이스 지원,? ?Ring Topology/g, 'Max. $1 bases, Ring Topology'],
  [/최대 (\d+)개 베이스 지원/g,              'Max. $1 bases'],
  [/증설 통신 전용 : /g,                     'Ext. comm. only: '],
  [/증설 통신 전용: /g,                      'Ext. comm. only: '],
  [/이중화 증설지원/g,                       'Redundancy extension supported'],
  [/증설가능/g,                              'extension available'],
  [/증설지원/g,                              'extension supported'],
  [/증설/g,                                  'ext.'],

  // ── XPANEL / IPC 블록·축 구조 ───────────────────────────────
  [/CPU 블록/g,                              'CPU block'],
  [/확장 블록/g,                             'ext. block'],
  [/X축/g,                                  'X-axis'],
  [/Y축/g,                                  'Y-axis'],
  [/Z축/g,                                  'Z-axis'],
  [/1상 입력 \/ 2상 입력/g,                 'single-phase / 2-phase input'],
  [/1상 입력/g,                             'single-phase input'],
  [/2상 입력/g,                             '2-phase input'],
  [/Up\/Down Preset 카운터/g,               'Up/Down Preset counter'],
  [/링구조/g,                                'Ring topology'],
  [/링 카운터/g,                            'ring counter'],
  [/릴레이/g,                               'relay'],
  [/겸용/g,                                 'compatible'],
  [/호환/g,                                 'compatible'],
  [/포함/g,                                 'included'],
  [/사용자 정의/g,                          'user-defined'],
  [/당사 프로토콜/g,                        'proprietary protocol'],
  [/CPU 사양에 따름/g,                      'depends on CPU spec'],
  [/분할/g,                                 'div.'],
  [/명령어/g,                               'instruction'],

  // ── 동작/연산 방식 ────────────────────────────────────────────
  [/반복 연산,?\s*/g,                        'Cyclic, '],
  [/정주기 인터럽트 연산/g,                  'Fixed-period interrupt'],
  [/정주기 연산/g,                           'Fixed-period operation'],
  [/Stored Program \(ROM모드 방식\)/g,       'Stored Program (ROM mode)'],
  [/Stored Program/g,                       'Stored Program'],
  [/VBScript 기반/g,                        'VBScript-based'],

  // ── 숫자+단위 패턴 ────────────────────────────────────────────
  [/(\d[\d,]*)점/g,                         '$1 pts'],
  [/(\d+)배/g,                              '$1x'],
  [/(\d+)개/g,                              '$1 ea'],
  [/(\d+)축/g,                              '$1-axis'],
  [/(\d+)채널/g,                            '$1 ch'],
  [/(\d+)포트/g,                            '$1 ports'],
  [/(\d+)단/g,                              '$1 stages'],
  [/(\d+) 슬롯/g,                           '$1 slots'],

  // ── 최대/이상/이하 ─────────────────────────────────────────────
  [/최대 (\d+)/g,                           'Max. $1'],
  [/최대\s+(\d)/g,                          'Max. $1'],
  [/최대/g,                                 'Max.'],
  [/이하/g,                                 'or less'],
  [/이상/g,                                 'or more'],

  // ── 이중화 관련 ───────────────────────────────────────────────
  [/이중화 데이터 동기 통신 모듈/g,          'Redundancy data sync comm. module'],
  [/이중화 설정용 MMI 모듈/g,               'Redundancy MMI config. module'],
  [/이중화 전원 공급 모듈/g,                'Redundancy power supply module'],
  [/이중화 전용/g,                           'Redundancy-only'],
  [/이중화/g,                               'Redundancy'],

  // ── 하드웨어/소자 ─────────────────────────────────────────────
  [/포토커플러/g,                            'photocoupler'],
  [/정전식/g,                               'capacitive'],
  [/저항막/g,                               'resistive'],
  [/알루미늄 다이캐스팅/g,                  'aluminum die-cast'],
  [/고휘도/g,                               'high brightness'],
  [/전면 패널/g,                            'front panel'],
  [/전면/g,                                 'front'],
  [/패널/g,                                 'panel'],
  [/절연/g,                                 'isolation'],
  [/채널간/g,                               'channel-to-channel'],
  [/열전대/g,                               'thermocouple'],
  [/분해능/g,                               'resolution'],

  // ── 단자/접속 ─────────────────────────────────────────────────
  [/커넥터형/g,                              'connector type'],
  [/단자형/g,                               'terminal type'],
  [/나사형/g,                               'screw type'],
  [/입력:/g,                                'Input:'],
  [/출력:/g,                                'Output:'],

  // ── User/접속 수 (제한없음을 없음보다 먼저) ───────────────────
  [/제한없음/g,                              'unlimited'],
  [/무한 TAG/g,                             'unlimited TAGs'],
  [/무한 User \([^)]+\)/g,                  'Unlimited Users'],
  [/무한/g,                                 'unlimited'],
  [/동시접속 User 제한없음/g,               'Concurrent users: unlimited'],
  [/동시접속 (\d+) User 이내/g,             'Concurrent users: $1 or fewer'],
  [/동시접속/g,                              'Concurrent connections'],
  [/(\d+) User 이내/g,                      '$1 users or fewer'],
  [/ 이내/g,                               ' or fewer'],

  // ── SCADA 라이선스/기능 ───────────────────────────────────────
  [/뷰 컨트롤 버전 \(View Control Version\)/g, 'View Control Version'],
  [/뷰 컨트롤 버전/g,                       'View Control Version'],
  [/뷰 버전/g,                              'View Version'],
  [/전용 클라이언트\(CIMON View\) 감시 전용/g, 'CIMON View client (monitoring only)'],
  [/시스템 개발 및 실행용 제품/g,           'System development and runtime product'],
  [/시스템 실행용 제품/g,                   'System runtime product'],

  // ── PLC 통신/링크 ────────────────────────────────────────────
  [/PLC링크/g,                              'PLC link'],
  [/고속 PLC Link/g,                        'high-speed PLC Link'],
  [/사용자 프로토콜/g,                      'user protocol'],
  [/프로토콜 프로그램/g,                    'protocol program'],
  [/데이터 동기화/g,                        'data synchronization'],
  [/전원 모니터링/g,                        'power monitoring'],

  // ── 견적 카탈로그 구분/모듈명 ────────────────────────────────
  [/I\/O Digital 모듈/g,                    'Digital I/O Module'],
  [/I\/O Analog 모듈/g,                     'Analog I/O Module'],
  [/CPU 모듈/g,                             'CPU Module'],
  [/전원 모듈/g,                             'Power Module'],
  [/베이스 모듈/g,                           'Base Module'],
  [/증설 모듈/g,                             'Extension Module'],
  [/특수 모듈/g,                             'Special Module'],
  [/통신 모듈/g,                             'Communication Module'],
  [/베이스의 빈 슬롯 마감 용/g,             'for blank slot cover on base'],
  [/시리즈 베이스 전체/g,                   'series all bases'],
  [/전원/g,                                 'power'],
  [/베이스/g,                               'base'],
  [/리모트/g,                               'remote'],

  // ── 전압/전류 ─────────────────────────────────────────────────
  [/전압:/g,                                'Voltage:'],
  [/전류:/g,                                'Current:'],
  [/전압 (\d)/g,                            'Voltage $1'],
  [/전류 (\d)/g,                            'Current $1'],

  // ── 운동 제어 ─────────────────────────────────────────────────
  [/직선\/원호 보간/g,                      'linear/circular interpolation'],
  [/단순 펄스 출력/g,                       'simple pulse output'],
  [/주파수·DUTY 비 동시/g,                  'simultaneous freq./DUTY ratio'],
  [/운전 모드 설정/g,                       'operation mode settings'],
  [/절체 스위치/g,                          'changeover switch'],
  [/시험 버튼 구비/g,                       'with test button'],

  // ── 연결/케이블 ───────────────────────────────────────────────
  [/케이블/g,                               'cable'],
  [/전송 거리/g,                            'transmission distance'],
  [/노드-노드/g,                            'node-to-node'],
  [/널모뎀 전용/g,                          'null-modem only'],

  // ── 기타 부품/구조 ────────────────────────────────────────────
  [/베이스의 빈 슬롯 마감 용/g,             'for blank slot cover on base'],
  [/시리즈 베이스 전체/g,                   'series all bases'],
  [/간의/g,                                 'between'],
  [/부와/g,                                 'section and'],
  [/ 부 /g,                                 ' section '],
  [/ 형 /g,                                 ' type '],
  [/ 형$/gm,                               ' type'],

  // ── 등/연동/기반 ──────────────────────────────────────────────
  [/ 등\)/g,                                ' etc.)'],
  [/ 등,/g,                                ' etc.,'],
  [/ 등$/gm,                               ' etc.'],
  [/ 등 /g,                                ' etc. '],
  [/연동/g,                                 'integration'],
  [/기반/g,                                 'based'],

  // ── 일반 단어 ─────────────────────────────────────────────────
  [/표준형/g,                               'Standard'],
  [/\(표준\)/g,                             '(Standard)'],
  [/모드/g,                                 'mode'],
  [/옵션\)/g,                              'option)'],
  [/시리즈/g,                               'series'],
  [/확장 모듈/g,                            'expansion module'],
  [/확장/g,                                 'expansion'],
  [/단자 블록/g,                            'terminal block'],
  [/단자/g,                                 'terminal'],
  [/속도\/위치제어/g,                       'speed/position control'],
  [/위치\/속도제어/g,                       'position/speed control'],
  [/위치제어/g,                             'position control'],
  [/속도제어/g,                             'speed control'],
  [/제어/g,                                 'control'],
  [/공동/g,                                 'shared'],
  [/멀티/g,                                 'multi-'],
  [/모듈/g,                                 'module'],
  [/서보 드라이버/g,                        'servo driver'],
  [/동적 계량용/g,                          'for dynamic weighing'],
  [/아날로그/g,                             'analog'],
  [/디지털/g,                               'digital'],
  [/옵션가능/g,                             'Optional'],
  [/옵션 가능/g,                            'Optional'],
  [/푸쉬버튼 타입/g,                        'pushbutton type'],
  [/펌웨어 업그레이드/g,                    'firmware upgrade'],
  [/가능/g,                                 'available'],
  [/지원/g,                                 'Supported'],
  [/내장 배터리/g,                          'Built-in battery'],
  [/내장 (\d+)CH/gi,                        'Built-in $1 CH'],
  [/내장/g,                                 'built-in'],
  [/비결로/g,                               'non-condensing'],
  [/접속타입 : /g,                          'Connector: '],
  [/접속타입: /g,                           'Connector: '],
  [/더미 모듈 \(베이스 빈 슬롯 마감\)/g,   'Dummy module (blank slot cover)'],
  [/더미 모듈/g,                            'Dummy module'],
  [/실수연산:/g,                            'Float:'],
  [/실수연산 /g,                            'Float '],
  [/기본 명령/g,                            'basic instructions'],
  [/기본\)/g,                               'basic)'],
  [/\(기본\)/g,                             '(default)'],
  [/선택/g,                                 'selectable'],
  [/고속카운터/g,                           'HSC'],
  [/없음/g,                                 'None'],
  // 통신 접속 방식
  [/Terminal Block/g,                       'Terminal Block'],
];

export function translateSpecValue(value: string, lang: 'ko' | 'en'): string {
  if (lang === 'ko') return value;
  let v = value;
  for (const [re, rep] of TOKENS) {
    v = v.replace(re, rep);
  }
  return v;
}
