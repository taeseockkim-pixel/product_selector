# 완료 보고 반영 중복으로 대장 행 2개 생성되는 장애 수정

- 완료일: 2026-10-22
- 범위: Apps Script 완료 보고 처리(`processAgentResults`)와 대장 기록

## 배경

견적 1건을 생성했는데 `견적관리대장`에 같은 견적번호 행이 2개 생겼다(예: 기술영업 2610-506).
두 행은 금액·파일링크·적용현장이 모두 같았고, 견적번호도 동일했다. 번호 발급이나 에이전트 파일 생성 문제가 아니라
**같은 완료 보고가 대장에 두 번 반영된 것**으로 확인됐다.

### 원인

- `processAgentResults`는 ① 1분 트리거, ② 완료 상태 폴링(`getQuoteLedgerOperationStatus_`),
  ③ 견적 목록 조회(`getQuoteLedgerFromReact`)에서 호출된다. 세 경로에 **잠금이 없었다.**
- 폴링 쪽의 "2초에 한 번" 제한(`QUOTE_OPERATION_RESULT_POLL_*`)은 같은 부서의 폴링끼리만 막고,
  트리거나 목록 조회와 겹치는 경우는 막지 못한다.
- `saveToLedgerSheet`는 `findLedgerRow_`로 행을 확인한 뒤 없으면 `appendRow`를 실행한다.
  두 실행이 거의 동시에 "행 없음"을 확인하면 **둘 다 appendRow를 실행**한다.
- 결과 파일은 대장 기록과 링크 갱신이 끝난 뒤에야 `permanentlyDeleteFile_`로 지워지므로,
  그 사이 다른 실행이 같은 파일을 읽을 수 있었다.

## 변경 내용

- **처리 원자화**: `processAgentResults`가 `LockService.getScriptLock().tryLock(AGENT_RESULT_LOCK_WAIT_MS=3000)`으로
  잠금을 잡은 뒤 결과 파일 목록을 읽는다. 잠금을 얻지 못하면 이번 실행은 건너뛰고 다음 트리거/2초 폴링에 맡긴다
  (사용자 화면 요청이 잠금 대기로 멈추지 않도록 대기 시간을 3초로 제한).
- **파일 생존 재확인**: 잠금 대기 중 다른 실행이 이미 처리해 영구 삭제한 파일은 `isAgentResultFileAlive_`로 걸러
  다시 반영하지 않는다. 대장 기록·링크 갱신·결과 파일 삭제까지 잠금 안에서 끝낸다.
- **operationId 완료 표시**: 대장 행과 링크가 모두 반영되면 `LEDGER_COMMITTED_<operationId>`를
  ScriptProperties에 기록한다(24시간 TTL). 같은 operationId가 다시 처리되면 대장을 다시 쓰지 않고
  예약 해제·완료 상태만 갱신한다. 잠금이 시간 초과 등으로 보장되지 않는 경우의 이중 안전장치다.
- **잠금 순서 수정**: `queueLedgerExport_`는 내부에서 같은 스크립트 잠금을 `tryLock`한 뒤 `releaseLock()`하므로,
  잠금을 잡은 채 호출하면 바깥 잠금까지 풀린다. 대장 사본 내보내기 등록은 처리 루프가 끝나고 잠금을 푼 뒤로 옮겼다.
- **스냅샷**: `saveQuoteSnapshot_`는 같은 견적번호 행이 있으면 갱신하므로, 위 잠금 범위 안에서 호출되어
  `견적원본데이터` 중복 행도 함께 방지된다.

## 검증

- `npm run test:agent-result-lock` (신규): 잠금 획득·미획득 분기, 잠금 해제 위치, 파일 생존 재확인,
  operationId 완료 표시의 기록/만료/TTL 정리, `queueLedgerExport_`가 잠금 해제 이후 호출되는지 검사
- `node --check`로 Apps Script 전체 코드 구문 확인
- `npm run verify`

## 운영 적용

- **Apps Script만** 새 버전으로 배포한다(`APPS_SCRIPT_Code_gs_전체교체코드.txt` → `Code.gs` 전체 교체).
  에이전트 코드는 변경이 없어 재시작이 필요 없다.
- 배포 후 Apps Script 실행 로그에서 `[중복 반영 차단]`이 남는지, 새 견적 저장 시 대장 행이 1개인지 확인한다.

## 후속 확인 필요

- 이미 생성된 중복 행(기술영업 2610-506)은 **견적 목록의 `삭제` 버튼을 쓰지 않는다.**
  영구삭제는 같은 기본 번호의 대장 행을 모두 지우고 스냅샷·로컬 폴더까지 제거하므로 견적이 통째로 사라진다.
  대장 시트에서 중복 행 하나만 직접 삭제하고, `견적원본데이터` 시트의 중복 여부를 함께 확인한다.
- 다른 부서·연도 대장에도 같은 중복이 남아 있는지 점검한다(같은 견적번호 2행).
