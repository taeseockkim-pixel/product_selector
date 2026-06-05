import express from 'express';
import cors from 'cors';
import { mkdirSync, writeFileSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { generateQuoteHtml } from './quoteHtml.js';
import { generateQuoteCsv } from './quoteCsv.js';

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

    // 파일명: 업체명_견적서_YYYY년MM월DD일
    const dateStr = quote.details.quoteDate.replace(/\s/g, '');
    const baseName = `${safeCo}_견적서_${dateStr}`;

    // ── CSV 저장 ──
    const csvPath = join(folderPath, `${baseName}.csv`);
    writeFileSync(csvPath, '﻿' + generateQuoteCsv(quote), 'utf8');

    // ── PDF 저장 (puppeteer) ──
    const pdfPath = join(folderPath, `${baseName}.pdf`);
    const html = generateQuoteHtml(quote);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '15mm', right: '15mm' } });
    await browser.close();

    console.log(`✅ 저장 완료: ${folderPath}`);
    res.json({ success: true, folderPath, files: [`${baseName}.csv`, `${baseName}.pdf`] });

  } catch (err) {
    console.error('저장 실패:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// SPA 폴백
app.get('*', (_req, res) => {
  res.sendFile(join(ROOT, 'dist', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 CIMON 견적 관리 시스템 (로컬)`);
  console.log(`   http://localhost:${PORT}\n`);
});
