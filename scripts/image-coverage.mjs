// image-coverage.mjs — 제품 이미지 커버리지 분석
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

// 업로드된 이미지 목록 (확장자 제외)
const imageFiles = readdirSync(join(root, 'public/products'))
  .filter(f => f.endsWith('.jpg'))
  .map(f => f.replace('.jpg', ''));

// n 패턴 → 정규식 변환 (n = 1자 이상의 숫자)
const exact = new Set(imageFiles.filter(name => !name.includes('n')));
const patterns = imageFiles
  .filter(name => name.includes('n'))
  .map(name => ({
    regex: new RegExp('^' + name.replace(/n/g, '\\d+') + '$'),
    file: name,
  }));

console.log('패턴 목록:');
patterns.forEach(p => console.log(' ', p.regex.toString(), '← 파일:', p.file + '.jpg'));

function resolve(id) {
  if (exact.has(id)) return { file: id + '.jpg', type: 'exact' };
  for (const r of patterns) {
    if (r.regex.test(id)) return { file: r.file + '.jpg', type: 'pattern' };
  }
  return null;
}

const products = JSON.parse(readFileSync(join(root, 'src/data/products.json'), 'utf8'));

const covered = [];
const missing = [];

for (const p of products) {
  const r = resolve(p.id);
  if (r) covered.push({ id: p.id, subType: p.subType, file: r.file, type: r.type });
  else missing.push({ id: p.id, subType: p.subType });
}

console.log('\n=== 커버리지 요약 ===');
console.log(`전체: ${products.length} | 커버됨: ${covered.length} | 미커버: ${missing.length}`);

console.log('\n=== 패턴 매핑된 제품 ===');
covered.filter(c => c.type === 'pattern').forEach(c =>
  console.log(`  ${c.id.padEnd(20)} → ${c.file}`)
);

// subType별 미커버 집계
const bySubType = {};
for (const m of missing) {
  (bySubType[m.subType] ??= []).push(m.id);
}

console.log('\n=== 이미지 없는 제품 (subType별) ===');
for (const [st, ids] of Object.entries(bySubType)) {
  console.log(`\n[${st}]  (${ids.length}건)`);
  ids.forEach(id => console.log('  ' + id));
}

// subType 대표 공유 이미지 제안
console.log('\n=== 공유 이미지 추가 제안 ===');
const suggestions = [
  // PLC
  { pattern: 'CM1-UPnF', targets: ['CM1-UP1F','CM1-UP2F','CM1-UP3F'], note: '이미 파일 있음' },
  { pattern: 'CM1-XPnE', targets: ['CM1-XP1E','CM1-XP2E','CM1-XP3E'], note: '이미 파일 있음' },
  { pattern: 'CM1-BS0nA', targets: ['CM1-BS03A','CM1-BS04A','CM1-BS05A','CM1-BS08A'], note: '이미 파일 있음' },
  { pattern: 'CM1-BSnnA (BS10,12)', targets: ['CM1-BS10A','CM1-BS12A'], note: '별도 파일 또는 CM1-BS0nA 재사용 가능' },
  { pattern: 'CM1-XPnF (신규)', targets: ['CM1-XP2F','CM1-XP3F'], note: 'CM1-XP1F.jpg 을 CM1-XPnF.jpg 로 추가 필요' },
  { pattern: 'CM1-CPnE / CM1-CPnF (신규)', targets: ['CM1-CP3E','CM1-CP4E','CM1-CP4F'], note: '공통 CPU 사진 필요' },
  // CM3
  { pattern: 'CM3-SPnMDnF 등 (신규)', targets: ['CM3_CPU_SLIM 전체'], note: 'CM3 Slim CPU 공통 사진 필요' },
  { pattern: 'CM3-SBnMDnF 등 (신규)', targets: ['CM3_CPU_BRICK 전체'], note: 'CM3 Brick CPU 공통 사진 필요' },
  // IPC / SCADA / XPANEL — 각 카테고리별 1장씩
  { pattern: 'PANEL_DEFAULT (신규)', targets: ['PANEL 전체'], note: '패널 PC 대표 이미지 1장' },
  { pattern: 'SCADA_DEFAULT (신규)', targets: ['SCADA/SCADA-PRO 전체'], note: '소프트웨어 패키지 이미지 1장' },
  { pattern: 'XPANEL_DEFAULT (신규)', targets: ['XPANEL_HMI 전체'], note: 'XPANEL 대표 이미지 1장' },
];
suggestions.forEach(s => {
  console.log(`\n  파일명 패턴: ${s.pattern}`);
  console.log(`  적용 대상: ${Array.isArray(s.targets) ? s.targets.join(', ') : s.targets}`);
  console.log(`  메모: ${s.note}`);
});
