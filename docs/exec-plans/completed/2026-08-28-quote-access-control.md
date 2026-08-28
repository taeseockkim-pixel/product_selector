# 작성자 DB 기반 견적 페이지 접근 권한 및 부서별 목록 조회

## 목표

작성자 DB 시트에 등록된 Google 계정만 견적 기능(견적 목록, 새 견적 작성)을 사용할 수 있게 하고,
접속 계정의 부서에 해당하는 견적관리대장만 목록에 표시한다.

## 완료 내용

### Apps Script (`Code.gs`)

- `readAuthorRows_()`: 작성자 시트 행 읽기를 공용 헬퍼로 추출 (`getAuthorsFromReact`와 공유)
- `getAuthorizedUserFromReact()`: `Session.getActiveUser().getEmail()`로 접속 계정을 확인해
  작성자 DB의 이메일 열과 매칭 → `{ authorized, author: {name, phone, email, department} }` 반환
- `getQuoteLedgerFromReact()`: 접속 계정의 부서로 `resolveRootFolderId()`를 거쳐
  **해당 부서 폴더의 대장만** 조회 (부서 미확인 시 기본 부서)

### 브릿지

- `appscript/Index.wrapper.html`, `APPS_SCRIPT_Index_html_전체교체코드.txt`:
  `LOAD_AUTHORIZED_USER` 메시지 브릿지 추가
- `appscript/wrapper-code.patch.gs`: `readAuthorRows_()`, `getAuthorizedUserFromReact()` 추가

### 프론트엔드

- `src/utils/appsScriptBridge.ts` 신규 생성: Apps Script 브릿지 타입·호출 헬퍼 통합
  (`fetchAuthors`, `fetchAuthorization`, Window.google 전역 타입)
- `App.tsx`: 마운트 시 권한 확인 1회 실행 → `견적 목록` 버튼/카트→견적 전환 시
  미등록 계정이면 alert 팝업("페이지 관리자에게 권한을 요청...") 후 차단,
  등록 계정이면 통과. 확인된 작성자 이름을 `QuoteFormPage.defaultAuthorName`으로 전달해 자기 이름 자동 선택
- `QuoteFormPage.tsx`: 브릿지 타입/헬퍼를 공용 모듈로 이관, `defaultAuthorName` prop 추가

## 동작 요약

| 접속 계정 | 견적 목록 / 새 견적 작성 | 견적 목록 내용 |
|---|---|---|
| 작성자 DB 등록 계정 | 사용 가능 (자기 이름 자동 선택) | 자기 부서 대장만 표시 |
| 미등록 계정 | 팝업 후 차단 | - |
| wrapper 밖 직접 접속 (계정 확인 불가) | 팝업 후 차단 | - |

## 배포 시 주의

- `APPS_SCRIPT_Code_gs_전체교체코드.txt` → `Code.gs` 전체 교체
- `APPS_SCRIPT_Index_html_전체교체코드.txt` → `Index.html` 전체 교체 (`LOAD_AUTHORIZED_USER` 브릿지 추가됨)
- 반영 후 배포 관리에서 사용 중인 배포를 "새 버전"으로 갱신
- 웹 앱 배포 설정이 `액세스: DOMAIN`, `실행: 사용자`여야 `Session.getActiveUser()`가
  접속자 이메일을 반환한다 (현재 설정 유지)
