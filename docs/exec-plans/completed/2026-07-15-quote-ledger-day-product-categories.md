# 견적관리대장 일자 및 제품군 표시

- 완료일: 2026-07-15
- 범위: Google Apps Script 운영 대장, 로컬 XLSX 대장, CSV 내보내기

## 변경 내용

- `월` 다음에 `일` 열을 추가하고 견적서 작성일의 일자를 저장한다.
- 제품 항목을 `SCADA`, `SCADA PRO`, `PLC`, `eXT`, `XPANEL`, `TOUCH`, `Hybird`, `BOX PC`, `TOUCH MONITOR`, `Accessory`로 정규화한다.
- NET/RIO 제품은 `PLC`로 표시한다.
- 여러 제품군이 포함된 견적은 중복을 제거하고 쉼표로 함께 표시한다.

## 검증

- 분류 및 날짜 저장 로직 샘플 테스트
- `npm run verify`
