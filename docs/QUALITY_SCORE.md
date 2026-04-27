# QUALITY_SCORE.md — 품질 지표

마지막 측정: 2026-04-27

---

## 현재 점수

| 항목 | 점수 | 기준 |
|---|---|---|
| 타입 안전성 | 🟢 100% | `tsc --noEmit` 오류 0 |
| 린트 | 🟢 통과 | ESLint 오류 0 |
| 빌드 | 🟢 통과 | `npm run build` 성공 |
| 데이터 완전성 | 🟢 100% | specs 0개 제품 없음 |
| 모바일 대응 | 🔴 미대응 | < 768px 레이아웃 깨짐 |
| 이미지 | 🔴 없음 | IMG placeholder |
| 테스트 커버리지 | 🔴 0% | 테스트 없음 |
| 접근성 (a11y) | 🟡 미측정 | aria 레이블 미적용 |

---

## 번들 크기 목표

| 파일 | 현재 (추정) | 목표 |
|---|---|---|
| JS (gzip) | ~180KB | < 200KB |
| CSS (gzip) | ~15KB | < 20KB |
| products.json | ~800KB | — (정적 분리 검토) |

`npm run build` 후 `dist/` 확인:
```bash
ls -lh dist/assets/
```

---

## 코드 품질 기준

### 컴포넌트
- [ ] 단일 책임 원칙 준수 (렌더링 vs 로직 분리)
- [ ] Props 인터페이스 명시
- [ ] 100줄 이하 권장 (현재 위반: App.tsx ~350줄)

### 데이터
- [ ] products.json 유효 JSON
- [ ] 모든 subType 이 filterConfig/plcTreeConfig 에 존재
- [ ] id 중복 없음

---

## 자동화 체크 (향후 도입 계획)

```yaml
# .github/workflows/ci.yml (예시)
on: [push, pull_request]
jobs:
  quality:
    steps:
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm run build
```
