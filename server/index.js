import express from 'express';
import cors from 'cors';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fillQuoteTemplate } from './fillTemplate.js';
import { excelToPdf } from './excelToPdf.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const QUOTE_DIR = join(ROOT, 'Quote_manage');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(join(ROOT, 'dist')));

/** 견적서 로컬 저장 API */
app.post('/api/local/save', async (req, res) => {
  const quote = req.body;
  try {
    const d = new Date(quote.createdAt);
    const year = d.getFullYear().toString();

    const safe = (s) => String(s ?? '').replace(/[/\\:*?"<>|]/g, '').trim();
    const safeNum = safe(quote.quoteNumber);
    const safeCo  = safe(quote.clientCompany);
    const folderName = `${safeNum}_${safeCo}`;
    const folderPath = join(QUOTE_DIR, year, folderName);
    mkdirSync(folderPath, { recursive: true });

    // 파일명: 견적번호(공백제거)_업체명_견적서
    const baseName = `${safeNum.replace(/\s/g, '')}_${safeCo}_견적서`;

    // ── XLSX 템플릿 채우기 ──
    const xlsxPath = join(folderPath, `${baseName}.xlsx`);
    await fillQuoteTemplate(quote, xlsxPath);
    console.log(`  XLSX: ${xlsxPath}`);

    // ── Excel COM으로 PDF 변환 ──
    const pdfPath = join(folderPath, `${baseName}.pdf`);
    try {
      excelToPdf(xlsxPath, pdfPath);
      console.log(`  PDF: ${pdfPath}`);
    } catch (pdfErr) {
      console.warn(`  ⚠️ PDF 변환 실패 (Excel 미설치?): ${pdfErr.message}`);
      // PDF 실패해도 XLSX + CSV는 저장됨
    }

    const files = [];
    if (existsSync(pdfPath)) files.push(`${baseName}.pdf`);
    files.push(`${baseName}.xlsx`);

    console.log(`✅ 저장 완료: ${folderPath}`);
    res.json({ success: true, folderPath, files });

  } catch (err) {
    console.error('저장 실패:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// SPA 폴백 — Express v5 호환 와일드카드
app.get('/{*splat}', (_req, res) => {
  res.sendFile(join(ROOT, 'dist', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 CIMON 견적 관리 시스템 (로컬)`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   견적 저장 경로: ${QUOTE_DIR}\n`);
});
