# DESIGN.md — UI/UX 디자인 시스템

---

## 디자인 원칙

1. **정보 밀도 우선**: 산업용 도구 → 많은 정보를 효율적으로 표시
2. **한국어 최우선**: 모든 레이블, 버튼, 메시지는 한국어
3. **일관된 인터랙션**: 동일한 액션 → 동일한 색상/모양

---

## 레이아웃 구조

```
┌─────────────────────────────────────────┐
│  Header (h-14, sticky)                  │
│  CIMON | 제품 선택 가이드    [비교][담기] │
├─────────────────────────────────────────┤
│  Category Tabs                          │
│  [ PLC ] [ IPC ] [ SCADA ] [ XPANEL ]   │
├──────────┬──────────────────────────────┤
│          │  Title          총 N개        │
│ Left     │─────────────────────────────│
│ Panel    │  Product Table               │
│ (w-52)   │  (flex-1)                    │
│          │                              │
└──────────┴──────────────────────────────┘
```

**컨테이너**: `max-w-screen-xl mx-auto px-6`  
**본문 패딩**: `py-6`  
**사이드 패널 폭**: `w-52` (208px 고정)

---

## 색상 시스템

### 주요 색상
| 역할 | Tailwind | HEX |
|---|---|---|
| 브랜드 블루 | `blue-600` | `#2563EB` |
| 브랜드 블루 다크 | `blue-700` | `#1D4ED8` |
| 선택 배경 | `blue-50` | `#EFF6FF` |
| 선택 텍스트 | `blue-600` | `#2563EB` |

### 중립 색상
| 역할 | Tailwind |
|---|---|
| 페이지 배경 | `gray-50` |
| 카드 배경 | `white` |
| 테두리 | `gray-200` |
| 구분선 | `gray-100` |
| 제목 텍스트 | `gray-800` |
| 본문 텍스트 | `gray-700` |
| 서브 텍스트 | `gray-500` |
| 비활성 텍스트 | `gray-400` |

---

## 타이포그래피

| 용도 | 클래스 |
|---|---|
| 헤더 브랜드명 | `text-lg font-bold text-blue-700 tracking-tight` |
| 섹션 제목 | `text-base font-bold text-gray-700` |
| 테이블 헤더 | `text-xs font-semibold uppercase tracking-wide text-gray-500` |
| 모델명 | `font-semibold text-gray-800` |
| 설명 텍스트 | `text-xs text-gray-500 leading-relaxed` |
| 뱃지/카운터 | `text-xs font-bold` |

---

## 컴포넌트 패턴

### 버튼 — 주요 액션
```html
<button class="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
```

### 버튼 — 보조 (선택됨)
```html
<button class="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">
```

### 버튼 — 비활성
```html
<button class="text-gray-400 hover:text-gray-600 hover:bg-gray-100">
```

### 카드/패널
```html
<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
```

### 모달 오버레이
```html
<div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
```

---

## 아이콘

현재 SVG 인라인으로 사용 (외부 라이브러리 없음):
- 비교 아이콘: 막대 그래프 SVG
- 담기 아이콘: 박스 SVG

추후 아이콘 시스템 도입 시 `lucide-react` 권장.

---

## 반응형 브레이크포인트 (계획)

| 브레이크포인트 | 너비 | 레이아웃 변화 |
|---|---|---|
| `sm` | 640px | — |
| `md` | 768px | Left Panel → 드로어 |
| `lg` | 1024px | 현재 기본 레이아웃 |
| `xl` | 1280px | `max-w-screen-xl` 상한 |
