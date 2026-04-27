# Tailwind CSS 패턴 참조

이 프로젝트에서 반복 사용하는 Tailwind 조합 모음.

---

## 레이아웃

```html
<!-- 페이지 래퍼 -->
<div class="min-h-screen bg-gray-50 flex flex-col">

<!-- 콘텐츠 컨테이너 -->
<div class="max-w-screen-xl mx-auto w-full px-6 py-6">

<!-- 사이드바 + 콘텐츠 2열 -->
<div class="flex gap-5 items-start">
  <aside class="w-52 shrink-0">...</aside>
  <main class="flex-1 min-w-0">...</main>
</div>
```

---

## 카드

```html
<!-- 기본 카드 -->
<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">

<!-- 그림자 카드 -->
<div class="bg-white rounded-2xl shadow-2xl">
```

---

## 테이블

```html
<table class="w-full text-sm bg-white rounded-xl border border-gray-200 overflow-hidden">
  <thead>
    <tr class="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wide">
      <th class="px-4 py-3 text-left">...</th>
    </tr>
  </thead>
  <tbody class="divide-y divide-gray-100">
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-4 py-3">...</td>
    </tr>
  </tbody>
</table>
```

---

## 버튼

```html
<!-- 주요 액션 버튼 -->
<button class="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">

<!-- 아이콘 원형 버튼 (담기) -->
<button class="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700">

<!-- 아이콘 원형 버튼 (비교 미선택) -->
<button class="w-8 h-8 rounded-full border-2 border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500">
```

---

## 필터 버튼 (LeftPanel)

```html
<!-- 선택됨 -->
<button class="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white">

<!-- 미선택 -->
<button class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
```

---

## 모달

```html
<!-- 오버레이 -->
<div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
  <!-- 모달 박스 -->
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
    <!-- 헤더 -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
    <!-- 콘텐츠 -->
    <div class="px-6 py-4">
  </div>
</div>
```

---

## 뱃지/카운터

```html
<!-- 숫자 뱃지 -->
<span class="rounded-full text-xs px-1.5 py-0.5 font-bold bg-blue-600 text-white">3</span>

<!-- 서브 레이블 -->
<span class="block text-xs text-gray-400 mt-0.5">UP Series</span>
```
