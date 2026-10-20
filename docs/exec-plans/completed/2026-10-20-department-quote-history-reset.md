# 부서 견적 이력 초기화(1건 보존) 유틸리티

- 완료일: 2026-10-20
- 범위: Apps Script 관리자 유틸리티

## 배경

영업팀 견적 이력을 001번만 남기고 초기화할 필요가 있었다. 기존에는 전체 부서를 비우는 `resetAllTestQuotes`만 있었고, 부분 초기화는 수동 삭제에 의존해 Drive 대장까지 휴지통으로 보내는 사고(번호 초기화·`quoteNumberChoiceStale`)가 발생했다.

## 추가 내용

- `resetDepartmentQuoteHistory(options)`:
  - 대장 시트: 보존 기본번호(및 Rev) 외 행 삭제
  - 스냅샷 시트: 보존 기본번호 외 행 삭제
  - Drive 견적 폴더: 보존 폴더 외 휴지통 이동(복구 가능, `setTrashed`)
  - 번호 예약(`QUOTE_NUMBER_RESERVATION_*`)·레거시 시퀀스 정리(보존 번호 제외)
  - 실제 실행 시 대장 스프레드시트를 `{연도}_견적관리대장_백업_{시각}`으로 먼저 백업
  - `dryRun` 기본값이 미리보기이며, `dryRun:false`+`confirm:true`에서만 실제 삭제
  - 동명 대장 파일 수, 보존 폴더 존재 여부를 로그로 경고
- 편의 함수: `previewResetDepartmentQuotesKeepOne` / `applyResetDepartmentQuotesKeepOne` (영업 2610-001 보존)

## 사용 절차

1. Apps Script 편집기에서 `previewResetDepartmentQuotesKeepOne` 실행 → 삭제 대상 로그 확인
2. 문제 없으면 `applyResetDepartmentQuotesKeepOne` 실행
3. 견적 목록 새로고침, 대시보드 통계는 에이전트 재스캔(재시작) 후 반영

## 검증

- `npm run test:quote-draft`: 초기화 함수가 미리보기 기본, `confirm` 필요, 대장 백업, 폴더 휴지통 이동이며 영구삭제를 쓰지 않음을 정적 확인
- `npm run test:agent-queue`, `npm run test:quote-layout`, `npm run test:agent-e2e`, `npm run verify`

## 주의

- 저장 PC 에이전트를 재시작하기 전에는 대시보드 통계(`stats/영업.json`)가 예전 데이터를 유지할 수 있다.
- 실제 실행 전에는 `previewResetDepartmentQuotesKeepOne` 로그로 삭제 대상이 의도와 일치하는지 반드시 확인한다.
