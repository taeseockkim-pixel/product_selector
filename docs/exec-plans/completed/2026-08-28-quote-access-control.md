# 작성자 DB 기반 견적 페이지 접근 권한 및 부서별 목록 조회

## 목표

작성자 DB 시트에 등록된 Google 계정만 견적 기능(견적 목록, 새 견적 작성)을 사용할 수 있게 하고,
접속 계정의 부서에 해당하는 견적관리대장만 목록에 표시한다.

## 완료 내용

### Apps Script (`Code.gs`)

- `readAuthorRows_()`: 작성자 시트 행 읽기를 공용 헬퍼로 추출 (`getAuthorsFromReact`와 공유)
- `getAuthorizedUserFromReact()`: `Session.getActiveUser().getEmail()`과 작성자 DB 이메일을 정규화해 비교한다. 이름만으로 권한을 부여하지 않으며, 부서를 시스템 키로 정규화한다.
- 부서가 지원되지 않거나 동일 이메일이 여러 부서에 중복 등록된 일반 계정은 거부한다. 관리자 이메일만 모든 부서를 사용할 수 있다.
- `getQuoteLedgerFromReact()`: 인증을 완료한 뒤에만 완료 큐를 처리하며, 일반 계정은 요청 payload의 부서 값을 무시하고 작성자 DB에 등록된 **본인 부서 대장만** 조회한다. 관리자는 선택된 부서 대장을 조회한다.
- 사용자 요청에 의한 완료 큐 반영도 해당 부서로 제한한다. 전체 처리는 기존 1분 주기 트리거가 담당한다.
- `npm run test:quote-auth`: 영문 헤더·표시명 이메일·부서 별칭·미지원/중복 부서·관리자 전체 조회·다른 부서 요청·완료 큐 부서 제한을 모의 검증한다.

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
| 작성자 DB에 이메일과 지원 부서가 1개로 등록된 계정 | 사용 가능 (자기 이름 자동 선택) | 자기 부서 대장만 표시 |
| 관리자 이메일 | 사용 가능 | 부서 선택으로 모든 부서 대장 표시 |
| 미등록 계정 | 팝업 후 차단 | - |
| 미지원 부서 또는 여러 부서 중복 등록 계정 | 오류 사유 표시 후 차단 | - |
| wrapper 밖 직접 접속 (계정 확인 불가) | 팝업 후 차단 | - |

## 배포 시 주의

- `APPS_SCRIPT_Code_gs_전체교체코드.txt` → `Code.gs` 전체 교체
- `APPS_SCRIPT_Index_html_전체교체코드.txt` → `Index.html` 전체 교체 (`LOAD_AUTHORIZED_USER` 브릿지 추가됨)
- 반영 후 배포 관리에서 사용 중인 배포를 "새 버전"으로 갱신
- 웹 앱 배포 설정이 `액세스: DOMAIN`, `실행: 사용자`여야 `Session.getActiveUser()`가
  접속자 이메일을 반환한다 (현재 설정 유지)

## 2026-10-07 권한 보강 및 운영 반영

- 이메일 값의 대소문자·표시명(`이름 <email>`)·숨은 공백을 정규화하고, 작성자 이름만으로 권한을 부여하지 않는다.
- `기술영업실`/`자동화영업실`/`프로젝트사업실`을 시스템 부서 키로 정규화한다. 지원하지 않는 부서나 여러 부서에 중복 등록된 이메일은 기본 부서로 우회시키지 않고 거부한다.
- 인증 후에만 대장 결과 큐를 확인하고, 사용자가 목록을 열 때는 해당 부서의 큐 결과만 처리한다.
- 운영 Apps Script 배포를 **v116**으로 갱신했다. 기존 배포 ID와 운영 `/exec` URL을 유지했으며, 새 배포 URL은 만들지 않았다. 운영 URL에서 `getAuthorizedUserFromReact()`의 읽기 전용 확인이 성공하는 것을 검증했다.
