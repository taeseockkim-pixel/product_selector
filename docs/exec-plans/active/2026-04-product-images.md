# [진행중] 제품 이미지 표시 기능

**상태**: 🟡 계획 수립 중  
**담당**: —  
**목표 완료**: 미정

---

## 배경

현재 제품 테이블의 이미지 셀은 "IMG" 텍스트 자리표시자(placeholder)로 표시됨.
실제 제품 이미지를 표시하면 고객 신뢰도와 제안서 품질이 높아짐.

---

## 접근 방식 옵션

### 옵션 A — 로컬 이미지 번들 (권장)
- `public/images/products/` 폴더에 모델명.webp 저장
- `products.json` 에 `imageUrl?: string` 필드 추가
- ProductTable 에서 `<img src={p.imageUrl}` 렌더링
- **장점**: 외부 의존성 없음, CDN 캐시 최적화
- **단점**: 번들 크기 증가 (이미지 최적화 필요)

### 옵션 B — 외부 이미지 URL
- `products.json` 에 절대 URL 저장
- **장점**: 번들 크기 불변
- **단점**: CIMON 서버 의존, URL 깨짐 리스크

---

## 구현 체크리스트

- [ ] 이미지 파일 확보 (카탈로그 PDF에서 추출 또는 CIMON 자료실)
- [ ] WebP 변환 (400×300px 권장)
- [ ] `products.json` 에 `imageUrl` 필드 추가 (없으면 fallback 이미지)
- [ ] `ProductTable.tsx` 이미지 렌더링
- [ ] `SpecModal` 이미지 상단 표시
- [ ] `CartPage` / `ComparePage` 썸네일 표시

---

## 연관 파일

- `src/components/ProductTable.tsx` (52–56번 줄: IMG placeholder)
- `src/types/index.ts` (Product 인터페이스에 imageUrl 추가)
- `src/data/products.json`
