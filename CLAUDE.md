# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

CIMON 제품 선택 가이드 — PLC / IPC / SCADA / XPANEL 4개 카테고리, 260개 제품을 필터링·비교·담기할 수 있는 SPA. 제품 카탈로그는 빌드 타임에 모든 데이터가 번들에 포함되는 순수 정적 구조이지만, 견적서(Quote) 생성 기능은 `localStorage` 목록 + Apps Script Web App(Drive/Sheets/Gmail) + 로컬 전용 Express 서버(PDF/Excel 생성 보조)로 구성된 하이브리드 구조다. 자세한 내용은 아래 "견적서(Quote) 기능" 절 참조.

---

## 커맨드

```bash
npm run dev                    # 로컬 개발 서버 (HMR)
npm run build                  # 프로덕션 빌드 (tsc + vite)
npm run preview                # dist/ 로컬 미리보기

npm run verify                 # 커밋 전 전체 검증 (타입 체크 + 빌드 + 무결성)
npm run validate:specs         # catalog/estimated 비율 검사
npm run check:i18n             # 영문 번역 누수 0건 검사
npm run check:spec-consistency # 같은 시리즈 내 스펙 라벨 일관성 검사
npm run generate:quote-products # Product_Prise.xlsx → 견적 추가용 카탈로그 생성

npm run export:csv             # products.json → CSV 내보내기 (데이터 편집용)
npm run import:csv             # CSV → products.json 반영
npm run import:csv:dry         # CSV import 시뮬레이션 (실제 변경 없음)

npm run local                  # 빌드 후 로컬 Express 서버 구동 — 견적서 XLSX/PDF 생성용
                                # (server/index.js, Windows Excel COM 필요, Vercel에서는 미실행)
```

**커밋 전 필수 순서:**
1. 데이터 변경 시 → `npm run check:spec-consistency` (ERROR 0건)
2. i18n 변경 시 → `npm run check:i18n` (0건)
3. 항상 → `npm run verify` (전체 통과 후 커밋)

---

## 아키텍처

### 상태 관리

중앙 상태는 `App.tsx`의 `useState`만 사용. 외부 라이브러리 없음.

```
App.tsx
├── viewMode: 'main' | 'cart' | 'compare'
├── activeCategory: 'PLC' | 'IPC' | 'SCADA' | 'XPANEL'
├── cartList / compareList: string[]   ← product.id 기반
├── detailProduct: Product | null
├── [PLC] plcSeries, plcSubType
└── [IPC/SCADA/XPANEL] activeSubType, filters: Record<sectionId, string[]>
```

### 데이터 흐름

```
products.json  →(빌드 타임 import)→  PRODUCTS: Product[]
                                           ↓
                                       App.tsx (필터링)
                                       ├── filterPlcProducts()  ← plcTreeConfig.ts 참조
                                       └── filterByConfig()     ← filterConfig.ts 참조
                                           ↓
                                       ProductTable.tsx (렌더링 전용, 로직 없음)
```

### 컴포넌트 책임

`Table`, `Panel` 컴포넌트는 순수 렌더링 전담. 필터 로직은 반드시 `App.tsx` 또는 `config/`에서만 처리.

### 설정 레이어 (`src/config/`)

- **filterConfig.ts** — IPC/SCADA/XPANEL 필터 UI + 매칭 로직을 선언적으로 정의 (`SubTypeConfig` > `FilterSection` > `matcher`)
- **plcTreeConfig.ts** — PLC 좌측 트리 구조 (`PlcTreeGroup` > `PlcTreeLeaf`)
- **catalogConfig.ts** — 카탈로그 PDF / 메뉴얼 / 도면 파일 경로 매핑

새 필터 추가 시 `filterConfig.ts`의 `CATEGORY_CONFIGS`에만 선언 추가. 컴포넌트 수정 불필요.

---

## 견적서(Quote) 기능

카트에 담은 제품으로 견적서를 작성·저장·인쇄하는 기능. 제품 카탈로그와 달리 **정적 번들이 아니라
브라우저 저장소 + Apps Script Web App + 로컬 전용 서버를 사용하는 하이브리드 구조**다.

```
QuoteFormPage.tsx (입력 + quoteProductCatalog.ts/priceData.ts로 단가 계산, 배율×수량으로 합계 계산)
     │
     ▼
quoteStorage.ts → localStorage ("cimon-quotes", "cimon-quote-seq")  ← 목록 캐시
QuoteFormPage.tsx → localStorage ("cimon-quote-draft:<계정 이메일>")  ← 사용자별 미완성 초안
     │
     ├── (프로덕션/Vercel) api/quotes/index.ts, [id].ts
     │     └── 견적번호 발급만 담당하는 스텁. 실제 CRUD 없음.
     │
     ├── POST /api/google/quote
     │     └── Apps Script Web App 프록시
     │           └── 기존 Apps Script processQuote가 Drive/Sheets/Gmail 처리
     │
     └── (localhost 개발 환경일 때만) fetch('/api/local/save')
           └── server/index.js (Express, npm run local로 구동)
                 ├── fillTemplate.js → XLSX 생성
                 └── excelToPdf.js  → PDF 변환 (Windows Excel COM 필요)
```

- **저장 주체**: 회사 정책상 Apps Script를 `CIMON의 모든 사용자`로만 배포할 수 있으므로, 사용자는 Apps Script wrapper URL로 접속한다. wrapper는 Vercel 앱을 iframe으로 띄우고, 견적 저장/메일 요청은 `postMessage` → `google.script.run.processQuoteFromReact()` → 기존 `processQuote()` 흐름으로 처리한다. `src/utils/quoteStorage.ts`는 최근 작성 목록 캐시 역할만 한다.
- **견적 품목 추가**: `Quote_manage/기본자료/Product_Prise.xlsx`를
  `npm run generate:quote-products`로 변환한 `src/data/quoteProductCatalog.ts`를 사용한다. 사용자는
  견적 작성 화면에서 가격표 시트와 품명을 선택해 품목을 추가/삭제할 수 있다.
- **가격 계산**: 가격표 기반 추가 품목은 `quoteProductCatalog.ts`, 기존 카트 품목의 fallback은
  `src/data/priceData.ts`의 `getUnitPrice()`가 수량 구간별 단가를 조회한다. 최종 품목 금액은
  `단가 × 배율 × 수량`으로 계산되며 배율 기본값은 `1`이다. 배율은 화면·미리보기에는 표시되지만
  Excel/PDF/CSV 등 고객용 출력물에는 열로 노출하지 않고 `단가 × 배율`을 유효 단가로만 기록한다.
- **작성자 선택 / 접근 권한**: 작성자 목록은 Apps Script가 작성자 DB 시트(`CONFIG.AUTHOR_DB_SHEET_ID`의
  `시트1`, 열 구성: 작성자/연락처/이메일/부서)에서 실시간으로 읽어와 드롭다운에 표시한다.
  앱 마운트 시 `getAuthorizedUserFromReact()`가 `Session.getActiveUser().getEmail()`로 접속 계정을
  확인해 작성자 DB와 매칭하며, **미등록 계정은 견적 목록/새 견적 작성 진입 시 팝업으로 차단**된다.
  등록 계정은 자기 이름이 자동 선택되고 연락처·이메일이 매칭되며(시트에 비어 있으면 수기 입력),
  `QuoteAuthor.department`에 부서가 실려 Apps Script로 전달되면 `resolveRootFolderId()`가
  `CONFIG.DEPARTMENT_ROOTS[부서]` 폴더로 저장 경로를 분기한다. **견적 목록 화면도 접속 계정의
  부서 대장만 조회한다.**
- **인쇄**: `QuotePrintView.tsx` → `src/utils/quoteHtml.ts`로 HTML 생성 → iframe → 브라우저 인쇄.
- **견적 목록 파일링크**: Apps Script가 로컬 에이전트가 만든 PDF URL을 PDF 파일명으로 표시되는 RichText 링크로 대장에 기록한다. 목록 화면은 URL 대신 `부서 YYMM-NNN_업체명_견적서.pdf`를 표시하며, `폴더` 버튼으로 사내 파일 열람 페이지(`172.35.12.36:8790`)를 연다.
- **견적 목록 검색/정렬**: 대장 데이터를 불러온 뒤 검색어로 전체 항목을 필터링할 수 있고, 각 헤더를 눌러 오름차순/내림차순 정렬한다. 중복 검색 결과는 선택 창에서 특정 견적을 고를 수 있으며, 테이블은 고정 레이아웃과 줄바꿈으로 가로 스크롤 없이 표시한다.
- **견적 목록 연도 조회**: 목록은 현재 연도를 기본으로 조회하며, 최근 11개 연도 중 하나를 선택해 해당 부서의 연도별 대장을 읽을 수 있다. 존재하지 않는 연도를 조회할 때는 새 폴더·대장을 생성하지 않고 빈 목록을 표시한다.
- **고객정보 자동 매칭**: 견적 작성 화면에서 업체명 또는 담당자를 입력하고 포커스를 이동하면 현재 부서 대장의 기존 고객 정보를 찾아 업체명·담당자·연락처·이메일을 자동 입력한다. 동일한 이름이 여러 건이면 고객 선택 창을 표시한다.
- **견적 품목 분할 출력**: 작성 화면에서는 품목 수를 제한하지 않는다. Apps Script가 하나의 견적번호와 대장 행을 생성하고, 사내 저장 에이전트가 품목을 14개씩 같은 폴더의 `견적번호_1`, `견적번호_2` 파일로 나누어 XLSX/PDF를 생성한다.
- **미완성 초안 보존**: 견적 작성 입력값과 품목은 접속 계정 이메일별 localStorage 키에 저장한다. 페이지 이동이나 브라우저 재실행 후 같은 계정으로 진입하면 복원되며, 사용자가 `초기화`를 누르거나 견적 저장/메일 초안 생성이 성공한 경우에만 해당 초안을 삭제한다.
- **Google Workspace 연동**: Apps Script wrapper를 사용한다. 서비스 계정 JSON 키와 Domain-wide delegation은 필요하지 않으며, Apps Script 접근 권한은 `CIMON의 모든 사용자`로 유지할 수 있다.
- **로컬 전용 XLSX/PDF 자동 생성**: `server/` 폴더의 Express 서버는 `npm run local`로만 구동되며,
  Windows Excel COM 객체를 사용하므로 **Vercel 프로덕션 환경에서는 동작하지 않는다.** Vercel
  배포 시에는 이 로컬 저장 단계 자체가 생략된다.
- **api/quotes/**: Vercel 서버리스 함수지만 부서별 견적번호(`부서 YYMM-NNN`) 발급 외 실질적인
  저장/조회 로직은 없는 스텁 상태.
- **Apps Script 반영 파일**: `appscript/Index.wrapper.html` 내용을 Apps Script의 `Index.html`에 반영하고, `appscript/wrapper-code.patch.gs`의 `doGet`/`processQuoteFromReact`를 `Code.gs`에 반영한 뒤 새 버전으로 Web App을 배포한다. Vercel API fallback을 직접 쓸 때만 `APPS_SCRIPT_WEB_APP_URL`이 필요하다.
- **견적관리대장 기록**: 날짜는 `연도 / 월 / 일`로 나누어 저장한다. 제품 항목은 전체 견적 품목을 기준으로 제품군을 정규화하며, 여러 제품군은 `PLC, TOUCH`처럼 쉼표로 함께 기록하고 NET/RIO는 PLC에 포함한다.

---

## 핵심 규칙

### 절대 하지 말 것

- `products.json`의 기존 `id` 값 변경 — 카트/비교 상태가 id 기반
- `Product` 인터페이스 필드 삭제 — 다운스트림 파급 큼
- `App.tsx`에 비즈니스 로직 직접 추가 — config 레이어를 통해 처리
- 카탈로그 미확인 상태에서 `"source": "catalog"` spec 추가/수정

### 사이드바 레이아웃 규칙 — App Shell 방식 (재발 방지)

**사이드바 위치는 CSS 픽셀값(top-[120px], h-[calc(100vh-120px)] 등)으로 절대 계산하지 않는다.**

브라우저 확대/축소 시 헤더·탭의 실제 렌더링 높이가 하드코딩된 값과 달라져 위치가 틀어진다. 대신 **App Shell 구조**를 사용한다.

**현재 확정 구조 (App.tsx, 변경 시 이 문서도 동시 수정)**:
```jsx
{/* 최외곽: h-screen으로 뷰포트 전체 점유, 내부에서 독립 스크롤 */}
<div className="h-screen bg-[#f0ede8] flex flex-col overflow-hidden print:h-auto print:overflow-visible">
  <AppHeader />  {/* flex-none, sticky 없음 */}

  {/* 탭: flex-none으로 자연 높이, sticky 없음 */}
  <div className="bg-[#f0ede8] border-b ... flex-none">...</div>

  {/* 컨텐츠 영역: flex-1이 나머지 높이를 자동으로 채움 */}
  <div className="flex-1 overflow-hidden">
    <div className="h-full max-w-screen-xl mx-auto w-full flex gap-5 px-6 overflow-hidden">

      {/* 사이드바: 단순 블록, sticky/fixed height 없음 */}
      <div className="hidden md:block w-64 flex-shrink-0 no-print pt-6">
        <PlcLeftPanel /> or <LeftPanel />
      </div>

      {/* 우측: 독립 스크롤 */}
      <div className="flex-1 min-w-0 overflow-y-auto pb-8">...</div>
    </div>
  </div>
</div>
```

**패널 내부 `<aside>` 클래스 (top offset 없음)**:
```
w-full flex flex-col h-full
```

**핵심 원칙**:
- ❌ `sticky`, `top-[Npx]`, `h-[calc(100vh-Npx)]` — 줌/폰트 변화에 깨짐
- ❌ `PlcLeftPanel.tsx` / `LeftPanel.tsx` 내부 aside에 `pt-*`, `mt-*` 추가
- ✅ `flex-1 overflow-hidden` 체인으로 높이를 DOM 구조가 결정하게 함
- ✅ 사이드바 top padding은 App.tsx wrapper의 `pt-6` 한 곳에서만 제어
- ✅ 사이드바 내부 스크롤: 시리즈/제품타입 카드 `flex-shrink-0`, 트리/필터 카드 `flex-1 overflow-y-auto no-scrollbar`

### 새 제품 카테고리 추가 시 3-파일 동시 수정

`src/types/index.ts` + `src/config/filterConfig.ts` + `src/data/products.json`

### Product 타입 확장 시

`src/types/index.ts`에 항상 optional 필드(`?`)로 추가.

---

## 사양 데이터 거버넌스

`products.json`의 모든 `specs[]` 항목에 `source` 필드 필수:

| source | 의미 | UI 표시 |
|---|---|---|
| `"catalog"` | 공식 PDF 카탈로그 직접 확인 | **표시됨** |
| `"estimated"` | AI 추정 또는 미검증 | **숨김** |

카탈로그 미확인 값은 반드시 `"estimated"`로만 추가. `"catalog"` 수정은 `product_catalog/` 폴더의 PDF 직접 확인 후에만.

**스펙 표기 핵심 규칙** (전체: `docs/SPEC_ENTRY_RULES.md`):
- 온도: `-10°C ~ 65°C` (양쪽 °C, ~ 양옆 공백)
- 점수: `"16점"` (영문 ch/채널 금지)
- 해상도: `"1024 x 768"` (소문자 x, 공백 포함)
- 시리즈 내 동일 라벨은 같은 언어 사용 (KO/EN 혼용 금지)

### 인터페이스 스펙 입력 규칙 (재발 방지)

이더넷·통신·인터페이스 스펙은 모델명 접미사와 내부 필드가 일치하는지 **반드시** 교차 확인:

1. **모델명 접미사 → 유추 후 카탈로그 대조**
   - 예: `XT07CD-DE`의 `-DE`는 DC+Ethernet을 의미 → 이더넷 스펙이 None이면 오류 가능성
   - 같은 시리즈 내 다른 모델(예: `XT10CD-D`)과 이더넷 값 비교해 이상 여부 확인
2. **description / xpanelPower / 입력 전원 스펙의 3-way 일치 확인**
   - description에 적힌 전원 타입과 `xpanelPower` 필드, `입력 전원` 스펙 값이 모두 일치해야 함
   - 불일치 시 반드시 카탈로그 확인 후 수정 (추정으로 수정 금지)
3. **새 제품 스펙 추가 시 체크리스트**
   - [ ] 이더넷 있는 모델인지 모델명으로 유추 → 카탈로그 대조
   - [ ] description 전원 타입 ↔ xpanelPower ↔ 입력 전원 스펙 일치
   - [ ] 오디오 포트 description 기재 ↔ 오디오 스펙 값 일치

---

## i18n 규칙

- **라벨 번역**: `src/i18n/specLabels.ts`
- **값 번역**: `src/i18n/specValues.ts` (정규식 패턴)
- **UI 텍스트**: `src/i18n/ui.ts`

`specValues.ts` 패턴 순서: 더 구체적인 패턴 → 더 일반적인 패턴 (역순 시 부분 치환 오류 발생).

수정 후 반드시: `npm run check:i18n` → **0건** 확인 후 커밋.

---

## 커밋 메시지 형식

```
<type>(<scope>): <요약>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

type: `feat` `fix` `data` `docs` `refactor` `chore`  
scope: `plc` `ipc` `scada` `xpanel` `filter` `compare` `cart` `specs` `i18n`

---

## 상세 문서 참조

- **작업 규칙 전체**: [AGENTS.md](./AGENTS.md)
- **컴포넌트 구조**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **React/TS 코딩 규칙**: [docs/FRONTEND.md](./docs/FRONTEND.md)
- **스펙 표기 규칙**: [docs/SPEC_ENTRY_RULES.md](./docs/SPEC_ENTRY_RULES.md)
- **진행 중인 작업**: [docs/exec-plans/active/](./docs/exec-plans/active/)
- **로드맵**: [docs/PLANS.md](./docs/PLANS.md)
- **배포/안정성**: [docs/RELIABILITY.md](./docs/RELIABILITY.md)

---

## 언어

모든 응답과 코드 주석은 **한국어**로 작성.
