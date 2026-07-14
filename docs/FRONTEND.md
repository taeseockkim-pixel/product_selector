# FRONTEND.md — 프론트엔드 개발 가이드

> `QuoteListPage.tsx`는 Apps Script wrapper에 `LOAD_QUOTE_LEDGER` 메시지를 보내고,
> Google Sheet의 헤더·행·파일 링크를 동적으로 표시한다. 고정 열이나 보기/삭제 액션을 두지 않는다.

## 스택

| 기술 | 버전 | 용도 |
|---|---|---|
| React | 18.3 | UI 렌더링 |
| TypeScript | 5.6 | 타입 안전성 |
| Vite | 5.4 | 번들러 / Dev Server |
| Tailwind CSS | 3.4 | 스타일링 |

---

## 컴포넌트 작성 규칙

### 함수형 컴포넌트만 사용
```typescript
// ✅ 올바름
export default function ProductTable({ products, onCartToggle }: Props) { ... }

// ❌ 금지
class ProductTable extends Component { ... }
```

### Props 인터페이스 파일 상단 선언
```typescript
interface Props {
  products: Product[];
  onCartToggle: (id: string) => void;
}
```

### 이벤트 핸들러 네이밍
- Props: `onXxx` (예: `onCartToggle`, `onViewDetail`)
- 로컬 함수: `handleXxx` (예: `handleCartToggle`)

---

## Tailwind 사용 규칙

### 색상 팔레트 (일관성 유지)
| 용도 | 클래스 |
|---|---|
| 주요 액션 | `bg-blue-600 text-white` |
| 호버 | `hover:bg-blue-700` |
| 선택 상태 배경 | `bg-blue-50 text-blue-600` |
| 테두리/구분선 | `border-gray-200` |
| 비활성 텍스트 | `text-gray-400` |
| 기본 텍스트 | `text-gray-800` |
| 서브 텍스트 | `text-gray-500` |
| 페이지 배경 | `bg-gray-50` |
| 카드 배경 | `bg-white` |

### 금지 패턴
```html
<!-- ❌ 인라인 style 사용 금지 -->
<div style={{ color: 'red' }}>

<!-- ❌ 임의 색상 값 금지 -->
<div className="bg-[#1a2b3c]">

<!-- ✅ Tailwind 유틸리티만 사용 -->
<div className="bg-blue-600 text-white">
```

---

## 상태 관리

### 규칙
- 전역 상태: `App.tsx` 의 `useState` 만 사용
- 컴포넌트 내부 UI 상태 (호버, 토글 등): 로컬 `useState`
- 서버 상태: 없음 (정적 JSON)

### 상태 올리기 기준
- 두 개 이상의 컴포넌트가 같은 상태를 필요로 하면 `App.tsx` 로 올린다
- 하나의 컴포넌트만 사용하는 상태는 그 컴포넌트 내부에 둔다

---

## 타입 규칙

### Product 타입 확장 시
1. `src/types/index.ts` 의 `Product` 인터페이스에 선택적 필드(`?`) 추가
2. `src/data/products.json` 에 해당 제품들에 필드 추가
3. 필터 config 에서 해당 필드 사용

```typescript
// src/types/index.ts
export interface Product {
  // 기존 필드...
  newField?: string;  // ← 항상 optional로 추가
}
```

### `as` 타입 단언 금지
```typescript
// ❌ 금지
const p = data as Product;

// ✅ 타입 가드 사용
function isProduct(x: unknown): x is Product { ... }
```

---

## 파일 구조 규칙

```
src/components/    ← UI 컴포넌트만. 비즈니스 로직 없음
src/config/        ← 필터/트리 설정. 순수 데이터 구조
src/data/          ← 정적 데이터 (JSON, import 래퍼)
src/types/         ← 타입 정의만 (로직 없음)
src/utils/         ← 순수 함수 유틸리티 (현재 비어 있음)
```

### 새 컴포넌트 추가 기준
- 50줄 이상이고 재사용 가능하면 별도 파일
- App.tsx 내 인라인 컴포넌트는 임시 허용 (TD-003, TD-004 참조)

---

## 빌드 & 품질 체크

```bash
# 로컬 개발
npm run dev

# 타입 체크 (커밋 전 필수)
npx tsc --noEmit

# 린트
npm run lint

# 프로덕션 빌드 확인
npm run build && npm run preview
```
