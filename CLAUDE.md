# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

CIMON 제품 선택 가이드 — PLC / IPC / SCADA / XPANEL 4개 카테고리, 247개 제품을 필터링·비교·담기할 수 있는 순수 정적 SPA. 백엔드 없음, 빌드 타임에 모든 데이터 번들 포함.

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

npm run export:csv             # products.json → CSV 내보내기 (데이터 편집용)
npm run import:csv             # CSV → products.json 반영
npm run import:csv:dry         # CSV import 시뮬레이션 (실제 변경 없음)
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

## 핵심 규칙

### 절대 하지 말 것

- `products.json`의 기존 `id` 값 변경 — 카트/비교 상태가 id 기반
- `Product` 인터페이스 필드 삭제 — 다운스트림 파급 큼
- `App.tsx`에 비즈니스 로직 직접 추가 — config 레이어를 통해 처리
- 카탈로그 미확인 상태에서 `"source": "catalog"` spec 추가/수정

### CSS `sticky` 적용 규칙

`position: sticky`는 **자신이 속한 부모 요소의 높이 범위** 안에서만 고정된다.
컴포넌트 내부 `<aside>`에 `sticky`를 걸면, 해당 컴포넌트를 감싸는 부모 div 범위를 벗어나지 못해 고정이 풀린다.

**올바른 패턴** — `App.tsx`의 wrapper div에 적용:
```jsx
{/* App.tsx — 사이드바 wrapper */}
<div className="hidden md:block flex-shrink-0 no-print sticky top-[120px] self-start max-h-[calc(100vh-120px)] overflow-y-auto">
  <LeftPanel ... />
</div>
```

**잘못된 패턴** — 컴포넌트 내부 aside에 적용 (작동 안 함):
```jsx
{/* LeftPanel.tsx 내부 — 부모 div 범위 밖을 벗어나지 못함 */}
<aside className="sticky top-[120px] ...">
```

추가 주의사항:
- 부모 요소에 `overflow: hidden` 또는 `overflow: auto`가 있으면 sticky 무력화
- `self-start` 없이 flex child에 sticky를 쓰면 부모가 늘어나 고정되지 않음
- 현재 sticky top 기준: 헤더 64px + 카테고리 탭 56px = **120px**

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
