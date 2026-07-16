# 견적 제품 추가 — 터치 모니터

- 완료일: 2026-07-15
- 범위: 견적서 작성 화면의 제품 추가 카탈로그

## 변경 내용

- `Product_Prise.xlsx`의 `TOUCH MONITOR` 시트에서 사용하는 `제품명` 헤더를 견적 제품 카탈로그 생성기가 인식하도록 추가했다.
- 터치 모니터의 규격 열인 `Size`를 생성 대상 사양으로 추가했다.
- 카탈로그를 재생성해 `CM-IM15W-D`를 제품 추가 목록에 노출했다.

## 검증

- `npm run generate:quote-products`
- `npm run verify`
