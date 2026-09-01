# 사내 PC 로컬 저장 에이전트 (구글 드라이브 용량 절약)

## 목표

견적 파일(XLSX/PDF)의 저장 위치를 구글 드라이브에서 사내 PC(`172.35.12.36`)의
부서별 보안 폴더로 옮겨 구글 드라이브 용량 소모를 제거한다.
대장·견적번호·작성자 권한은 기존 Google Sheets 시스템을 그대로 유지한다.

## 아키텍처 (Pull 방식)

- Apps Script는 저장 시 견적 데이터를 작성자 DB 스프레드시트의 `저장대기열` 시트에
  등록만 하고, 드라이브에는 어떤 파일도 만들지 않는다.
- 사내 PC의 에이전트(`agent/index.js`)가 30초 간격으로 대기열을 폴링(HTTPS 아웃바운드)해
  견적을 가져온 뒤, PC에서 XLSX 생성(`server/fillTemplate.js` 재사용)과 PDF 변환
  (`server/excelToPdf.js`, Excel COM)을 수행해 부서별 폴더에 저장한다.
- 에이전트가 완료를 보고하면 대장의 파일링크가 사내 다운로드 URL
  (`http://172.35.12.36:8790/files/...`)로 채워진다.
- 에이전트는 같은 포트에서 HTTP 파일 서버를 구동해 사내에서 견적 파일을 내려받을 수 있게 한다.

## 주요 변경

- `APPS_SCRIPT_Code_gs_전체교체코드.txt`
  - `processQuote`: Drive 파일 생성 제거 → `enqueueLocalSave_()` 대기열 등록 + 대장 기록
  - `createTempQuotePdf_`: Gmail 초안용 임시 PDF만 생성 후 **영구 삭제**(Drive v3 DELETE) — 이메일 건의 Drive 사용량 즉시 회수
  - `doPost`: `AGENT_CLAIM`/`AGENT_COMPLETE` 액션 추가, 모든 doPost 동작 토큰 검증
  - `handleAgentClaim_`/`handleAgentComplete_`: 대기열 클레임(15분 스테일 재클레임)·완료 처리
  - CONFIG: `QUEUE_SHEET_NAME`, `AGENT_TOKEN` 추가
- `agent/index.js` (신규): 폴링 + 파일 생성 + 부서별 저장 + HTTP 파일 서버
- `agent/config.example.json` (신규): 설정 템플릿 (`agent/config.json`은 gitignore)
- `agent/templates/견적서 샘플.xlsx`: 에이전트 자체 템플릿 사본
- `server/fillTemplate.js`: 템플릿 경로를 선택 인자로 받도록 수정
- `server/appsScriptQuote.js`: doPost 토큰 검증 대응 `agentToken` 전달

## 알려진 제한

- 저장 직후 견적 목록의 파일링크는 비어 있고, 에이전트가 파일을 생성한 뒤 채워진다.
- 에이전트가 중단되면 대기 행은 쌓이며, 에이전트 재시작 시 자동 처리된다
  (15분 이상 CLAIMED 상태인 행은 자동 재클레임).
- 파일 서버는 HTTP(사내 LAN 전용)다. 외부 노출 금지.
- 견적 대장(Google Sheets)·작성자 DB는 여전히 구글에 있으나 텍스트 데이터라 용량 영향이 미미하다.

## 배포 (대상 PC에서)

1. 프로젝트 복제/복사 → `npm install`
2. `agent/config.example.json` → `agent/config.json` 복사 후 값 입력
   - `appsScriptAgentUrl`: Apps Script에서 **액세스: 누구나**로 별도 배포한 웹 앱 URL
   - `agentToken`: Code.gs `CONFIG.AGENT_TOKEN`과 동일한 값
   - `storageRoot` / `publicBaseUrl` / `httpPort`: 환경에 맞게
3. `npm run agent` 실행 (Node 18+, Windows + Excel 필요, 상시 가동 권장)
4. Apps Script `Code.gs` 교체 + 새 버전 배포 (사용 중 배포 갱신)
