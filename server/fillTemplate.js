import ExcelJS from 'exceljs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, '..', 'Quote_manage', '기본자료', '견적서 샘플.xlsx');

/**
 * 견적서 샘플.xlsx 템플릿에 데이터를 채워 outPath에 XLSX 저장
 * 셀 매핑 (견적서 샘플.xlsx 분석 결과):
 *   C3=업체명, F3=연락처, I3=견적번호
 *   C4=담당자, F4=이메일,  I4=견적일자
 *   C9=납품장소, C10=납품기한, C11=결제조건, C12=유효기간, C13=포장
 *   A16~: NO/제품명/규격/수량/유효 단가/금액 (행 반복, 유효 단가 = 단가 × 배율)
 *   A30=총 견적 금액 문자열
 *   B34=비고
 *   H37=작성자, H38=연락처, H39=이메일
 */
const MAX_ITEMS = 14; // 템플릿 품목 행이 16~29행(14행)까지만 준비되어 있음 — 초과 시 총액 행(A30)을 덮어씀

/**
 * ExcelJS는 템플릿의 PNG 그림은 보존하지만, 셀 위에 떠 있는 DrawingML 텍스트 상자(xdr:sp)는
 * XLSX를 다시 쓸 때 제거한다. 견적서 하단의 '(주)싸이몬 대표이사 안재봉' 문구가 이 텍스트 상자여서,
 * 저장 시 원본 템플릿에서 관계 파일이 필요 없는 텍스트 상자 앵커만 결과 XLSX에 되돌려 넣는다.
 */
async function restoreTemplateTextShapes(templatePath, outputPath) {
  const [templateBuffer, outputBuffer] = await Promise.all([
    readFile(templatePath),
    readFile(outputPath),
  ]);
  const [templateZip, outputZip] = await Promise.all([
    JSZip.loadAsync(templateBuffer),
    JSZip.loadAsync(outputBuffer),
  ]);

  const drawingPaths = Object.keys(templateZip.files)
    .filter((path) => /^xl\/drawings\/drawing\d+\.xml$/.test(path));
  let restoredShapeCount = 0;

  for (const drawingPath of drawingPaths) {
    const templateDrawingEntry = templateZip.file(drawingPath);
    const outputDrawingEntry = outputZip.file(drawingPath);
    if (!templateDrawingEntry || !outputDrawingEntry) continue;

    const [templateXml, outputXmlOriginal] = await Promise.all([
      templateDrawingEntry.async('string'),
      outputDrawingEntry.async('string'),
    ]);

    // ExcelJS가 텍스트 상자를 이미 보존했다면 중복 삽입하지 않는다.
    if (/<xdr:sp(?:\s|>)/.test(outputXmlOriginal)) continue;

    const anchors = templateXml.match(/<xdr:(?:oneCellAnchor|twoCellAnchor|absoluteAnchor)>[\s\S]*?<\/xdr:(?:oneCellAnchor|twoCellAnchor|absoluteAnchor)>/g) || [];
    // 현재 견적 템플릿의 회사명/대표이사 텍스트 상자는 이미지·하이퍼링크 관계를 갖지 않는다.
    const textShapeAnchors = anchors.filter((anchor) => (
      /<xdr:sp(?:\s|>)/.test(anchor) &&
      !/<xdr:pic(?:\s|>)/.test(anchor) &&
      !/\br:(?:id|embed|link)=/.test(anchor)
    ));
    if (textShapeAnchors.length === 0) continue;

    const rootStart = outputXmlOriginal.indexOf('<xdr:wsDr');
    const rootEnd = rootStart >= 0 ? outputXmlOriginal.indexOf('>', rootStart) : -1;
    if (rootEnd < 0) continue;

    // 원본 drawing의 순서처럼 텍스트 상자를 그림 앵커들보다 먼저 둔다.
    const prefix = outputXmlOriginal.slice(0, rootEnd + 1);
    const suffix = outputXmlOriginal.slice(rootEnd + 1);
    outputZip.file(drawingPath, prefix + textShapeAnchors.join('') + suffix);
    restoredShapeCount += textShapeAnchors.length;
  }

  if (restoredShapeCount > 0) {
    await writeFile(outputPath, await outputZip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    }));
  }
  return restoredShapeCount;
}

function normalizedTemplateLabel(value) {
  return String(value ?? '').replace(/[\s:：]/g, '').toLowerCase();
}

/** 템플릿 버전마다 작성자 표의 행/열이 달라도 라벨 옆 값 셀을 찾아 기록한다. */
function findTemplateValueCellByLabel(worksheet, label) {
  const wanted = normalizedTemplateLabel(label);
  const merges = worksheet.model.merges || [];
  for (let row = 30; row <= worksheet.rowCount; row += 1) {
    for (let column = 1; column <= worksheet.columnCount; column += 1) {
      const cell = worksheet.getCell(row, column);
      const cellValue = cell.value;
      const labelText = typeof cellValue === 'string'
        ? cellValue
        : (cellValue && Array.isArray(cellValue.richText)
          ? cellValue.richText.map((part) => part.text || '').join('')
          : '');
      if (normalizedTemplateLabel(labelText) !== wanted) continue;

      let valueColumn = column + 1;
      for (const mergeRange of merges) {
        const parts = mergeRange.split(':');
        if (parts.length !== 2) continue;
        const start = worksheet.getCell(parts[0]);
        const end = worksheet.getCell(parts[1]);
        if (row === start.row && column >= start.col && column <= end.col) {
          valueColumn = end.col + 1;
          break;
        }
      }
      if (valueColumn <= worksheet.columnCount) return worksheet.getCell(row, valueColumn);
    }
  }
  return null;
}

function setTemplateLabelValue(worksheet, label, fallbackCell, value) {
  const target = findTemplateValueCellByLabel(worksheet, label) || worksheet.getCell(fallbackCell);
  target.value = value;
}

export async function fillQuoteTemplate(quote, outPath, templatePath = TEMPLATE_PATH) {
  if (quote.items.length > MAX_ITEMS) {
    throw new Error(`품목은 최대 ${MAX_ITEMS}개까지 견적서에 담을 수 있습니다. (현재 ${quote.items.length}개)`);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.worksheets[0];

  const set = (cell, value) => {
    const c = ws.getCell(cell);
    c.value = value;
  };

  // 고객 정보
  set('C3', quote.client.company);
  set('F3', quote.client.phone);
  set('I3', quote.quoteNumber);
  set('C4', quote.client.contact);
  set('F4', quote.client.email);
  set('I4', quote.details.quoteDate);

  // 거래 조건
  set('C9',  quote.details.deliveryLocation);
  set('C10', quote.details.deliveryDeadline);
  set('C11', quote.details.paymentTerms);
  set('C12', quote.details.validityPeriod);
  set('C13', quote.details.packing);

  // 제품 목록 (16행부터)
  const START_ROW = 16;
  quote.items.forEach((item, i) => {
    const row = START_ROW + i;
    set(`A${row}`, i + 1);
    set(`B${row}`, item.name);
    set(`D${row}`, item.spec ?? '');

    // 제품명(B~C) 및 규격(D~F) 셀에 다중줄 자동 줄바꿈(wrapText) 적용
    ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
      const c = ws.getCell(`${col}${row}`);
      c.alignment = { ...(c.alignment || {}), wrapText: true, vertical: 'middle' };
    });

    // 규격 텍스트 길이에 맞춰 행 높이를 자동 확장하여 PDF 출력 시 잘리지 않도록 처리
    const specText = String(item.spec ?? '');
    const lineBreaks = (specText.match(/\n/g) || []).length;
    const textLen = specText.length;
    const rowObj = ws.getRow(row);
    if (lineBreaks >= 3 || textLen > 90) {
      rowObj.height = Math.max(rowObj.height || 22, 54);
    } else if (lineBreaks >= 2 || textLen > 60) {
      rowObj.height = Math.max(rowObj.height || 22, 42);
    } else if (lineBreaks >= 1 || textLen > 30) {
      rowObj.height = Math.max(rowObj.height || 22, 32);
    }
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    const multiplierValue = Number(item.multiplier ?? 1);
    const multiplier = Number.isFinite(multiplierValue) && multiplierValue > 0 ? multiplierValue : 1;
    const effectiveUnitPrice = unitPrice * multiplier;
    const totalPrice = Math.round(effectiveUnitPrice * quantity);
    set(`G${row}`, quantity);
    // 템플릿에는 배율 열이 없으므로 단가 칸에 배율을 반영한 유효 단가를 기록한다.
    set(`H${row}`, effectiveUnitPrice);
    set(`I${row}`, totalPrice);
  });

  // 총 견적 금액 (A30)
  const vatStr = `총 견적 금액(VAT포함): ${Math.round(quote.vatTotal).toLocaleString('ko-KR')} 원`;
  set('A30', vatStr);

  // 비고 (B34)
  if (quote.details.notes) set('B34', quote.details.notes);

  // 작성자 정보: 템플릿의 라벨 위치를 찾아 바로 오른쪽 값 셀에 기록한다.
  // 기본 위치(H37~H39)는 구형/라벨 없는 템플릿을 위한 fallback이다.
  setTemplateLabelValue(ws, '작성자', 'H37', quote.author.name);
  setTemplateLabelValue(ws, '연락처', 'H38', quote.author.phone);
  setTemplateLabelValue(ws, '이메일', 'H39', quote.author.email);

  // 템플릿 기본값은 고정 76% 배율이라, 사용하지 않는 우측 여백 열까지 인쇄
  // 영역에 걸리면 2페이지로 잘린다. 항상 1페이지에 맞춰 인쇄되도록 강제한다.
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 1;

  await wb.xlsx.writeFile(outPath);
  await restoreTemplateTextShapes(templatePath, outPath);
}
