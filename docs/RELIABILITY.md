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
Vercel CDN 배포 (전 세계 엣지 노드)
```

**배포 소요 시간**: ~1~2분 (정적 SPA 빌드)  
**배포 실패 시**: 이전 배포 자동 유지 (Vercel 롤백)

---

## 빌드 전 체크리스트

```bash
npx tsc --noEmit   # 타입 오류 0 확인
npm run lint       # ESLint 오류 0 확인
npm run build      # 빌드 성공 확인
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

현재 환경 변수 없음. 정적 앱이므로 불필요.  
향후 API 연동 시 Vercel 환경 변수 사용: `VITE_API_BASE_URL`
