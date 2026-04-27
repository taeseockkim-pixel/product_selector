# ARCHITECTURE.md — 시스템 구조

## 개요

순수 정적 SPA (Single Page Application). 백엔드 없음. 모든 데이터는 빌드 시 번들에 포함.

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
  Vercel CDN (정적 호스팅)
  GitHub main 브랜치 push → 자동 배포
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

## 빌드 & 배포

```
npm run dev      → Vite dev server (HMR)
npm run build    → tsc + vite build → dist/
npm run preview  → dist/ 로컬 미리보기
```

**배포**: GitHub `main` 브랜치 push → Vercel 자동 빌드 & CDN 배포.

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
