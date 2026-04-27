// verify.mjs — 구현 완료 후 필수 검증 스크립트
// npm run verify 로 실행
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`  ✅  ${label}`);
      passed++;
    } else {
      console.log(`  ❌  ${label}`);
      if (typeof result === 'string') console.log(`       → ${result}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌  ${label}`);
    console.log(`       → ${e.message}`);
    failed++;
  }
}

// ── 1. TypeScript 타입 검사 ─────────────────────────────────
console.log('\n[1] TypeScript');
check('tsc --noEmit 오류 없음', () => {
  execSync('npx tsc --noEmit', { cwd: root, stdio: 'pipe' });
});

// ── 2. 빌드 성공 ─────────────────────────────────────────────
console.log('\n[2] 빌드');
check('npm run build 성공', () => {
  execSync('npm run build', { cwd: root, stdio: 'pipe' });
});
check('dist/index.html 존재', () => existsSync(join(root, 'dist/index.html')));

// ── 3. 필수 파일 존재 ────────────────────────────────────────
console.log('\n[3] 필수 파일');
const requiredFiles = [
  'src/data/products.json',
  'src/types/index.ts',
  'src/config/filterConfig.ts',
  'src/config/plcTreeConfig.ts',
  'src/utils/imageResolver.ts',
  'AGENTS.md',
  'ARCHITECTURE.md',
];
for (const f of requiredFiles) {
  check(f, () => {
    if (!existsSync(join(root, f))) return `파일 없음: ${f}`;
  });
}

// ── 4. products.json 데이터 무결성 ──────────────────────────
console.log('\n[4] 데이터 무결성 (products.json)');
const products = JSON.parse(readFileSync(join(root, 'src/data/products.json'), 'utf8'));
check('제품 수 200개 이상', () => products.length >= 200 || `현재 ${products.length}개`);
check('모든 제품에 id 존재', () => {
  const bad = products.filter(p => !p.id);
  return bad.length === 0 || `id 없는 제품 ${bad.length}건`;
});
check('id 중복 없음', () => {
  const ids = products.map(p => p.id);
  const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
  return dups.length === 0 || `중복 id: ${[...new Set(dups)].join(', ')}`;
});
check('catalog spec 비율 30% 이상 (품질 지표)', () => {
  let catalog = 0, total = 0;
  for (const p of products) {
    for (const s of p.specs ?? []) {
      total++;
      if (s.source !== 'estimated') catalog++;
    }
  }
  const ratio = total > 0 ? Math.round(catalog / total * 100) : 0;
  return ratio >= 30 || `catalog 비율 ${ratio}% — 카탈로그 검증 필요 (catalog: ${catalog}, total: ${total})`;
});

// ── 5. 이미지 파일 검증 ──────────────────────────────────────
console.log('\n[5] 이미지');
const imgDir = join(root, 'public/products');
check('public/products/ 폴더 존재', () => existsSync(imgDir) || '폴더 없음');
if (existsSync(imgDir)) {
  const imgs = readdirSync(imgDir).filter(f => /\.(jpg|png|webp)$/i.test(f));
  check(`이미지 파일 1개 이상 (현재 ${imgs.length}개)`, () => imgs.length > 0);

  // git 추적 여부 확인
  try {
    const tracked = execSync('git ls-files public/products/', { cwd: root }).toString().trim();
    const trackedCount = tracked ? tracked.split('\n').length : 0;
    check(
      `이미지가 git에 커밋됨 (추적: ${trackedCount}/${imgs.length})`,
      () => trackedCount === imgs.length || `미커밋 ${imgs.length - trackedCount}개 — git add public/products/ 필요`
    );
  } catch {
    check('git ls-files 실행', () => 'git 명령 실패');
  }
}

// ── 결과 요약 ────────────────────────────────────────────────
console.log('\n' + '─'.repeat(40));
console.log(`결과: ${passed} 통과 / ${failed} 실패`);
if (failed > 0) {
  console.log('❌  실패 항목을 해결한 후 다시 실행하세요.\n');
  process.exit(1);
} else {
  console.log('✅  모든 검증 통과. 배포 준비 완료.\n');
}
