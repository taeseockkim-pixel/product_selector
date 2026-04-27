# AGENTS.md — AI 에이전트 작업 가이드

이 파일은 Claude Code 등 AI 에이전트가 이 프로젝트에서 작업할 때 따라야 할 규칙과 맥락을 정의합니다.
**프로젝트 코드를 건드리기 전에 반드시 이 파일을 읽어야 합니다.**

---

## 프로젝트 한 줄 요약

CIMON 제품 선택 가이드 — 고객이 PLC / IPC / SCADA / XPANEL 제품을 필터링·비교·담기 할 수 있는 정적 SPA.

---

## 시작 전 필수 확인 목록

```
[ ] ARCHITECTURE.md 읽기          → 컴포넌트 관계 파악
[ ] docs/FRONTEND.md 읽기          → React/TS 규칙 확인
[ ] docs/product-specs/index.md 읽기 → 현재 기능 범위 확인
[ ] docs/exec-plans/active/ 확인   → 진행 중인 작업과 충돌 없는지
[ ] src/data/products.json 구조 확인 → 데이터 스키마 이해
```

---

## 코드 수정 원칙

### 절대 하지 말 것
- `src/data/products.json` 의 기존 `id` 값 변경 (카트/비교 상태가 id 기반)
- `src/types/index.ts` 의 `Product` 인터페이스 필드를 삭제 (다운스트림 영향 큼)
- `App.tsx` 에 비즈니스 로직 직접 추가 (config 레이어를 통해 우회)
- Tailwind 클래스 인라인 마구 추가 — `docs/FRONTEND.md` 디자인 토큰 먼저 확인

### 반드시 할 것
- 새 제품 카테고리 추가 시 → `src/types/index.ts`, `src/config/filterConfig.ts`, `src/data/products.json` 세 파일 동시 수정
- 필터 로직 변경 시 → `filterConfig.ts` 의 `matcher` 함수만 수정 (컴포넌트 불변)
- `products.json` 구조 변경 시 → `src/data/products.ts` 의 import 방식도 확인

---

## 파일 역할 지도

```
src/
├── App.tsx              ← 상태 관리 중심 (뷰 모드, 카트, 비교, 모달)
├── components/
│   ├── LeftPanel.tsx    ← IPC/SCADA/XPANEL 필터 패널
│   ├── PlcLeftPanel.tsx ← PLC 전용 트리 네비게이션
│   ├── ProductTable.tsx ← 제품 목록 테이블 (UI only, 로직 없음)
│   ├── CartPage.tsx     ← 담기 목록 페이지
│   └── ComparePage.tsx  ← 비교 페이지
├── config/
│   ├── filterConfig.ts  ← IPC/SCADA/XPANEL 필터 정의 (로직의 핵심)
│   └── plcTreeConfig.ts ← PLC 좌측 트리 구조 정의
├── data/
│   ├── products.json    ← 유일한 제품 데이터 소스 (직접 편집 가능)
│   └── products.ts      ← JSON import 래퍼 (타입 캐스팅)
└── types/index.ts       ← 모든 타입 정의 (변경 시 파급 효과 큼)
```

---

## 작업 완료 기준 (Definition of Done)

1. `npx tsc --noEmit` — 타입 오류 0
2. `npm run lint` — ESLint 오류 0
3. `npm run build` — 빌드 성공
4. 브라우저에서 4개 카테고리(PLC/IPC/SCADA/XPANEL) 동작 확인
5. 변경 사항을 `docs/exec-plans/` 에 반영

---

## 문서 업데이트 규칙

| 무엇을 바꿨나 | 어떤 문서를 업데이트해야 하나 |
|---|---|
| 새 컴포넌트 추가 | `ARCHITECTURE.md`, `docs/FRONTEND.md` |
| 새 제품 카테고리 | `docs/product-specs/index.md` |
| 필터 로직 변경 | `docs/design-docs/` 에 결정 기록 |
| 배포 설정 변경 | `docs/RELIABILITY.md` |
| 새 기능 완성 | `docs/exec-plans/completed/` 로 이동 |

---

## 커밋 메시지 형식

```
<type>(<scope>): <요약>

[선택] 왜 이 변경이 필요한지 한 문장

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

type: `feat` `fix` `data` `docs` `refactor` `chore`  
scope: `plc` `ipc` `scada` `xpanel` `filter` `compare` `cart` `specs`
