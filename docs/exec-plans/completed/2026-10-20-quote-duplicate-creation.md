# 견적 중복 생성 방지 및 삭제 안전성

- 완료일: 2026-10-20
- 범위: 견적 저장 흐름(프론트·Apps Script·에이전트)과 영구삭제

## 배경

영업 2610-003 견적이 2건 생성된 뒤 1건을 영구삭제하자 남은 대장 행의 파일링크가 `Not found`를 반환하는 증상이 보고됐다. 저장 요청이 중복 생성될 수 있는 구조와, 한 행만 지우던 삭제 로직이 원인으로 확인됐다.

## 변경 내용

- **클라이언트 재진입 차단**: `submitInFlightRef`로 진행 중 연속 클릭/두 버튼 교차 클릭을 원자적으로 무시한다.
- **저장 멱등성**: 한 번의 사용자 확정마다 `requestToken`을 만들어 페이로드에 담는다. `processQuote`는 같은 토큰의 재요청이면 새 번호/대장 행을 만들지 않고 이미 접수한 결과(`newQuoteNumber`, `operationId`, `folderUrl`)를 반환한다. 접수 결과는 ScriptProperties에 24시간 보관한다. 번호 선택 모달을 거쳐도 같은 토큰을 재사용한다.
- **영구삭제 안전성**: 영구삭제 시 같은 기본 번호의 대장 행을 전부 찾아 아래에서부터 삭제해, 중복 행이 남아 삭제된 폴더를 가리키는 orphan 파일링크가 생기지 않게 한다.
- **에이전트 재처리 방지**: 성공한 작업을 `operationId` 기준 로컬 `agent/processed-jobs/`(config `processedJobsDir`) 표시로 남겨, Drive 재동기화로 같은 pending 파일이 다시 들어와도 재생성하지 않는다(30일 후 정리). Drive 동기화 폴더에는 만들지 않는다.
- **폴백 서버 전달**: `/api/google/quote`(Vercel·로컬 Express)도 `requestToken`을 Apps Script로 전달한다.

## 검증

- `npm run test:quote-draft`: 같은 토큰 재요청이 pending을 새로 만들지 않고 기존 번호를 반환하는지, 영구삭제가 같은 번호의 모든 행을 지우는지 확인
- `npm run test:agent-e2e`: 성공 처리 후 재동기화된 pending을 건너뛰는지 확인
- `npm run test:agent-queue`, `npm run test:quote-layout`, `npm run verify`

## 운영 적용

- 저장 PC 에이전트를 새 코드로 갱신·재시작한 뒤 Apps Script를 새 버전으로 배포한다(기존 배포 URL/ID 유지). 순서는 에이전트 먼저 → Apps Script.

## 후속 확인 필요

- 영업 2610-003의 실제 파일 존재 여부와 삭제 시점 스냅샷/대장 행 수는 운영 PC·Apps Script 실행 기록에서 확인이 필요하다. 삭제된 견적의 복구·재생성은 별도 승인 없이 수행하지 않는다.
