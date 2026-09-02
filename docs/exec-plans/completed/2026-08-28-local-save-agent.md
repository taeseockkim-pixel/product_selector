# 사내 PC 로컬 저장 에이전트 (구글 드라이브 용량 절약)

## 목표

견적 파일(XLSX/PDF)의 저장 위치를 구글 드라이브에서 사내 PC(`172.35.12.36`)의
부서별 보안 폴더로 옮겨 구글 드라이브 용량 소모를 제거한다.
대장·견적번호·작성자 권한은 기존 Google Sheets 시스템을 그대로 유지한다.

## 아키텍처 (Google Drive 폴더 연동형)

회사 정책상 익명 웹 앱 배포가 불가능하므로, 에이전트와 Apps Script는 직접 통신하지 않고
**Google Drive 폴더를 통해 대기열을 주고받는다** (인증·토큰·별도 배포 불필요).

```
저장하기 → Apps Script: 번호 발급 + 대장 기록
                + "견적에이전트/pending" 폴더에 견적 JSON 생성
                + "견적에이전트/delivery" 폴더에 대장 사본(XLSX) 생성
                      ↓ Google Drive 데스크톱 동기화 (양방향)
agent/index.js (172.35.12.36 PC, Node 18+, Excel 필요)
    ├─ pending 폴더 감시(10초) → XLSX 생성 → Excel COM으로 PDF 변환
    ├─ {storageRoot}\{부서}\{연도}\{번호_업체명}\ 저장
    ├─ delivery의 대장 사본을 연도 폴더에 {연도}_견적관리대장.xlsx로 복사
    ├─ results 폴더에 완료 보고 기록 (실패 시 3회 재시도 후 실패 보고 + failed-jobs 백업)
    └─ HTTP 파일 서버(8790 포트)로 사내 견적 파일 다운로드 제공
[Apps Script] 1분 트리거 processAgentResults → 대장 파일링크 갱신 + 파일 정리
```

## 주요 변경

- `APPS_SCRIPT_Code_gs_전체교체코드.txt`
  - `processQuote`: Drive 파일 생성 제거 → `enqueueLocalSave_()`이
    Drive `견적에이전트/pending` 폴더에 견적 JSON 파일 생성 + 1분 트리거 자동 등록
  - `exportLedgerToAgent_()` (신규): 저장 후 최신 대장을 XLSX로 내보내
    `견적에이전트/delivery` 폴더에 `대장_{견적번호}.xlsx`로 전달
  - `processAgentResults()` (신규, 1분 트리거): 에이전트 완료 보고 반영
    (대장 파일링크 갱신, 실패 시 pending을 failed 폴더로 이동, 잔여 파일 영구 삭제)
  - `permanentlyDeleteFile_`: 공유 드라이브 항목 삭제용 `supportsAllDrives=true` 추가
  - `getAgentFolder_()`/`getAgentSubfolder_()`: 작성자 DB 시트 위치에
    `견적에이전트/pending|results|failed|delivery` 폴더 자동 생성 (Script Properties에 ID 캐시)
  - Gmail 초안용 임시 PDF는 생성 직후 영구 삭제 (Drive v3 DELETE) — 이전 버전에서 유지
  - 기존 시트 기반 대기열(`handleAgentClaim_`/`handleAgentComplete_`) 및
    doPost 에이전트 액션 제거
- `agent/index.js`: Apps Script 폴링 제거 → 로컬 pending 폴더 감시 방식
  - 확장자 없는 pending 파일도 처리, 실패 3회 시 `agent/failed-jobs/` 로컬 백업
- `agent/config.example.json`: `agentFolderPath`(필수) 추가, 토큰/엔드포인트 제거
- 프론트엔드: 관리자 계정(`App.tsx`의 `ADMIN_AUTHOR_EMAILS`)은 작성자 잠금 해제 — 자유롭게 작성자 변경 가능
- 파일 다운로드 응답은 실제 견적 파일명(`부서 YYMM-NNN_업체명_견적서.xlsx`)을 사용하고, 견적 목록에는
  PDF 파일명만 표시한다. 목록의 `폴더` 버튼은 비밀번호 보호 파일 브라우저를 연다.

## 알려진 제한

- 저장 직후 견적 목록의 파일링크는 비어 있고, 완료 보고 반영(통상 1~3분) 후 채워진다.
  대장 사본 XLSX도 같은 시점에 연도 폴더에 갱신된다.
- 파일 생성 지연은 Drive 데스크톱 동기화 속도에 좌우된다 (업무 시간 내 수 초~수 분).
- 처리 실패 3회 누적 시 대기 JSON은 `failed` 폴더로 이동된다. 원인 복구 후 수동으로
  pending 폴더에 되돌리면 재처리된다.
- 파일 서버는 HTTP(사내 LAN 전용)다. 외부 노출 금지. `/`에는 부서별 비밀번호 폴더 브라우저가 제공되며, 부서 세션은 자기 부서 경로만 탐색·다운로드할 수 있다.

## 배포 (대상 PC에서)

1. **Google Drive 데스크톱** 설치 + 회사 계정 로그인 (Drive 동기화가 핵심 통로)
2. 프로젝트 복제/복사 → `npm install`
3. `agent/config.example.json` → `agent/config.json` 복사 후 값 입력
   - `agentFolderPath`: Drive에서 동기화되는 `견적에이전트` 폴더의 로컬 경로
     (첫 견적 저장 1회 후 Drive에 자동 생성됨; 이후 Drive 웹/데스크톱에서 위치 확인)
   - `storageRoot`, `publicBaseUrl`, `httpPort`: 환경에 맞게
4. `npm run agent` 또는 `start-agent.bat` 실행
5. Apps Script `Code.gs` 교체 + 새 버전 배포 (사용 중 배포 갱신)
