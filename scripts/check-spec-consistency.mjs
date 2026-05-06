/**
 * check-spec-consistency.mjs
 * 시리즈 내 스펙 일관성 검증
 *
 * 실행: npm run check:spec-consistency
 *
 * 같은 seriesLabel 그룹 내에서:
 *  1. 라벨 집합 차이 (한 제품에 있는 항목이 다른 제품에 없음)
 *  2. 값 형식 차이 (같은 라벨인데 한글/영문 혼용, 구분자 패턴 불일치)
 *  3. 중복 라벨 (같은 제품 내 동일 라벨이 여러 개)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const products = JSON.parse(
  readFileSync(path.join(ROOT, 'src/data/products.json'), 'utf-8')
);

const KO_PATTERN = /[가-힣]/;
const issues = [];

// ── KO/EN 혼용 허용 예외 목록 ────────────────────────────────────
// 카탈로그 대조 완료. 아래 항목은 의도적 차이이므로 ERROR에서 제외.
// 형식: '[카테고리] seriesLabel|라벨명'
const KO_EN_MIX_EXCEPTIONS = new Set([
  // ── 기존 예외 ─────────────────────────────────────────────────────
  '[PLC] XP Series|내장 이더넷',       // XP-F(전용 이더넷) vs XP-E(증설 통신 전용) 모델 구분
  '[PLC] CP Series|내장 이더넷',       // CP4(이더넷 없음 "-") vs CP3(증설 전용) 모델 차이
  '[PLC] 아날로그 입력|최대 분해능',   // 모델별 μV 실수값 vs 비트수(16384 분할) 카탈로그 혼용
  '[PLC] Loadcell|타입',               // WG02E "Wide Range" 카탈로그 영문 공식명, WG02C/D 한글
  '[PLC] 시리얼 통신|Port1',           // SC01B Port1 없음(미탑재) vs 타 모델 RS232C
  '[PLC] 시리얼 통신|Port2',           // SC01A Port2 없음(미탑재) vs 타 모델 RS422/485
  '[SCADA] SCADA Standard|라이선스',   // DS/RS(영문 Development+Runtime) vs VS/CS(한글 뷰 버전) 제품군 차이
  '[SCADA] SCADA Standard|TAG 수',     // FULL 라인 "무한 TAG"(한글 공식명) vs N TAG(숫자)
  '[PLC] 이더넷|서비스',               // EC01G(PLC Link 미지원 → 영문만) vs EC10A/B(PLC Link 공동/고속 → 한글 포함) 기능 차이
  // ── 카탈로그 대조 완료 추가 예외 (2026-05-06) ─────────────────────
  '[PLC] Slim Type|위치결정',          // TR/Source 모델: "X축 N kpps" 지원, Relay 모델: "X" 미지원 — 의도적 모델 차이
  '[PLC] Slim Type|SD/MMC',            // Base(MDT/MDC/MDTE/MDCE): "옵션 가능", 나머지 F/V/R: "X" — 의도적 모델 차이
]);

// ── 1. 시리즈별로 그룹핑 ─────────────────────────────────────────
const byCategory = {};
for (const p of products) {
  // 카테고리 + seriesLabel 조합으로 그룹핑
  const key = `[${p.category}] ${p.seriesLabel || '(no series)'}`;
  if (!byCategory[key]) byCategory[key] = [];
  byCategory[key].push(p);
}

// ── 2. 중복 라벨 검사 (단일 제품 내) ────────────────────────────
for (const p of products) {
  const labelCount = {};
  for (const s of p.specs ?? []) {
    labelCount[s.label] = (labelCount[s.label] ?? 0) + 1;
  }
  for (const [label, cnt] of Object.entries(labelCount)) {
    if (cnt > 1) {
      issues.push({
        type: 'DUPLICATE_LABEL',
        severity: 'ERROR',
        productId: p.id,
        detail: `"${label}" 항목이 ${cnt}번 중복`
      });
    }
  }
}

// ── 3. 시리즈 내 라벨 집합 차이 ─────────────────────────────────
for (const [seriesKey, members] of Object.entries(byCategory)) {
  if (members.length < 2) continue;

  // 각 제품의 라벨 목록 (source: catalog인 것만 — estimated는 제외)
  const labelSets = members.map(p =>
    new Set((p.specs ?? []).filter(s => s.source !== 'estimated').map(s => s.label))
  );

  // 합집합
  const allLabels = new Set(labelSets.flatMap(s => [...s]));

  for (const label of allLabels) {
    const missing = members.filter((_, i) => !labelSets[i].has(label));
    const present = members.filter((_, i) => labelSets[i].has(label));

    if (missing.length > 0 && present.length > 0) {
      issues.push({
        type: 'MISSING_LABEL',
        severity: 'WARN',
        series: seriesKey,
        label,
        present: present.map(p => p.id),
        missing: missing.map(p => p.id),
        detail: `"${label}" 항목 누락`
      });
    }
  }
}

// ── 4. 값 형식 차이 (같은 시리즈 + 같은 라벨) ───────────────────
for (const [seriesKey, members] of Object.entries(byCategory)) {
  if (members.length < 2) continue;

  // 라벨별로 값 모으기
  const byLabel = {};
  for (const p of members) {
    for (const s of p.specs ?? []) {
      if (s.source === 'estimated') continue;
      if (!byLabel[s.label]) byLabel[s.label] = [];
      byLabel[s.label].push({ productId: p.id, value: s.value });
    }
  }

  for (const [label, entries] of Object.entries(byLabel)) {
    if (entries.length < 2) continue;

    const values = entries.map(e => e.value);
    const uniqueValues = new Set(values);
    if (uniqueValues.size === 1) continue; // 전부 동일 → 이상 없음

    // 한글/영문 혼용 검사 (카탈로그 확인 완료된 예외는 제외)
    const exceptionKey = `${seriesKey}|${label}`;
    if (KO_EN_MIX_EXCEPTIONS.has(exceptionKey)) continue;

    const hasKo = values.some(v => KO_PATTERN.test(v));
    const hasEnOnly = values.some(v => !KO_PATTERN.test(v));
    if (hasKo && hasEnOnly) {
      issues.push({
        type: 'KO_EN_MIX',
        severity: 'ERROR',
        series: seriesKey,
        label,
        entries,
        detail: `한글/영문 혼용`
      });
      continue; // 이미 리포트 했으면 아래 포맷 검사는 중복
    }

    // 포맷 패턴 차이 검사 (단위/구분자가 다른 경우)
    // 숫자가 공통으로 등장하지만 주변 텍스트가 다른 경우
    const patterns = values.map(v => v.replace(/[\d,]+/g, 'N'));
    const uniquePatterns = new Set(patterns);
    if (uniquePatterns.size > 1) {
      issues.push({
        type: 'FORMAT_DIFF',
        severity: 'WARN',
        series: seriesKey,
        label,
        entries,
        detail: `표기 형식 불일치`
      });
    }
  }
}

// ── 출력 ─────────────────────────────────────────────────────────
const errors = issues.filter(i => i.severity === 'ERROR');
const warns  = issues.filter(i => i.severity === 'WARN');

if (issues.length === 0) {
  console.log('✅  스펙 일관성 이상 없음');
  process.exit(0);
}

if (errors.length > 0) {
  console.error(`\n❌  오류 ${errors.length}건\n`);
  for (const e of errors) {
    if (e.type === 'DUPLICATE_LABEL') {
      console.error(`  [ERROR] ${e.productId} — ${e.detail}`);
    } else if (e.type === 'KO_EN_MIX') {
      console.error(`  [ERROR] ${e.series} / "${e.label}" — ${e.detail}`);
      for (const { productId, value } of e.entries) {
        console.error(`          ${productId}: ${value}`);
      }
    }
  }
}

if (warns.length > 0) {
  console.warn(`\n⚠️   경고 ${warns.length}건\n`);
  for (const w of warns) {
    if (w.type === 'MISSING_LABEL') {
      console.warn(`  [WARN] ${w.series} / "${w.label}" 누락`);
      console.warn(`         있음: ${w.present.join(', ')}`);
      console.warn(`         없음: ${w.missing.join(', ')}`);
    } else if (w.type === 'FORMAT_DIFF') {
      console.warn(`  [WARN] ${w.series} / "${w.label}" — ${w.detail}`);
      for (const { productId, value } of w.entries) {
        console.warn(`         ${productId}: ${value}`);
      }
    }
  }
}

console.log(`\n→ products.json 을 카탈로그와 대조하여 수정하세요.\n`);
process.exit(errors.length > 0 ? 1 : 0);
