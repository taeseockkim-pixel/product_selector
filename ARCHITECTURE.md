# ARCHITECTURE.md — 시스템 구조

> 견적 목록은 Apps Script의 `getQuoteLedgerFromReact()`를 통해 현재 연도 Google Sheet
> `견적관리대장`의 표시값, 열 순서, 파일 링크를 그대로 조회하는 읽기 전용 화면이다.
> 브라우저 `localStorage`는 견적 목록의 원천으로 사용하지 않는다.

## 개요

제품 카탈로그(PLC/IPC/SCADA/XPANEL)는 순수 정적 SPA — 모든 데이터가 빌드 시 번들에 포함된다.
다만 견적서(Quote) 기능은 `localStorage` 목록 캐시 + Apps Script Web App(Drive/Sheets/Gmail) +
로컬 전용 Express 서버(PDF/Excel 생성 보조)로 구성된 하이브리드 구조다. 자세한 내용은 하단
"견적서 기능 아키텍처" 참조.

```
사용자 브라우저
     │
     ▼
┌─────────────────────────────────┐
│  Vite + React 18 + TypeScript   │
│  Tailwind CSS (유틸리티 스타일)  │
└─────────────────────────────────┘
     │  빌드 산출물 (dist/)
     ▼
  Vercel CDN (정적 호스팅) + api/google/quote (Apps Script Web App proxy)
  GitHub main 브랜치 push → 자동 배포

  (로컬 개발 전용, npm run local)
  Express 서버(server/index.js) → /api/google/quote + /api/local/*
  ※ /api/local/* 는 Windows Excel COM 의존 — Vercel에는 배포되지 않음
```

---

## 상태 관리 구조

중앙 상태는 `App.tsx` 의 `useState` 로만 관리. 외부 라이브러리(Redux, Zustand 등) 없음.

```
App.tsx (상태 중심)
├── viewMode: 'main' | 'cart' | 'compare'
├── activeCategory: CategoryId
├── cartList: string[]         ← product.id 배열
├── compareList: string[]      ← product.id 배열
├── detailProduct: Product | null  ← 상세 모달
│
├── [PLC 전용]
│   ├── plcSeries: 'CM1' | 'CM3'
│   └── plcSubType: string
│
└── [IPC/SCADA/XPANEL 공통]
    ├── activeSubType: string
    └── filters: FilterValues   ← Record<sectionId, string[]>
```

---

## 데이터 흐름

```
products.json
    │  (빌드 타임 import)
    ▼
products.ts  ─→  PRODUCTS: Product[]
    │
    ▼
App.tsx  (필터링 로직)
    │
    ├── filterPlcProducts(series, subType)
    │       └── plcTreeConfig.ts 참조
    │
    └── filterByConfig(categoryId, subType, filters)
            └── filterConfig.ts 참조
                  └── SubTypeConfig.matcher
                  └── FilterSection.matcher
    │
    ▼
ProductTable.tsx  (렌더링 전용)
```

---

## 컴포넌트 책임 분리

| 컴포넌트 | 책임 | 상태 소유 |
|---|---|---|
| `App.tsx` | 라우팅, 전역 상태, 필터 연산 | ✅ |
| `PlcLeftPanel.tsx` | PLC 트리 UI | ❌ (props only) |
| `LeftPanel.tsx` | IPC/SCADA/XPANEL 필터 UI | ❌ (props only) |
| `ProductTable.tsx` | 제품 목록 렌더링 | ❌ (props only) |
| `CartPage.tsx` | 담기 목록 표시 | ❌ (props only) |
| `ComparePage.tsx` | 비교 표 표시 | ❌ (props only) |
| `SpecModal` (App 내) | 상세 사양 모달 | ❌ (props only) |
| `QuoteFormPage.tsx` | 견적서 작성 폼, 가격표 기반 품목 추가/삭제, 단가 계산 호출 | ✅ (폼 입력/품목 상태) |
| `QuoteListPage.tsx` | 저장된 견적서 목록 표시 | ❌ (localStorage 조회만) |
| `QuotePrintView.tsx` | 견적서 인쇄 미리보기 | ❌ (props only) |

**규칙:** `Table`, `Panel` 컴포넌트는 순수 렌더링만 담당. 필터/정렬 로직은 `App.tsx` 또는 `config/` 에서 처리.

---

## 설정 레이어 (`src/config/`)

### filterConfig.ts
IPC / SCADA / XPANEL 의 필터 UI와 매칭 로직을 선언적으로 정의.

```typescript
CategoryConfig
  └── SubTypeConfig[]
        ├── matcher(product) → boolean      // 이 서브타입에 속하는가
        └── FilterSection[]
              ├── id, title, type, options
              └── matcher(product, selected) // 선택 조건을 만족하는가
```

**새 카테고리 추가 시**: `CATEGORY_CONFIGS` 배열에 `CategoryConfig` 객체 추가.

### plcTreeConfig.ts
PLC 좌측 트리 구조를 정의. `PlcTreeGroup > PlcTreeLeaf` 2단계 계층.

```typescript
PLC_TREE: Record<PlcSeriesId, PlcTreeGroup[]>
  └── CM1 / CM3 각각 그룹 배열
```

---

## 데이터 스키마 (`src/data/products.json`)

```typescript
Product {
  id: string              // 유일 식별자 (카트/비교 키)
  modelName: string
  category: 'PLC'|'IPC'|'SCADA'|'XPANEL'
  series: string
  seriesLabel: string
  subType: string         // filterConfig / plcTreeConfig 의 leaf id와 일치
  description: string
  specs: { label: string; value: string }[]  // 상세 모달에 표시

  // 필터용 선택 필드 (category에 따라 사용 여부 다름)
  plcSeries?: 'CM1'|'CM3'
  ioPoints?: number
  screenSize?: number
  cpuTier?: 'J_SERIES'|'I3'|'I5'|'I7'
  ...
}
```

전체 스키마: `src/types/index.ts` 참조.

---

## 견적서 기능 아키텍처

제품 필터링 흐름과 완전히 분리된 별도 하위 시스템. 제품 카탈로그와 달리 **Apps Script Web App을
통해 Drive/Sheets/Gmail에 결과물을 남기고, 브라우저 `localStorage`는 목록 캐시로만 사용**한다.

```
Product_Prise.xlsx
    │  npm run generate:quote-products
    ▼
quoteProductCatalog.ts
    │
QuoteFormPage.tsx
    │  quoteProductCatalog.ts / priceData.ts (fallback) 로 단가/합계 계산
    ▼
quoteStorage.ts → localStorage ("cimon-quotes", "cimon-quote-seq")
    │
    ├── POST /api/google/quote  (Vercel 서버리스 + 로컬 Express 동일 경로)
    │     └── server/appsScriptQuote.js
    │           └── Apps Script processQuote: Drive/Sheets/Gmail 처리
    │
    ├── api/quotes/index.ts, [id].ts
    │     └── 레거시 스텁. 신규 저장 흐름에서는 사용하지 않음.
    │
    └── (localhost 개발 환경일 때만) POST /api/local/save
          └── server/index.js (Express, npm run local)
                ├── fillTemplate.js → ExcelJS로 XLSX 생성
                └── excelToPdf.js  → Windows Excel COM으로 PDF 변환
    │
    ▼
QuotePrintView.tsx → quoteHtml.ts (HTML 생성) → iframe → 브라우저 인쇄
```

**제약**:
- Google Workspace 처리는 Apps Script wrapper로 위임한다. 사용자는 Apps Script Web App에 로그인한 상태로 접속하고, wrapper가 Vercel 앱 iframe의 저장 요청을 `google.script.run`으로 받아 기존 `processQuote`를 실행한다. 서비스 계정 JSON 키와 Domain-wide delegation 설정이 필요 없다.
- `excelToPdf.js`는 Windows Excel COM 객체에 의존 → **Vercel 프로덕션에서는 동작 불가**, 로컬
  개발(`npm run local`) 전용 기능이다.
- Vercel 배포 환경에서는 `/api/local/*` 저장 단계가 생략된다. Apps Script wrapper 안에서 실행되는 Vercel 앱은 `postMessage` 브릿지로 저장 요청을 전달하고, wrapper 밖에서 직접 실행될 때만 `/api/google/quote` fallback을 사용한다.

Apps Script 반영 파일:

견적관리대장의 날짜 열은 `연도`, `월`, `일` 순서이며 제품 항목 열은 전체 품목의 제품군을 중복 없이 쉼표로 결합한다. NET/RIO는 `PLC`로 정규화한다. 로컬 `server/updateLedger.js`와 CSV 내보내기도 같은 규칙을 사용한다.
- `appscript/Index.wrapper.html`
- `appscript/wrapper-code.patch.gs`
- `api/quotes/*`는 이름과 달리 실질적인 서버 측 CRUD를 수행하지 않는 스텁 상태다.

---

## 빌드 & 배포

```
npm run dev      → Vite dev server (HMR)
npm run build    → tsc + vite build → dist/
npm run preview  → dist/ 로컬 미리보기
npm run local    → build + server/index.js 구동 (견적서 XLSX/PDF 생성, 로컬 전용)
```

**배포**: GitHub `main` 브랜치 push → Vercel이 `dist/`를 CDN에 정적 배포하는 동시에
`api/quotes/*`를 서버리스 함수로 함께 배포. `server/` 폴더는 Vercel 배포 대상이 아니며
로컬(`npm run local`)에서만 실행된다.

---

## 의존성 선택 근거

| 패키지 | 선택 이유 |
|---|---|
| React 18 | 업계 표준, concurrent features |
| Vite 5 | 빠른 HMR, 정적 빌드 최적화 |
| TypeScript | products.json ↔ 컴포넌트 타입 안정성 |
| Tailwind CSS | 디자인 일관성, 번들 최소화 (PurgeCSS) |
| Vercel | GitHub 연동 무료 정적 호스팅 |

외부 상태관리 라이브러리 없음 — 현재 복잡도에서 불필요.
