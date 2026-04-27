# 기술 부채 트래커

우선순위: 🔴 높음 / 🟡 중간 / 🟢 낮음

---

## 활성 부채

| ID | 우선순위 | 제목 | 위치 | 등록일 |
|---|---|---|---|---|
| TD-001 | 🟡 | 제품 이미지 없음 (IMG placeholder) | ProductTable.tsx:52 | 2026-04-27 |
| TD-002 | 🟡 | 비교 최대 개수 제한 미구현 | App.tsx handleCompareToggle | 2026-04-27 |
| TD-003 | 🟢 | SpecModal App.tsx 내부 인라인 — 별도 파일 분리 필요 | App.tsx:49–91 | 2026-04-27 |
| TD-004 | 🟢 | AppHeader App.tsx 내부 인라인 — 별도 파일 분리 필요 | App.tsx:282–357 | 2026-04-27 |
| TD-005 | 🟢 | products.json 일부 스펙값 추정치 — 카탈로그 재검증 필요 | products.json | 2026-04-27 |
| TD-006 | 🔴 | 모바일(< 768px) 레이아웃 미대응 | index.css, 모든 컴포넌트 | 2026-04-27 |

---

## 해결된 부채

| ID | 제목 | 해결일 | 커밋 |
|---|---|---|---|
| TD-000 | TypeScript 데이터 파일 → JSON으로 분리 | 2026-02-01 | `869db0b` |

---

## TD-001: 제품 이미지 없음

**현황**: `ProductTable.tsx` 52~56번 줄에 회색 "IMG" 박스 표시.  
**영향**: 고객 제안 시 시각적 신뢰도 저하.  
**해결 계획**: [active/2026-04-product-images.md](./active/2026-04-product-images.md) 참조.

---

## TD-002: 비교 최대 개수 미제한

**현황**: 비교에 무제한 제품 추가 가능. 4개 초과 시 비교 테이블 레이아웃 깨짐.  
**수정 방법**:
```typescript
// App.tsx handleCompareToggle
function handleCompareToggle(id: string) {
  setCompareList(prev => {
    if (prev.includes(id)) return prev.filter(x => x !== id);
    if (prev.length >= 4) return prev; // ← 이 줄 추가
    return [...prev, id];
  });
}
```

---

## TD-006: 모바일 미대응 (높음)

**현황**: 1024px 미만에서 사이드 패널 + 테이블 레이아웃이 겹쳐 사용 불가.  
**우선순위가 높은 이유**: 영업 담당자가 태블릿/스마트폰으로 현장 확인 필요.  
**대략적 작업 범위**:
- `LeftPanel` / `PlcLeftPanel` → 모바일에서 드로어(drawer)로 전환
- `ProductTable` → 모바일에서 카드 그리드로 전환
- 예상 공수: 2~3일
