# [완료] 제품 이미지 표시 기능

**상태**: ✅ 완료  
**담당**: —  
**완료일**: 2026-07-10 기준 확인

---

## 배경

제품 테이블의 이미지 셀을 텍스트 자리표시자에서 실제 제품 이미지 기반 표시로 전환했다.
이미지가 없는 모델은 `NO IMG` 또는 모델명 fallback을 표시한다.

---

## 구현 방식

- `public/products/` 아래 카테고리별 이미지 131개 저장
- `src/utils/imageResolver.ts` 에서 제품 ID/subType 기준 이미지 경로 해석
- `products.json` 에 `imageUrl` 필드를 추가하지 않고 resolver 매핑으로 처리
- `ProductTable`, `SpecModal`, `CartPage` 에 이미지 표시
- 일부 미확보 이미지는 fallback 표시

---

## 구현 체크리스트

- [x] 이미지 파일 확보
- [x] `imageResolver.ts` 경로 매핑
- [x] `ProductTable.tsx` 이미지 렌더링
- [x] `SpecModal` 이미지 상단 표시
- [x] `CartPage` 썸네일 표시
- [ ] `ComparePage` 썸네일 표시

---

## 연관 파일

- `src/utils/imageResolver.ts`
- `src/components/ProductTable.tsx`
- `src/components/SpecModal.tsx`
- `src/components/CartPage.tsx`
- `public/products/`
