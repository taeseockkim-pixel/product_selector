# 견적 PDF 긴 규격 잘림 보정

## 목표

긴 제품 규격이 Excel/PDF의 `규격` 셀에서 잘리지 않도록, 템플릿의 전체 행을 무조건 키우지 않고 품목별 텍스트 길이와 병합 셀 너비에 맞춰 행 높이를 계산한다.

## 진행 상황

- [x] `server/fillTemplate.js`에 병합 셀 폭 및 한글/영문 표시 폭 기반 줄 수 추정을 추가
- [x] 줄바꿈을 켜고 제품명·규격 중 더 많은 줄을 요구하는 행에 맞춰 높이 설정
- [x] 테스트 XLSX/PDF를 Excel COM으로 생성해 긴 시험 규격 전체가 1페이지 PDF에 표시됨을 확인
- [x] `npm run test:quote-layout`, `npm run verify` 통과
- [x] 코드 변경을 `f304c98`로 커밋 및 GitHub `main`에 푸시
- [ ] 서버 PC(`172.35.12.36`)의 실행 중인 에이전트에 `server/fillTemplate.js`를 적용하고 재시작

## 서버 PC 반영

패치 ZIP: `C:\Users\CIMON\Downloads\CIMON_견적규격_자동행높이_에이전트패치_20261012080328.zip`

서버 PC의 에이전트 프로젝트 루트에 ZIP을 풀어 `server/fillTemplate.js`를 교체한 다음 `start-agent.bat`를 재시작한다. 현재 작업 환경에서는 서버 PC의 관리 공유 접근이 거부되어 원격 파일 교체/재시작은 완료하지 못했다. 기존 견적 파일은 수정되지 않는다. 기존 PDF를 바꾸려면 해당 견적만 승인 후 개별 재생성한다.
