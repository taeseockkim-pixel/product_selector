# 메일 첨부 PDF를 Excel PDF로 통일 + 저장 속도 개선

## 목표

- 고객에게 가는 메일 첨부 PDF를 저장된 파일(파일링크)과 **같은 Excel PDF**로 통일한다. Google 시트 임시 PDF 경로는 삭제한다.
- 에이전트가 꺼져 있으면 **저장 접수 자체를 거부**하고 점검 안내 오류를 띄운다(작업이 쌓여 충돌하는 것을 방지).
- 저장·메일 초안의 대기 시간을 줄인다.

## 결정 사항

- 실패 정책 A: 에이전트 PDF 생성/전달에 실패하면 초안을 만들지 않고 오류를 안내한다(모양이 다른 PDF 대체 없음).
- 초안은 요청자 본인 Gmail에만 만든다(관리자 계정 트리거에서 만들지 않음).
- 비고 입력 제한은 300자 유지.

## 구현 현황

- [x] 에이전트 `heartbeat.json`(20초) + 종료 표시 + `/health`
- [x] 에이전트가 최종 PDF를 `attachments/`로 복사하고 manifest를 마지막에 기록(`agent/queueFiles.js`)
- [x] Apps Script: 접수 전 에이전트 확인(`checkAgentAvailable_`), 에이전트가 꺼져 있으면 접수 거부(`agentUnavailable`)
- [x] Apps Script: 메일 초안 요청 저장 → 요청자 조회 시 Excel PDF 첨부 초안 생성, 실패/만료/중복/타인 요청 처리
- [x] Apps Script: Google 임시 PDF 생성·보정·진단 코드 삭제
- [x] 프런트: `agentUnavailable` 안내, 초안 상태(`stage: draft`, `draft: created|failed`) 처리, 첫 상태 조회 2.5초 지연
- [x] 속도: Excel 상시 대기 워커(실패 시 일회성 변환 자동 전환), 작성자 DB 3분 캐시, 대장 사본 내보내기 대기열, 대장 중복 열기 제거, 에이전트 폴링 1초
- [x] 단계별 시간 기록(에이전트 `timings` + Apps Script 로그 `[성능] 단계별 시간`)
- [x] 잔여 Excel 정리(`agent/excel-worker.pid`)
- [x] 시험: `test:quote-draft`, `test:agent-queue`, `test:excel-worker`, `test:agent-e2e`, `test:quote-layout`, `test:quote-auth`
- [x] 서버 PC에 에이전트 패치 ZIP 적용·재시작 후 `http://172.35.12.36:8790/health` 확인(`features: ["draftAttachments"]`)
- [x] 에이전트 확인 후 Apps Script **v119** 배포(기존 배포 ID/URL 유지, 편집기 코드와 로컬 파일 SHA-256 일치 확인)
- [x] 실제 Gmail 초안 1건 시험(견적 2610-490, 수신자 본인): 첨부 PDF가 파일링크 PDF와 크기(112,638 bytes)·SHA-256까지 동일
- [x] `diagnoseAgentStatus()` 점검 함수 추가(신호 나이·버전·기능·접수 가능 여부)
- [x] 로컬 Apps Script 소스와 가상 Gmail 시험에서 견적·발주요청 초안 모두 작성자 BCC를 확인(기존 CC 유지)
- [x] BCC 변경을 기존 배포 URL의 **v120**으로 배포하고 관리자 권한 읽기 전용 확인
- [ ] 시험 견적(2610-490)과 Gmail 초안 `[자동시험] Excel PDF 첨부 확인` 정리(사용자 확인 후)

## 운영 시험 결과 (2026-10-13)

- 접수 응답 약 9.6초(첫 호출), 이후 대장 반영과 초안 생성까지 약 25초(합계 약 35초, 1개 파일).
- 이전 방식(Google 임시 PDF) 초안의 첨부는 약 178~181KB, 새 방식은 저장 PDF와 같은 112,638 bytes.
- 서버 에이전트 `/health`: `pollIntervalMs: 1000`, Excel 워커 시작 1회(1.35초), 변환 2.4초(첫 변환, 이후 재사용 시 단축).

## 배포 순서 (중요)

1. Vercel(프런트): 이전 Apps Script와 호환된다(`draft` 값이 없으면 예전처럼 초안 탭을 연다).
2. **서버 PC 에이전트**: ZIP을 풀어 파일 교체 → 에이전트 재시작 → `/health`에서 `features: ["draftAttachments"]` 확인.
3. **Apps Script**: 새 버전 배포. 에이전트가 신호를 보내기 전에 먼저 배포하면 모든 저장이 거부된다.

현재 BCC 소스 변경은 로컬에 준비되어 있으나 Google 편집기 인증이 만료되어 v120 배포는 대기 중이다. 재로그인 후 배포한다.

## 롤백

- Apps Script만 이전 버전(v118)으로 되돌리면 Google 임시 PDF 방식으로 복귀한다. 에이전트 변경은 이전 Apps Script와 함께 써도 무해하다(첨부 복사는 새 Apps Script가 요청할 때만).
- Excel 상시 워커 문제 시: 에이전트 `config.json`에 `"useExcelWorker": false`.

## 확인 명령

```bash
npm run test:quote-draft     # Apps Script 로직(모의 Drive/Gmail)
npm run test:agent-queue     # 첨부·생존 신호 파일 처리
npm run test:excel-worker    # Excel 상시 워커 (Excel 필요)
npm run test:agent-e2e       # 실제 에이전트 프로세스 통합 (Excel 필요)
npm run test:quote-layout    # 1페이지·비고 300자·한글 글꼴 (Excel 필요)
npm run verify
```
