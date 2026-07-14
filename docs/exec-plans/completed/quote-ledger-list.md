# Google 견적관리대장 목록 연동

## 목표

견적 목록 화면을 브라우저 `localStorage` 캐시가 아닌 Google Drive의 현재 연도 `견적관리대장`과 일치시킨다.

## 완료 내용

- Apps Script에 `getQuoteLedgerFromReact()` 읽기 전용 조회 함수 추가
- wrapper에 `LOAD_QUOTE_LEDGER` 메시지 브릿지 추가
- Sheet 표시값, 헤더 순서, 파일 링크를 동적 테이블로 표시
- 로컬 견적 보기/삭제 액션 제거
- 새로고침 시 Google Sheet 재조회

## 배포 시 주의

`appscript/wrapper-code.patch.gs`와 `appscript/Index.wrapper.html`을 Apps Script 프로젝트에 반영한 뒤 새 Web App 버전으로 배포해야 한다.
