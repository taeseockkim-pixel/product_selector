# 견적 작성자 "프로젝트사업실" 및 Drive 경로 분리

## 목표

기존 "기타" 작성자 옵션을 "프로젝트사업실"로 변경하고, 프로젝트사업실 명의로 작성된 견적은
기존 담당자들과 완전히 분리된 별도 Drive 공유 드라이브에 저장·관리한다.

## 완료 내용

- `QuoteFormPage.tsx`: 작성자 선택의 `기타` → `프로젝트사업실`로 변경 (직접 이름/연락처/이메일 입력 방식은 유지)
- `QuoteAuthor` 타입에 `authorTeam?: string` 필드 추가 — 프로젝트사업실 선택 시 `'프로젝트사업실'`이 실려 Apps Script로 전달됨
- `server/appsScriptQuote.js`: `/api/google/quote` fallback 경로에도 `authorTeam` 패스스루 추가
- Apps Script `Code.gs`:
  - `CONFIG.PROJECT_ROOT_FOLDER_ID` 추가 (프로젝트사업실 전용 공유 드라이브 ID)
  - `resolveRootFolderId(details)`: `authorTeam === '프로젝트사업실'`이면 `PROJECT_ROOT_FOLDER_ID`, 아니면 기존 `ROOT_FOLDER_ID` 반환
  - `getYearSystem(year, rootFolderId)` / `getNextQuoteNumber(rootFolderId)`가 루트 폴더 ID를 매개변수로 받도록 변경 → 연도 폴더/대장/견적번호 시퀀스가 프로젝트사업실과 기존 담당자 사이에 완전히 독립적으로 관리됨
  - `diagnoseDriveConfig()` 진단 함수에 `PROJECT_ROOT_FOLDER_ID` 점검 항목 추가

## 알려진 제한

- `getQuoteLedgerFromReact()`(견적 목록 화면)는 여전히 기존 `ROOT_FOLDER_ID` 대장만 조회한다.
  프로젝트사업실 견적은 이 화면에 표시되지 않으며, 해당 공유 드라이브의 대장 시트를 직접 열어야 확인 가능하다.
- 견적번호 형식(`기술영업 YYMM-NNN`)은 공유하지만 카운트는 대장별로 독립적이므로, 같은 번호가
  기존 대장과 프로젝트사업실 대장에 동시에 존재할 수 있다 (의도된 동작).

## 배포 시 주의

`APPS_SCRIPT_Code_gs_전체교체코드.txt`를 Apps Script `Code.gs`에 반영한 뒤, **배포 관리에서
실제 사용 중인 배포 항목을 "새 버전"으로 갱신**해야 한다("새 배포"를 누르면 별도 URL이 생겨
기존 사용 URL에는 반영되지 않으니 주의).
