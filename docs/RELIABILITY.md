# RELIABILITY.md — 안정성 & 배포

---

## 배포 파이프라인

```
로컬 개발
  │  git push origin main
  ▼
GitHub (taeseockkim-pixel/product_selector)
  │  Vercel GitHub 연동 자동 감지
  ▼
Vercel 빌드 (npm run build)
  │  빌드 성공 시
  ▼
Vercel CDN 배포 (전 세계 엣지 노드) + api/google/quote 및 api/ai/query 서버리스 함수 배포
```

**배포 소요 시간**: ~1~2분 (정적 SPA 빌드)  
**배포 실패 시**: 이전 배포 자동 유지 (Vercel 롤백)

**참고**: 운영 접속은 Apps Script wrapper URL을 사용한다. wrapper는 Vercel 앱을 iframe으로 표시하고, 견적 저장/메일 초안 생성은 `google.script.run`으로 기존 Apps Script `processQuote`에 위임한다. `/api/google/quote`는 wrapper 밖에서 직접 Vercel 앱을 열었을 때의 fallback이다.
`server/` 폴더의 `/api/local/*`(Express, XLSX/PDF 생성)는 Vercel 배포 대상이 아니다 — `npm run local`로 로컬에서만 구동된다. 자세한 구조는
[ARCHITECTURE.md](../ARCHITECTURE.md#견적서-기능-아키텍처) 참조.
견적 작성 중인 입력값과 품목은 `cimon-quote-draft:<계정 이메일>` localStorage 키에 계정별로 보존된다. 사용자가 수동으로 초기화하거나 견적 저장/메일 초안 생성이 성공한 경우에만 삭제된다.
견적 목록의 연도 선택과 14개 단위 파일 분할은 Apps Script 전체 교체용 `APPS_SCRIPT_Code_gs_전체교체코드.txt` 및 `APPS_SCRIPT_Index_html_전체교체코드.txt`에도 반영해야 한다. Apps Script를 새 버전으로 배포하고, 분할 생성 로직이 포함된 `agent/index.js`를 저장 PC에서 재시작해야 운영에 적용된다.
AI 검색의 개인 OpenRouter API 키는 요청 처리 중에만 사용하고 localStorage·서버 파일·데이터베이스에 저장하지 않는다. 요청은 로그인한 작성자의 부서 데이터로 제한하고 담당자·연락처·이메일을 포함하므로 OpenRouter ZDR 제공자 제한을 우선 사용한다. OpenRouter 키를 소스 코드나 Vercel 빌드 환경변수에 넣지 않는다.

---

## 커밋 & 배포 절차 (Commit & Deploy SOP)

수정 완료 후 **반드시 이 순서대로** 실행하세요.

### 1단계 — 데이터/스펙 검증 (products.json 변경 시)

```bash
npm run validate:specs          # catalog/estimated 비율 확인
npm run check:spec-consistency  # ERROR 0건 확인 (WARN은 허용 목록 대조)
npm run check:i18n              # 번역 누락 0건 확인
```

> **기준**: `check:spec-consistency` ERROR 0건, `check:i18n` 0건이어야 커밋 가능.  
> WARN은 `docs/SPEC_ENTRY_RULES.md` 섹션 8의 허용 목록과 대조 후 판단.

### 2단계 — 전체 빌드 검증

```bash
npm run verify    # TypeScript + 빌드 + 파일 존재 + JSON 무결성 일괄 확인
```

> 모든 항목 통과 시에만 다음 단계 진행.

### 3단계 — 커밋

커밋 메시지 형식:

```
<type>(<scope>): <요약>

[선택] 왜 이 변경이 필요한지 한 문장

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

| type | 언제 |
|---|---|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정, UI 오류 수정 |
| `data` | products.json 데이터 변경 |
| `docs` | 문서만 변경 |
| `refactor` | 기능 변화 없는 코드 개선 |
| `chore` | 빌드/스크립트/설정 변경 |

scope: `plc` `ipc` `scada` `xpanel` `filter` `compare` `cart` `specs` `i18n` `ui`

```bash
git add <변경된 파일들>    # -A 또는 . 대신 파일명 명시 권장
git commit -m "$(cat <<'EOF'
data(specs): <요약>

<이유 한 문장>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### 4단계 — 배포 (push)

```bash
git push origin main
```

> `main` 브랜치 push → GitHub → Vercel 자동 빌드 → CDN 배포 (~1~2분)

### 5단계 — 배포 확인

1. Vercel 대시보드 → Deployments → 최신 빌드 상태 확인
2. 라이브 URL에서 변경된 카테고리 동작 확인
3. 빌드 실패 시: 로컬 `npm run build` 로 오류 재현 → 수정 후 재푸시

---

## 빠른 참조 — 검증 명령어 모음

```bash
npm run validate:specs          # catalog 비율 검사
npm run check:spec-consistency  # 시리즈 내 스펙 일관성 (ERROR 0 목표)
npm run check:i18n              # 영문 번역 누락 (0건 목표)
npm run generate:quote-products # Product_Prise.xlsx 변경 시 견적 추가용 카탈로그 재생성
npm run verify                  # 전체 통합 검증 (커밋 전 필수)
npm run dev                     # 로컬 개발 서버
npm run build                   # 프로덕션 빌드 확인
```

---

## 모니터링

| 항목 | 방법 |
|---|---|
| 빌드 상태 | Vercel 대시보드 → Deployments |
| 에러 모니터링 | 현재 미설정 (Sentry 도입 검토) |
| 성능 모니터링 | 현재 미설정 (Vercel Analytics 도입 검토) |

---

## 데이터 변경 안전 절차

`products.json` 을 직접 수정할 때:

1. JSON 유효성 확인: `node -e "JSON.parse(require('fs').readFileSync('src/data/products.json','utf-8'))"`
2. TypeScript 확인: `npx tsc --noEmit`
3. 브라우저 테스트: `npm run dev` → 전체 카테고리 클릭
4. 커밋 & 푸시: Vercel 자동 배포

`Quote_manage/기본자료/Product_Prise.xlsx` 기준 견적 품목/단가를 갱신할 때:

1. `npm run generate:quote-products` 실행
2. `src/data/quoteProductCatalog.ts` 변경 확인
3. `npm run verify` 실행

견적서 품목 금액은 `단가 × 배율 × 수량`으로 계산한다. 배율을 변경하는 기능을 수정할 때는
`QuoteFormPage.tsx`, 미리보기/인쇄 HTML, CSV 및 Apps Script 운영용 코드의 계산이
같은 규칙을 사용하는지 확인한다. 고객용 Excel/PDF 출력에는 배율 열 없이 단가 칸에
유효 단가(`단가 × 배율`)만 기록한다. 변경 후 `npm run build`와 `npm run lint`를 실행한다.

---

## 장애 대응

### Vercel 배포 실패
1. Vercel 대시보드 → 실패 빌드 로그 확인
2. 로컬에서 `npm run build` 재현
3. 수정 후 재푸시

### products.json 깨짐
1. `git revert HEAD` 로 직전 커밋으로 복구
2. 또는 Vercel 대시보드 → Deployments → 이전 배포 "Promote to Production"

---

## 환경 변수

제품 카탈로그는 정적 데이터이므로 환경 변수 불필요. 운영 흐름은 Apps Script wrapper를 통해 실행되므로 서비스 계정 키가 필요 없다. AI 검색은 사용자가 입력한 개인 OpenRouter 키를 요청 본문으로 전달한다.

| 항목 | 용도 |
|---|---|
| `appscript/Index.wrapper.html` | Apps Script `Index.html`에 반영할 wrapper 화면 |
| `appscript/wrapper-code.patch.gs` | Apps Script `Code.gs`에 반영할 `doGet` 및 브릿지 함수 |
| `APPS_SCRIPT_Code_gs_전체교체코드.txt` | 견적관리대장 `일` 열, 제품군 정규화, 품목 배율 계산이 포함된 운영용 `Code.gs` 전체 코드 |
| `APPS_SCRIPT_WEB_APP_URL` | 선택. Vercel 앱을 wrapper 밖에서 직접 열어 `/api/google/quote` fallback을 사용할 때만 필요 |
| `OPENROUTER_API_KEY` | 사용하지 않음. 개인 키는 사용자 화면에서 일시적으로 입력하며 저장하지 않음 |

Apps Script 프로젝트는 `CIMON의 모든 사용자` 접근 권한으로 배포할 수 있다. 사용자가 Apps Script URL로 접속하면 CIMON 로그인 세션 안에서 `google.script.run`이 실행되므로 Vercel 서버가 Apps Script를 직접 호출하지 않는다.
현재 운영 설정은 액세스 사용자의 권한으로 실행하므로, 작성자 DB 시트와 본인 부서의 Drive 대장 폴더도 해당 사용자 계정에 읽기 권한이 있어야 한다. Apps Script의 이메일·부서 등록은 Drive 공유 권한을 자동으로 부여하지 않는다.

### Apps Script `CONFIG`의 Drive ID (Code.gs 상단)

| 키 | 가리키는 대상 | 비고 |
|---|---|---|
| `DEPARTMENT_ROOTS` | 부서별 견적 저장 루트 폴더 (`기술영업`/`영업`/`프로젝트`) | 견적 목록 권한은 작성자 DB의 이메일·부서 검증을 통과한 뒤 해당 루트만 사용한다. 부서가 불명확한 일반 계정은 기본 기술영업으로 넘기지 않고 거부한다 |
| `AUTHOR_DB_SHEET_ID` / `AUTHOR_DB_SHEET_NAME` | 공유 폴더의 `견적관리시스템_작성자` 스프레드시트 및 탭 이름 | 열 구성: 작성자/연락처/이메일/부서. 작성자 목록과 이메일·부서 권한 판정이 동일한 시트를 사용 |
| `TEMPLATE_ID` | "견적서 샘플" 시트 | 더 이상 PDF 생성에 쓰지 않음(메일 첨부는 에이전트의 Excel PDF 사용). 진단 함수의 접근 점검 용도로만 남아 있음 |
| `LEDGER_TEMPLATE_ID` | "견적관리대장 샘플" 시트 | 새 연도 폴더가 생성될 때만 `makeCopy()`로 복사, 탭 이름이 `LEDGER_SHEET_NAME`(`견적관리대장`)과 정확히 일치해야 함 |
| `AGENT_QUEUE_FOLDER_NAME` | "견적에이전트" 폴더 (작성자 DB 시트와 같은 위치에 자동 생성) | 로컬 저장 에이전트와 pending/results 파일을 주고받는 대기열 폴더 |

이 값들이 실제 Drive 항목과 어긋나면 "입력한 ID에 해당하는 항목이 없습니다" 예외가 발생하며, 저장하기와 견적 목록 조회가 동시에 실패한다(`getYearSystem()`을 공통으로 거치기 때문). Code.gs를 전체 교체할 때는 이 ID들이 실제 Drive 구조와 일치하는지 반드시 재확인한다.

### 사내 PC 로컬 저장 에이전트 (`agent/`)

견적 파일(XLSX/PDF)은 구글 드라이브 대신 사내 PC(`172.35.12.36`)에 저장한다 (구글 용량 절약).
회사 정책상 익명 웹 앱 배포가 불가능하므로, 에이전트와 Apps Script는 **Google Drive 폴더를
통해 파일을 주고받는다** (인증·토큰·별도 배포 불필요).

```
저장하기 → Apps Script: 번호 예약
                 + "견적에이전트/pending" 폴더에 견적 JSON 생성 (대장 행은 아직 생성하지 않음)
                       ↓ Google Drive 데스크톱 동기화 (회사 허용 정식 앱, 양방향)
agent/index.js (172.35.12.36 PC, Node 18+, Excel 필요)
    ├─ pending 폴더 감시(10초) → fillTemplate.js로 XLSX 생성 → Excel COM으로 PDF 변환
    ├─ {storageRoot}\{부서}\{연도}\{번호_업체명}\ 저장
    ├─ results 폴더에 완료 보고 JSON 기록 (성공 1회 실패 시 재시도 3회 후 실패 보고)
    └─ HTTP 파일 서버(8790 포트)로 사내에서 견적 파일 다운로드 제공
[Apps Script] 1분 트리거 processAgentResults → 성공 보고 확인 후 대장 행/스냅샷 기록 → 파일링크를 사내 URL로 갱신
```

- 대기/완료 JSON은 KB 단위 텍스트라 Drive 용량 영향이 미미하며, 처리 후 즉시 삭제된다
- **Gmail 초안(이메일 발송)**: 저장된 Excel PDF를 그대로 첨부한다. 에이전트가 최종 PDF를 `attachments/`에 복사하고 manifest를 마지막에 쓰면, 요청자의 상태 조회(`getQuoteOperationStatusFromReact`) 또는 견적 목록 조회 때 Apps Script가 요청자 본인 Gmail에 초안을 만들고 요청/첨부 파일을 영구 삭제한다. 대장 반영이 끝나도 초안이 아직이면 상태는 `pending(stage: draft)`로 유지된다.
- **메일 초안 실패 정책**: 에이전트가 PDF 생성/전달에 실패하면(manifest `ok:false`, 파일 수 불일치, Gmail 오류, 24시간 경과) **초안을 만들지 않고** 화면에 오류와 파일링크 안내를 보여 준다. 모양이 다른 PDF를 대신 첨부하지 않는다. 견적 저장 자체는 유지된다. 요청 파일은 요청자만 처리하며(`requesterEmail`), 24시간 지난 요청/첨부는 1분 트리거가 정리한다.
- **초안 BCC**: 견적 메일은 요청 파일의 `requesterEmail`, 발주요청 메일은 현재 인증된 Google 계정 이메일을 `GmailApp.createDraft` 옵션의 `bcc`로 넣는다. 발주요청 메일의 To/고정 CC는 기존 값 그대로 유지한다.
- **에이전트 가동 확인**: 에이전트는 20초마다 `견적에이전트/heartbeat.json`을 쓴다(`features: ["draftAttachments"]`). `processQuote`는 접수 전에 수정 시각이 150초보다 오래되었거나 `stopped`가 true이거나 파일이 없으면 접수하지 않는다. 이메일 요청은 기능 목록에 `draftAttachments`가 있어야 한다. 에이전트가 정상 종료(Ctrl+C 등)하면 `stopped` 표시를 남겨 즉시 거부되고, 중복 실행으로 바로 종료되는 프로세스는 신호를 덮어쓰지 않는다. 에이전트가 PDF 변환으로 오래 응답하지 못해도 150초 안에는 접수된다. `diagnoseAgentStatus()`(편집기 또는 `google.script.run`)를 실행하면 신호 나이·버전·기능과 접수 가능 여부를 볼 수 있다.
- 견적 저장 화면은 `getQuoteOperationStatusFromReact(operationId)`의 짧은 캐시 상태를 조회한다. 대장 전체와 모든 RichText 파일링크를 반복 재조회하지 않는다. 링크 작업 결과 처리 후 Apps Script가 `pending/completed/failed` 상태를 갱신한다.
- **속도 개선**: ① 숨김 Excel 상시 대기 워커(`server/excelPdfWorker.js`, 재사용 변환 약 0.6초 vs 일회성 약 2.6초, 실패 시 일회성 변환으로 자동 전환, `useExcelWorker:false`로 끌 수 있음) ② 작성자 DB 3분 캐시(권한 확인·폴링 가속) ③ 대장 사본 내보내기를 대기열로 넘겨 완료 상태를 먼저 기록 ④ 같은 대장을 두 번 열지 않음(`getNextQuoteNumber`, `updateLedgerLink_`) ⑤ 에이전트 폴링 1초, 화면 첫 상태 조회 2.5초 지연. 에이전트 완료 보고의 `timings`와 Apps Script 로그 `[성능] 단계별 시간`으로 단계별 소요 시간을 확인한다.
- **잔여 Excel 정리**: Node가 갑자기 종료되면 Windows가 PowerShell 워커도 함께 종료해 숨김 Excel이 남을 수 있다. 워커가 만든 Excel PID를 `agent/excel-worker.pid`에 기록하고, 다음 에이전트 시작 때 창이 없는 EXCEL 프로세스만 종료한다(사용자가 직접 연 Excel은 건드리지 않는다).
- 비고는 UI, Apps Script, 로컬 XLSX/PDF 생성에서 **최대 300자**로 제한하며, 서버 Excel PDF는 필요할 때만 글자를 줄인다(품목 최소 8pt, 비고 9~7pt).
- 에이전트 실행: 대상 PC에 프로젝트 복제 → `npm install` → Google Drive 데스크톱 설치·로그인 →
  `agent/config.example.json`을 `agent/config.json`으로 복사해 값 입력
  (`agentFolderPath`는 Drive 동기화된 `견적에이전트` 폴더의 로컬 경로 — 첫 저장 1회 후 자동 생성됨)
  → `start-agent.bat` 실행
- **1페이지 견적 PDF/비고 잘림 방지**: `server/fillTemplate.js`는 A1:J42 인쇄 범위, FitToPage 1×1, 제품명(B:C)·규격(D:F)의 줄바꿈/행별 높이 및 8pt 최소 글꼴을 설정한다. 8pt에서도 내용이 더 길면 잘라내지 않고 행을 키우며, Excel COM이 최종 1페이지에 맞춘다. `server/excelToPdf.js`도 PrintArea·Zoom=false·FitToPagesWide/Tall=1을 변환 시 다시 지정한다. 비고(B34:F40)는 높이를 늘리지 않고 줄바꿈과 위쪽 정렬을 적용하며 9~7pt로 맞춘다. 견적 입력의 비고는 최대 300자이고, 서버 생성 함수도 초과 값을 거부한다. 에이전트 PC 코드를 교체한 뒤에는 에이전트를 재시작해야 새 PDF에 반영된다.
- **입력 한글/자모 글꼴**: `server/fillTemplate.js`는 업체·연락처·거래조건·제품명/규격·비고·작성자 등 값에 한글 음절이나 호환 자모가 있으면 해당 셀만 `Malgun Gothic`으로 바꾼다. ExcelJS 템플릿의 공유 스타일이 옆 셀에 번지지 않도록 셀 스타일을 복제하며, 영문 전용 값은 원래 글꼴을 유지한다. 자모(예: `ㅅㄷㄴㅅ`)의 □ 대체 문자를 시험 PDF에서 확인하고, 에이전트 PC 업데이트 뒤에는 새 견적으로도 확인한다.
- **대표이사 텍스트/직인 출력**: `견적서 샘플.xlsx`의 회사명·대표이사 문구는 그림이 아닌 Excel floating text box(`xdr:sp`)다. ExcelJS는 셀 값을 기록하며 이 도형을 버리므로 `server/fillTemplate.js`가 XLSX 저장 후 원본 도형 앵커를 복원한다. 이 후처리를 제거하거나 템플릿/ExcelJS를 바꾸면 PDF 우측 하단의 “㈜ 싸이몬 대표이사 안재봉” 문구가 누락될 수 있다. 새 템플릿 변경 후 시험 견적 XLSX와 PDF에서 해당 문구 및 직인을 확인한다.
- 저장 직후에는 견적번호만 예약되고 목록 행은 아직 없을 수 있다. 에이전트가 XLSX/PDF 생성에 성공한 뒤(통상 1~3분) 대장 행과 파일링크가 함께 생성된다. 실패 시 대장에 파일 없는 행이 남지 않는다.
- **폴더 브라우저 비밀번호 접속**: `http://172.35.12.36:8790` 접속 시 부서 비밀번호를 입력하면
  자기 부서 폴더만 웹에서 탐색·다운로드할 수 있다 (`config.json`의 `folderPasswords`,
  모든 부서를 열람하는 `adminPassword`는 선택). 세션 쿠키는 12시간 유지되며 HTTP 평문이므로 사내망 전용
- 견적 목록의 `폴더` 버튼은 위 파일 브라우저를 새 탭으로 연다. 일반 브라우저는 보안상 주소창을
  숨길 수 없으므로, 열람 화면의 주소에는 `http://172.35.12.36:8790`이 표시된다. 목록의 파일링크
  셀 자체에는 URL 대신 PDF 파일명이 표시된다
- 견적 목록은 대장 전체 항목 검색과 헤더별 오름차순/내림차순 정렬을 프론트엔드에서 수행하며,
  가로 스크롤 없이 고정 테이블로 표시한다. 견적 작성 화면은 같은 부서 대장에서 업체명/담당자
  고객정보를 조회하고 중복 결과 선택 창을 제공한다
- **파일링크는 HMAC 서명 링크**다: 에이전트가 `config.json`의 `fileLinkSecret`으로
  부서 경로를 서명하고, 파일 서버가 서명을 검증한 뒤에만 파일을 제공한다.
  각 부서는 자기 부서 대장의 링크(=자기 부서 경로)만 받으므로 다른 부서 경로나
  상위 경로를 URL로 직접 열 수 없고, 폴더 목록(브라우징)도 제공하지 않는다.
  `fileLinkSecret`을 변경하면 기존 링크는 모두 무효가 된다
- 처리 실패 3회 누적 시 대기 JSON은 `failed` 폴더로 이동되며, 원인 복구 후 수동으로
  pending 폴더에 되돌리면 재처리된다

견적관리대장 열을 변경할 때는 `saveToLedgerSheet()`의 행 배열과 `Code.gs` 상단의 `LEDGER_COL` 상수를
함께 수정한다. 운영 열 순서는 `NO, 년도, 월, 일, 발주, 작성자, 견적번호, 업체명, 고객명, 연락처,
이메일, 제품 항목, 제품명, 견적 금액, 비고, 파일링크, 적용현장`(A~Q, 17열)이다. **E열(발주)은
사용자가 대장에서 직접 체크/기록하는 열**이며(발주 체크박스 → `updateQuoteOrderFromReact()`), 신규/수정
저장 로직(`saveToLedgerSheet()`)은 이 열을 덮어쓰지 않는다. 작성자는 F열, 견적번호는 G열,
파일링크는 P열, 적용현장은 Q열이다. `assertLedgerLayout_()`는 E/F/G/P열의 주요 헤더를 확인해
구성이 다르면 저장 전에 오류를 낸다. **새 연도 대장 생성에 쓰는 `LEDGER_TEMPLATE_ID`도 같은 A~Q 구조여야 한다.**
과거 버전이 파일 링크 라벨을 O열 비고에 기록한 행은 목록 조회 시 스냅샷을 우선, 에이전트 통계를 보조로 사용해 O열 비고를 복원하고 P열 링크를 채운다. 열 구성 오류로 결과가 `견적에이전트/resultsFailed`에 `링크실패_*.json`으로 보존되었다면,
대장과 템플릿의 열을 바로잡고 Apps Script의 `recoverFailedLedgerResultsAfterLayoutFix()`를 실행한다.
이 함수는 동일 부서·연도·견적번호의 가장 최근 성공 결과만 재반영하며 원본 실패 기록은 보존한다.
`agent/quoteStats.js`의 전체 재스캔(`writeStatsJson`)은 원본 XLSX의 `notes`도 `stats/{부서}.json`에 포함해야 한다. 에이전트 파일을 갱신한 뒤 재시작하면 부서 통계를 다시 만들며, 이후 견적 목록 새로고침 때 남은 레거시 행이 자동 복구된다. 스냅샷·원본 XLSX·통계 JSON에 비고 원문이 전혀 없으면 해당 셀은 추측해 덮어쓰거나 비우지 않는다.

견적번호는 `<부서> YYMM-NNN` 형식이며 (예: `기술영업 2609-004`, `영업 2609-002`, `프로젝트 2609-002`),
NNN은 **대장 NO열(A열)에서 비어 있는 가장 작은 번호**다 (`getNextQuoteNumber()`가 사용 중인 번호를
전부 읽어 첫 번째 빈 번호를 찾는다; 대장이 비어 있으면 001부터 시작). 삭제 기능은 구현되어 있지
않으므로 정상 사용 중에는 이 값이 항상 "최대값 + 1"과 같지만, 사람이 대장 행을 직접 지우는 등
수동 편집이 있어도 안전하게 번호가 이어지도록 하는 방어적 구현이다. 대장의 NO는 견적번호의
`-NNN`과 항상 일치하도록 `saveToLedgerSheet()`가 견적번호에서 파싱해 기록한다. 부서별로 대장이
분리되어 있으므로 일련번호도 부서별로 독립적으로 관리된다.

**견적 수정(리비전)**: 견적 목록의 "수정" 버튼은 스냅샷 시트(`견적스냅샷`)에서 원본 데이터를 불러와
폼에 채운다. 저장 시 원본 견적번호는 그대로 두고 `{원본견적번호}_RevNN` 이름의 파일을 **원본과 같은
폴더**에 추가로 생성하며, 대장의 원본 행은 F열 작성자 및 G~O열 견적 정보를 갱신하고(A~E열은 그대로) P열(파일링크)에는
원본·각 Rev 링크가 `' | '`로 누적된다. 리비전 저장은 원본을 조회했던 연도/부서(`QuoteEditData.year`,
`QuoteEditData.department`)를 `revisionYear`/`revisionDepartment`로 그대로 전달해야 하며, 폼의
작성자 드롭다운에서 다른 사람을 선택해도 이 값이 우선한다 — 그렇지 않으면 로컬 에이전트가 원본과
다른 연도/부서 폴더에 파일을 저장하게 된다. **삭제 기능은 의도적으로 구현하지 않았다** (사용자 요청).
리비전 대상 연도의 폴더/대장이 없으면(연도 불일치 등) 새로 만들지 않고 즉시 실패 응답한다.

**서류 업로드**: 견적 목록에서 폴더 링크 옆 업로드 링크는 로컬 에이전트의 `/upload` 페이지로 연결되며,
해당 견적 폴더(연도/부서/견적번호_업체명 조합으로 검증)에 발주서·사업자등록증·PPT 등 파일을 추가한다.
확장자는 화이트리스트가 아니라 블랙리스트로 검사하며(`.exe`/`.bat`/`.js`/`.html` 등 실행·스크립트
파일만 차단, 그 외 형식은 모두 허용), 파일당 최대 1GB까지 업로드할 수 있다. 부서 비밀번호 로그인이
필요하다. (base64 인코딩으로 전송하므로 실제 HTTP 요청 본문은 원본 크기의 약 1.33배가 된다 —
`agent/index.js`의 `uploadJsonParser` limit도 함께 늘려야 한다.)


**활동 로그 (LOG)**: 로컬 저장 루트 아래 `LOG/{계정}/{YYYY-MM-DD}.log` 및 `LOG/전체_{YYYY-MM-DD}.log`에
사용자별 활동 내역이 일자별로 영구 기록된다. 신규 견적 저장(`[저장]`), 리비전 수정(`[수정]`),
서류 업로드(`[업로드]`), Gmail 초안 작성(`[이메일 송부]`), 발주 상태 변경(`[발주]`) 등 모든 주요 작업이
정확한 타임스탬프와 함께 자동으로 남는다.


### 작성자 부서별 Drive 경로 분기 (`resolveRootFolderId`)

프론트엔드는 작성자 DB 시트에서 읽어온 목록으로 드롭다운을 채우고, 선택된 작성자의 부서를 `QuoteAuthor.department`에 담아 Apps Script로 보낸다. `Code.gs`의 `resolveRootFolderId(details)`가 이 값을 보고 `CONFIG.DEPARTMENT_ROOTS[부서]`를 반환하며, `processQuote()`는 이 값을 `getNextQuoteNumber()`/`getYearSystem()`에 그대로 넘긴다. 그 결과 부서별로 폴더·대장·견적번호 시퀀스가 완전히 분리된다(견적번호는 `부서 YYMM-NNN` 형식이며 각자 자기 대장 안에서만 카운트되므로, 부서 간 동일한 번호가 존재할 수 있다 — 의도된 동작).

일반 사용자의 `getQuoteLedgerFromReact()`(견적 목록 화면)는 `getAuthorizedUserFromReact()`로 확인한
작성자 DB 시트에 등록된 **회사 Google 로그인 이메일**을 정규화해 접근 권한을 확인하고, 해당 행의 지원 부서만 대장 조회에 사용한다. 이메일이 없거나 로그인 이메일과 다르거나, 이메일이 여러 부서에 중복 등록되어 있으면 권한을 부여하지 않는다. 클라이언트가 다른 부서를 요청해도 서버가 요청값을 무시하고 **로그인 계정 본인의 부서** 대장만 조회한다. 반면 **관리자 계정**(`ADMIN_EMAILS` / `ADMIN_AUTHOR_EMAILS`)은 견적 목록 상단의 부서 선택 드롭다운을 통해 모든 부서(`기술영업`/`영업`/`프로젝트`)의 대장을 자유롭게 전환해 조회·수정·발주체크·업로드할 수 있다. 연도 선택 드롭다운은
`getAvailableLedgerYears_()`가 해당 부서 폴더에 실제로 `{연도}_견적관리대장` 파일이 존재하는 연도만 반환하며, 없는
연도를 선택해도 폴더/대장을 새로 만들지 않는다. 견적 목록에 표시되는 부서 배지(`quoteDepartment`)도
선택된 부서를 반영하며, 관리자일 때는 Admin 배지가 함께 표시된다.
