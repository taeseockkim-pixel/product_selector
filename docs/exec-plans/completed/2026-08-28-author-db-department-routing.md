# 작성자 DB 시트 연동 및 부서별 견적 관리

## 목표

작성자 목록을 Google Sheets의 작성자 DB에서 실시간으로 읽어와 드롭다운에 표시하고,
선택된 작성자의 부서에 따라 Drive 저장 경로·견적관리대장·견적번호를 부서별로 분리 관리한다.

## 완료 내용

### 프론트엔드 (`QuoteFormPage.tsx`)

- 마운트 시 Apps Script 브릿지(`LOAD_AUTHORS`)로 작성자 목록을 조회해 드롭다운에 표시
- 조회 실패 시 기존 고정 목록(`FALLBACK_AUTHORS`)으로 대체 — 폼이 깨지지 않음
- 이름 선택 시 시트의 연락처·이메일이 자동 매칭됨
- 시트에 연락처/이메일이 비어 있는 작성자만 수기 입력 필드 표시 (기존 "기타" 수기 입력의 일반화)
- 선택된 작성자의 부서를 `QuoteAuthor.department`에 담아 payload로 전송

### Apps Script (`Code.gs`)

- `getAuthorsFromReact()`: 작성자 DB 시트(`시트1`)에서 목록 조회.
  헤더 키워드(작성자/이름/성명, 연락처/전화, 이메일/메일, 부서/소속/팀)로 열 위치를 찾고,
  헤더가 없으면 A~D열 고정 순서로 해석
- `CONFIG.DEPARTMENT_ROOTS`: 부서별 루트 폴더 매핑 (기술영업/영업/프로젝트)
- `resolveRootFolderId(details)`: `details.authorDepartment`로 부서 폴더 결정,
  없으면 `DEFAULT_DEPARTMENT`(기술영업) 폴더 사용
- `getYearSystem()`/`getNextQuoteNumber()`는 기존처럼 루트 폴더 ID를 매개변수로 받아
  부서별로 연도 폴더·대장·견적번호 시퀀스를 독립 관리
- `diagnoseDriveConfig()`: 부서 폴더 3개 + 작성자 DB 시트 접근 점검으로 갱신

### 브릿지

- `appscript/Index.wrapper.html`, `APPS_SCRIPT_Index_html_전체교체코드.txt`:
  `LOAD_AUTHORS` 메시지 브릿지 추가
- `appscript/wrapper-code.patch.gs`: `getAuthorsFromReact()` 추가

## 알려진 제한

- 견적 목록 화면(`getQuoteLedgerFromReact()`)은 기본 부서(기술영업) 대장만 조회한다.
  다른 부서의 견적은 목록 화면에 표시되지 않고 각 부서 폴더의 대장에서만 확인 가능하다.
- 견적번호 형식(`기술영업 YYMM-NNN`)은 공유하지만 카운트는 부서 대장별로 독립적이므로,
  부서 간 동일한 번호가 존재할 수 있다 (의도된 동작).

## 배포 시 주의

- `APPS_SCRIPT_Code_gs_전체교체코드.txt` → Apps Script `Code.gs` 전체 교체
- `APPS_SCRIPT_Index_html_전체교체코드.txt` → Apps Script `Index.html` 전체 교체
  (이번에는 브릿지에 `LOAD_AUTHORS`가 추가되어 **둘 다 반영 필요**)
- 반영 후 **배포 관리에서 실제 사용 중인 배포 항목을 "새 버전"으로 갱신**
  ("새 배포"를 누르면 별도 URL이 생겨 기존 사용 URL에는 반영되지 않음)
