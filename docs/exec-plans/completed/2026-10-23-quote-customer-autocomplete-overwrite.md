# 견적 고객 자동완성의 수기 입력 덮어쓰기 방지

## 목표

기존 견적 이력에서 고객 정보를 불러온 뒤 업체명 등 고객 정보를 수정해도, 다른 입력칸에서 포커스가 빠질 때 이력값이 다시 적용되어 견적 이름이 이전 업체명으로 돌아가는 문제를 막는다.

## 변경 내용

- [x] `src/utils/customerAutocomplete.ts`에 고객 이력 일치·중복 제거·자동완성 결정을 분리
- [x] 실제로 수정한 업체명/담당자 입력에서만 이력을 조회
- [x] 단일 정확 일치이며 다른 고객 입력란이 비어 있고 편집되지 않은 경우에만 빈 값 자동완성
- [x] 부분 일치·복수 후보·기존 입력 정보가 있으면 선택 모달에서 명시적으로 적용
- [x] 후보 취소 시 현재 입력값을 유지하고 같은 값의 blur에서 선택창을 반복 표시하지 않음
- [x] 신규 견적 저장 payload가 현재 폼의 업체명을 전달하는 기존 경로를 회귀 테스트로 확인
- [x] `npm run test:quote-customer-autocomplete` 추가
- [x] `npm run verify`에 고객 자동완성 회귀 테스트 연결
- [x] `ARCHITECTURE.md`, `CLAUDE.md`, `docs/RELIABILITY.md`에 동작과 검증 명령 반영

## 검증

- `npm run test:quote-customer-autocomplete` — 통과
- `npm run test:quote-draft` — 통과
- `npm run build` — 통과
- `npm run lint` — 오류 0건. 기존 경고 4건(미사용 eslint-disable 1건, React Hook 의존성 1건, Fast Refresh 2건)
- `npm run verify` — 28 통과 / 0 실패
- `git diff --check` — 공백 오류 없음

## 배포 범위

프런트엔드 코드와 문서만 수정했다. Apps Script, 로컬 에이전트, 기존 견적/파일 및 운영 데이터를 변경하거나 배포하지 않았다.
