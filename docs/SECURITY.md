# SECURITY.md — 보안 가이드라인

---

## 현재 보안 프로파일

이 앱은 **순수 정적 SPA** 입니다.

- 사용자 입력을 서버로 전송하지 않음
- 데이터베이스 없음
- 인증/인가 없음
- 외부 API 호출 없음

**위협 모델**: 낮음. 주요 리스크는 번들/데이터 파일 변조.

---

## 현재 조치 사항

### XSS 방지
- React 는 JSX 내 모든 값을 자동 이스케이프 → 별도 조치 불필요
- `dangerouslySetInnerHTML` **사용 금지**

### 의존성 취약점
```bash
# 주기적 확인 (월 1회)
npm audit
npm audit fix
```

### Vercel 보안 헤더
Vercel 기본 헤더에 포함됨:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security`

---

## 향후 고려 사항

### 가격 정보 추가 시
- 가격 데이터를 `products.json` 에 넣으면 누구나 원가를 볼 수 있음
- **해결**: 가격은 별도 인증 API를 통해서만 제공

### 사용자 계정 추가 시
- JWT 저장: `httpOnly` 쿠키 사용 (localStorage 금지)
- CSRF 보호 필요

### 관리자 기능 추가 시 (products.json 편집 UI 등)
- 현재 구조에서는 GitHub 커밋이 유일한 "편집 권한" 관리
- 웹 UI 편집 추가 시 인증 레이어 필수

---

## 하지 말 것

- `eval()`, `new Function()` 사용 금지
- 사용자 입력을 HTML에 직접 삽입 금지 (`innerHTML`)
- `.env` 파일을 Git에 커밋 금지 (현재 환경 변수 없으므로 해당 없음)
