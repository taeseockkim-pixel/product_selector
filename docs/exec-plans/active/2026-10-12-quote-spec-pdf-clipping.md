# 견적 PDF 긴 규격 잘림 보정

## 목표

긴 제품 규격이 Excel/PDF의 `규격` 셀에서 잘리지 않도록, 템플릿의 전체 행을 무조건 키우지 않고 품목별 텍스트 길이와 병합 셀 너비에 맞춰 행 높이를 계산한다.

## 진행 상황

- [x] `server/fillTemplate.js`에 병합 셀 폭 및 한글/영문 표시 폭 기반 줄 수 추정을 추가
- [x] 줄바꿈을 켜고 제품명·규격 중 더 많은 줄을 요구하는 행에 맞춰 높이 설정
- [x] 테스트 XLSX/PDF를 Excel COM으로 생성해 긴 시험 규격 전체가 1페이지 PDF에 표시됨을 확인
- [x] 메일 첨부용 별도 Apps Script `fillSheetData()` 경로에도 제품명/규격 줄바꿈 및 행 높이 계산을 추가
- [x] 파일서버 미리보기 PDF와 메일 다운로드 PDF가 서로 다른 파일임을 확인(서로 다른 SHA-256 및 내용)
- [x] 서버 파일서버의 견적 XLSX에서 품목별 행 높이 확장(78/64/78px)을 확인
- [x] `npm run test:quote-layout`, `npm run verify` 통과
- [x] 코드 변경을 `f304c98`로 커밋 및 GitHub `main`에 푸시
- [x] 현재 작성자 DB XLSX에서 업체명/담당자/연락처 셀값이 입력된 문자열 그대로(`ㅅㄷㄴㅅ11/22/33`)임을 확인(글꼴 인코딩 손상이 아님)
- [x] Apps Script 메일용 임시 PDF 수정분을 기존 운영 배포 URL의 **v117**로 갱신(새 URL/배포 ID 생성하지 않음)
- [x] 운영 URL에서 읽기 전용 권한 응답 성공 확인
- [x] Excel COM 변환에서도 A1:J42 / Zoom=false / 1×1 페이지 맞춤을 강제
- [x] Excel/Apps Script 품목 이름·규격에 8pt 하한 축소를 추가하고, 비고 영역 줄바꿈과 9~7pt 축소를 추가
- [x] 견적 UI와 서버에서 비고 150자 제한을 적용(초과 초안은 자르지 않고 표시·저장 차단)
- [x] Excel COM 스트레스 시험(14개 장문 품목+150자 비고)에서 PDF 1페이지 확인
- [x] Apps Script 로컬 진단 함수를 추가해 임시 템플릿 사본만 내보내고 삭제하도록 구성
- [x] Apps Script 변경분을 기존 운영 URL의 **v118**로 배포(배포 ID/URL 유지)
- [x] 운영 URL에서 읽기 전용 관리자 권한 확인 성공
- [x] 임시 템플릿 사본으로 Apps Script PDF 진단: 14개 장문 품목+150자 비고, 1페이지(178,109 bytes); 임시 사본 삭제 확인
- [ ] 서버 PC에 ZIP 적용 후 새 견적으로 두 PDF 경로를 최종 검증

## 서버 PC 반영

패치 ZIP: `C:\Users\CIMON\Downloads\CIMON_견적PDF_한장출력_비고줄바꿈_패치_20261013.zip` (server의 `fillTemplate.js`, `excelToPdf.js` 포함). 서버 PC에서는 두 파일을 교체하고 에이전트를 재시작한다. Excel COM 스트레스 PDF와 Apps Script/Google Sheets 스트레스 PDF 모두 1페이지임을 확인했다. Apps Script는 기존 운영 배포 ID/URL을 유지해 v118로 갱신했고 관리자 권한 확인도 성공했다. 남은 작업은 서버 PC에 ZIP을 적용한 뒤 새 견적으로 현장 PDF를 최종 검증하는 것이다. 기존 견적/PDF/메일 초안은 수정하지 않는다.
