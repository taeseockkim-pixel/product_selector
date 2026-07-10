import express from 'express';
import cors from 'cors';
import { mkdirSync, existsSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { fillQuoteTemplate } from './fillTemplate.js';
import { excelToPdf } from './excelToPdf.js';
import { appendToLedger } from './updateLedger.js';
import { processAppsScriptQuote } from './appsScriptQuote.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const QUOTE_DIR = join(ROOT, 'Quote_manage');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use((err, _req, res, next) => {
  if (!err) return next();
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, message: `요청 JSON을 해석할 수 없습니다: ${err.message}` });
  }
  return next(err);
});
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
      // PDF 실패해도 XLSX는 저장됨
    }

    // ── 견적관리대장에 한 행 추가 ──
    try {
      const ledgerPath = join(QUOTE_DIR, year, `${year}_견적관리대장.xlsx`);
      await appendToLedger(quote, ledgerPath, xlsxPath);
      console.log(`  대장: ${ledgerPath}`);
    } catch (ledgerErr) {
      console.warn(`  ⚠️ 견적관리대장 갱신 실패: ${ledgerErr.message}`);
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

/** 실제 양식으로 채운 미리보기 PDF — Quote_manage에는 아무 흔적도 남기지 않음 */
app.post('/api/local/preview', async (req, res) => {
  const quote = req.body;
  const tmpBase = join(tmpdir(), `cimon-quote-preview-${randomUUID()}`);
  const tmpXlsx = `${tmpBase}.xlsx`;
  const tmpPdf = `${tmpBase}.pdf`;
  try {
    await fillQuoteTemplate(quote, tmpXlsx);
    excelToPdf(tmpXlsx, tmpPdf);
    const pdfBuffer = readFileSync(tmpPdf);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('미리보기 생성 실패:', err);
    res.status(500).json({ success: false, error: String(err) });
  } finally {
    if (existsSync(tmpXlsx)) unlinkSync(tmpXlsx);
    if (existsSync(tmpPdf)) unlinkSync(tmpPdf);
  }
});

/** Apps Script 연동: Drive 저장 + Sheet 대장 기록 + 선택 시 Gmail 초안 */
app.post('/api/google/quote', async (req, res) => {
  try {
    const { quote, createDraft = false, subject = '', body = '' } = req.body ?? {};
    if (!quote) return res.status(400).json({ success: false, message: 'quote payload is required' });
    const result = await processAppsScriptQuote(quote, { createDraft, subject, body });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
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
