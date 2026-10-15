# 견적 카탈로그에 SCADA PRO Web 추가

- 완료일: 2026-10-14
- 범위: 견적서 작성 화면의 제품 추가 카탈로그

## 변경 내용

- 사용자가 수정한 `Quote_manage/기본자료/Product_Prise.xlsx`에서 `SCADA PRO. Web` 시트를 확인했다.
- A3의 섹션명이 `개발용`에서 `Web Version`으로 바뀐 것을 확인해, 32개 상품 카테고리 라벨도 `SCADA PRO - Web Version`으로 재생성했다.
- 이후 사용자가 갱신한 동일 시트의 최신 내용을 다시 생성해 32개 상품의 구분/규격 설명을 교체했다. 가격은 모두 동일하게 유지됐고, 이 중 8개 500 Tag 형명은 `CM03-500-*`에서 `CM03-0500-*`으로 변경됐다.
- 기존 견적에 저장된 `CM03-500-03/WS` 형명도 편집 시 새 카탈로그의 `CM03-0500-03/WS`로 해석하도록 정규화를 확장했다.
- 서버 PC에 있는 `D:\업무\agent\smart_quote_sys\smart_quote_sys\product_selector\Quote_manage\기본자료\Product_Prise.xlsx`와 현재 프로젝트의 통합문서 SHA-256이 같은 것을 확인했다.
- 기존 견적 카탈로그 생성기(`npm run generate:quote-products`)를 실행해 `SCADA PRO. Web` 32개 상품을 `src/data/quoteProductCatalog.ts`에 추가·갱신했다.
- 새 그룹은 기존 견적 입력 화면의 시트 선택 목록에 자동으로 나타나므로 생성기/화면 비즈니스 로직은 별도 수정하지 않았다.
- 나머지 15개 그룹 341개 항목과 SCADA PRO Web 32개 가격은 변경하지 않았다. 500 Tag 8개 모델명의 새 ID와 이전 모델명을 연결하는 정규화를 추가했다.

## 대표 데이터 확인

- 첫 상품: `CM03-0150-01/WS`, 단가 2,550,000원
- 마지막 상품: `CM03-100K-30/WS`, 단가 34,390,000원
- 새 그룹: `SCADA PRO. Web`, 32개 상품

## 검증

- `npm run generate:quote-products`
- `npm run test:quote-catalog`
- `npm run verify` (25/25)
- `npm run lint` (오류 0, 기존 경고 4)
