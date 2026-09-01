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
Vercel CDN 배포 (전 세계 엣지 노드) + api/google/quote 서버리스 함수 배포
```

**배포 소요 시간**: ~1~2분 (정적 SPA 빌드)  
**배포 실패 시**: 이전 배포 자동 유지 (Vercel 롤백)

**참고**: 운영 접속은 Apps Script wrapper URL을 사용한다. wrapper는 Vercel 앱을 iframe으로 표시하고, 견적 저장/메일 초안 생성은 `google.script.run`으로 기존 Apps Script `processQuote`에 위임한다. `/api/google/quote`는 wrapper 밖에서 직접 Vercel 앱을 열었을 때의 fallback이다.
`server/` 폴더의 `/api/local/*`(Express, XLSX/PDF 생성)는 Vercel 배포 대상이 아니다 — `npm run local`로 로컬에서만 구동된다. 자세한 구조는
[ARCHITECTURE.md](../ARCHITECTURE.md#견적서-기능-아키텍처) 참조.

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

제품 카탈로그는 정적 데이터이므로 환경 변수 불필요. 운영 흐름은 Apps Script wrapper를 통해 실행되므로 서비스 계정 키가 필요 없다.

| 항목 | 용도 |
|---|---|
| `appscript/Index.wrapper.html` | Apps Script `Index.html`에 반영할 wrapper 화면 |
| `appscript/wrapper-code.patch.gs` | Apps Script `Code.gs`에 반영할 `doGet` 및 브릿지 함수 |
| `APPS_SCRIPT_Code_gs_전체교체코드.txt` | 견적관리대장 `일` 열, 제품군 정규화, 품목 배율 계산이 포함된 운영용 `Code.gs` 전체 코드 |
| `APPS_SCRIPT_WEB_APP_URL` | 선택. Vercel 앱을 wrapper 밖에서 직접 열어 `/api/google/quote` fallback을 사용할 때만 필요 |

Apps Script 프로젝트는 `CIMON의 모든 사용자` 접근 권한으로 배포할 수 있다. 사용자가 Apps Script URL로 접속하면 CIMON 로그인 세션 안에서 `google.script.run`이 실행되므로 Vercel 서버가 Apps Script를 직접 호출하지 않는다.

### Apps Script `CONFIG`의 Drive ID (Code.gs 상단)

| 키 | 가리키는 대상 | 비고 |
|---|---|---|
| `DEPARTMENT_ROOTS` | 부서별 견적 저장 루트 폴더 (`기술영업`/`영업`/`프로젝트`) | 부서가 없거나 목록에 없으면 `DEFAULT_DEPARTMENT`(기술영업) 폴더 사용. 각 폴더 아래에 연도 폴더·대장이 관리됨 |
| `AUTHOR_DB_SHEET_ID` | 작성자 DB 스프레드시트 (`시트1`) | 열 구성: 작성자(또는 이름) / 연락처 / 이메일 / 부서. 프론트엔드 작성자 드롭다운과 접근 권한 확인이 이 시트를 사용 |
| `TEMPLATE_ID` | "견적서 샘플" 시트 | Gmail 초안 첨부용 임시 PDF 생성에만 사용 (저장 후 즉시 영구 삭제) |
| `LEDGER_TEMPLATE_ID` | "견적관리대장 샘플" 시트 | 새 연도 폴더가 생성될 때만 `makeCopy()`로 복사, 탭 이름이 `LEDGER_SHEET_NAME`(`견적관리대장`)과 정확히 일치해야 함 |
| `QUEUE_SHEET_NAME` / `AGENT_TOKEN` | 사내 PC 로컬 저장 에이전트 대기열 | 작성자 DB 스프레드시트의 `저장대기열` 시트에 견적 데이터를 적재, 에이전트가 토큰으로 인증해 가져감 |

이 값들이 실제 Drive 항목과 어긋나면 "입력한 ID에 해당하는 항목이 없습니다" 예외가 발생하며, 저장하기와 견적 목록 조회가 동시에 실패한다(`getYearSystem()`을 공통으로 거치기 때문). Code.gs를 전체 교체할 때는 이 ID들이 실제 Drive 구조와 일치하는지 반드시 재확인한다.

### 사내 PC 로컬 저장 에이전트 (`agent/`)

견적 파일(XLSX/PDF)은 구글 드라이브 대신 사내 PC(`172.35.12.36`)에 저장한다 (구글 용량 절약).

```
저장하기 → Apps Script: 번호 발급 + 대장 기록 + 저장대기열 등록 (Drive에 파일 생성 안 함)
                ↑ 30초 폴링 (HTTPS 아웃바운드, 토큰 인증)
agent/index.js (172.35.12.36 PC, Node 18+, Excel 필요)
    ├─ 대기 견적 가져오기 → fillTemplate.js로 XLSX 생성 → Excel COM으로 PDF 변환
    ├─ {storageRoot}\{부서}\{연도}\{번호_업체명}\ 저장
    └─ 완료 보고 → 대장 파일링크를 사내 다운로드 URL로 갱신
    └─ HTTP 파일 서버(8790 포트)로 사내에서 견적 파일 다운로드 제공
```

- Gmail 초안(이메일 발송)은 첨부 PDF가 필요하므로 예외적으로 임시 시트/PDF를 만들고, **초안 생성 직후 영구 삭제**한다 (Drive v3 API DELETE, 용량 즉시 회수)
- 에이전트 실행: 대상 PC에 프로젝트 복제 → `npm install` → `agent/config.example.json`을 `agent/config.json`으로 복사해 값 입력(토큰은 Code.gs `AGENT_TOKEN`과 일치) → `npm run agent`
- 에이전트용 Apps Script 엔드포인트는 별도 배포(**액세스: 누구나**)로 발급한 URL을 `config.json`의 `appsScriptAgentUrl`에 넣는다. 이 배포에서는 `doPost`의 모든 동작이 토큰으로 보호된다
- 대장의 파일링크는 에이전트 완료 보고 이후 채워지므로, 저장 직후에는 비어 있다 (에이전트 중단 시 PENDING 행은 15분 후 자동 재클레임)

견적관리대장 열을 변경할 때는 `saveToLedgerSheet()`의 행 배열을 함께 수정한다. 현재 열 순서는 `NO, 연도, 월, 일, 견적번호, ...`이다.

견적번호는 `기술영업 YYMM-NNN` 형식이며, NNN은 **대장 NO열(A열)의 최대값 + 1**이다 (대장이 비어 있으면 001부터 시작, 행 삭제 시에도 최대 번호 기준으로 이어짐). 대장의 NO는 견적번호의 `-NNN`과 항상 일치하도록 `saveToLedgerSheet()`가 견적번호에서 파싱해 기록한다. 부서별로 대장이 분리되어 있으므로 일련번호도 부서별로 독립적으로 관리된다.

### 작성자 부서별 Drive 경로 분기 (`resolveRootFolderId`)

프론트엔드는 작성자 DB 시트에서 읽어온 목록으로 드롭다운을 채우고, 선택된 작성자의 부서를 `QuoteAuthor.department`에 담아 Apps Script로 보낸다. `Code.gs`의 `resolveRootFolderId(details)`가 이 값을 보고 `CONFIG.DEPARTMENT_ROOTS[부서]`를 반환하며, `processQuote()`는 이 값을 `getNextQuoteNumber()`/`getYearSystem()`에 그대로 넘긴다. 그 결과 부서별로 폴더·대장·견적번호 시퀀스가 완전히 분리된다(같은 "기술영업 YYMM-NNN" 형식이지만 각자 자기 대장 안에서만 카운트되므로, 부서 간 동일한 번호가 존재할 수 있다 — 의도된 동작).

**알려진 제한**: `getQuoteLedgerFromReact()`(견적 목록 화면)는 기본 부서(`DEFAULT_DEPARTMENT`) 대장만 조회한다. 다른 부서의 견적은 목록 화면에 표시되지 않고 각 부서 폴더의 대장에서만 확인 가능하다.
