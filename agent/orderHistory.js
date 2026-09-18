/**
 * 발주 내역 분석 모듈 — D:\folders\공유\견적서\{부서}\{연도}\발주 내역\ 폴더 안의
 * 최신 발주 엑셀 파일을 읽어 ERP 수주 실적 통계를 생성하고 제공한다.
 */
import ExcelJS from 'exceljs';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';

function findColIndex(headers, aliases) {
  return headers.findIndex((h) => {
    const text = String(h || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
    return aliases.some((a) => text.includes(a.toLowerCase().replace(/[\s\-_]/g, '')));
  });
}

function cellNum(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'object') {
    const raw = val.result !== undefined ? val.result : val;
    const n = Number(String(raw).replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(String(val).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function cellStr(val) {
  if (val == null) return '';
  if (typeof val === 'object') {
    if (val.result !== undefined) return String(val.result ?? '').trim();
    if (val.richText) return val.richText.map((r) => r.text).join('').trim();
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    return String(val.text || '').trim();
  }
  return String(val).trim();
}

/** 발주 내역 폴더 경로 반환 */
export function getOrderHistoryDir(storageRoot, department, year) {
  const dir = join(storageRoot, department, String(year), '발주 내역');
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch { /* noop */ }
  }
  return dir;
}

/** 해당 경로의 가장 최신 발주 내역 파일 경로 반환 (mtime 기준) */
export function getLatestOrderHistoryFile(orderHistoryDir) {
  if (!existsSync(orderHistoryDir)) return null;
  const files = readdirSync(orderHistoryDir)
    .filter((f) => !f.startsWith('.') && !f.startsWith('~$') && (f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv')))
    .map((name) => {
      const fullPath = join(orderHistoryDir, name);
      try {
        const stat = statSync(fullPath);
        return { name, fullPath, mtime: stat.mtimeMs, size: stat.size };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (files.length === 0) return null;
  files.sort((a, b) => b.mtime - a.mtime);
  return files[0];
}

/** 최신 발주 내역 엑셀 파일 파싱 */
export async function parseOrderHistoryWorkbook(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('엑셀 시트를 찾을 수 없습니다.');

  // 헤더 행 찾기 (1행~5행 중 '주문번호' 또는 '고객' 또는 '품명'이 있는 행)
  let headerRowIdx = 1;
  let headers = [];
  for (let r = 1; r <= Math.min(ws.rowCount, 10); r++) {
    const rowValues = [];
    ws.getRow(r).eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowValues[colNumber - 1] = cellStr(cell.value);
    });
    const hasOrderCol = rowValues.some((v) => /주문번호|발주번호|order/i.test(v));
    const hasClientCol = rowValues.some((v) => /고객|업체명|거래처|client/i.test(v));
    if (hasOrderCol || hasClientCol) {
      headerRowIdx = r;
      headers = rowValues;
      break;
    }
  }

  if (headers.length === 0) {
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = cellStr(cell.value);
    });
  }

  // 컬럼 인덱스 매핑
  const col = {
    orderNo: findColIndex(headers, ['주문번호', '발주번호', 'order']),
    orderDate: findColIndex(headers, ['주문일자', '발주일자', '주문일', '일자', 'date']),
    client: findColIndex(headers, ['고객', '고객사', '업체명', '거래처', '상호']),
    delivery: findColIndex(headers, ['납품처', '배송지', '현장', '납품장소']),
    rep: findColIndex(headers, ['담당자', '영업담당', '작성자', '담당영업', 'rep']),
    itemNo: findColIndex(headers, ['품번', '품목코드', '모델코드', 'code']),
    itemName: findColIndex(headers, ['품명', '제품명', '모델명', '품목명', 'item']),
    spec: findColIndex(headers, ['규격', '사양', 'spec']),
    qty: findColIndex(headers, ['수량', 'qty']),
    price: findColIndex(headers, ['단가', 'price']),
    supply: findColIndex(headers, ['공급가', '공급가액']),
    vat: findColIndex(headers, ['부가세', '세액']),
    total: findColIndex(headers, ['합계액', '합계', '총액', '금액', 'total']),
    deliveryDeadline: findColIndex(headers, ['납기일', '납기']),
    shipDate: findColIndex(headers, ['출하예정일', '출하일']),
    project: findColIndex(headers, ['프로젝트', '관리구분', '구분']),
    notes: findColIndex(headers, ['비고', '내역']),
  };

  const rawRows = [];
  const uniqueOrderNos = new Set();
  const uniqueClients = new Set();

  for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const orderNo = col.orderNo >= 0 ? cellStr(row.getCell(col.orderNo + 1).value) : '';
    const client = col.client >= 0 ? cellStr(row.getCell(col.client + 1).value) : '';
    const itemName = col.itemName >= 0 ? cellStr(row.getCell(col.itemName + 1).value) : '';
    const itemNo = col.itemNo >= 0 ? cellStr(row.getCell(col.itemNo + 1).value) : '';

    // 주문번호나 고객사명이 없으면 건너뜀 (합계 행 등)
    if (!orderNo && !client) continue;
    if (/합\s*계|total|소\s*계/i.test(client) || /합\s*계|total/i.test(orderNo)) continue;

    const orderDateRaw = col.orderDate >= 0 ? cellStr(row.getCell(col.orderDate + 1).value) : '';
    const dateMatch = orderDateRaw.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
    const year = dateMatch ? parseInt(dateMatch[1], 10) : new Date().getFullYear();
    const month = dateMatch ? parseInt(dateMatch[2], 10) : 0;
    const day = dateMatch ? parseInt(dateMatch[3], 10) : 1;
    const dateStr = dateMatch
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : '';

    const qty = col.qty >= 0 ? cellNum(row.getCell(col.qty + 1).value) : 1;
    const unitPrice = col.price >= 0 ? cellNum(row.getCell(col.price + 1).value) : 0;
    const supply = col.supply >= 0 ? cellNum(row.getCell(col.supply + 1).value) : 0;
    const vat = col.vat >= 0 ? cellNum(row.getCell(col.vat + 1).value) : 0;
    let total = col.total >= 0 ? cellNum(row.getCell(col.total + 1).value) : 0;
    if (total === 0 && supply > 0) {
      total = supply + (vat > 0 ? vat : Math.round(supply * 0.1));
    }

    const rep = col.rep >= 0 ? cellStr(row.getCell(col.rep + 1).value) : '';
    const delivery = col.delivery >= 0 ? cellStr(row.getCell(col.delivery + 1).value) : '';
    const spec = col.spec >= 0 ? cellStr(row.getCell(col.spec + 1).value) : '';

    if (orderNo) uniqueOrderNos.add(orderNo);
    if (client) uniqueClients.add(client);

    rawRows.push({
      orderNo: orderNo || `ROW-${r}`,
      orderDate: dateStr || orderDateRaw,
      year,
      month,
      day,
      dateStr,
      client,
      delivery,
      rep: rep || '미지정',
      itemNo,
      itemName: itemName || itemNo || '미입력',
      spec,
      qty,
      unitPrice,
      supply,
      vat,
      total,
    });
  }

  // ── 집계 산출 ──
  const totalAmount = rawRows.reduce((sum, r) => sum + r.total, 0);
  const totalSupply = rawRows.reduce((sum, r) => sum + r.supply, 0);
  const totalVat = rawRows.reduce((sum, r) => sum + r.vat, 0);
  const totalOrders = uniqueOrderNos.size > 0 ? uniqueOrderNos.size : rawRows.length;

  // 월별 추이 (1~12월)
  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const mRows = rawRows.filter((r) => r.month === m);
    const mAmount = mRows.reduce((sum, r) => sum + r.total, 0);
    const mOrders = new Set(mRows.map((r) => r.orderNo)).size;
    return { month: m, amount: mAmount, count: mOrders, supply: mRows.reduce((sum, r) => sum + r.supply, 0) };
  });

  // 고객사별 랭킹 (금액 내림차순 TOP 15)
  const clientMap = new Map();
  rawRows.forEach((r) => {
    const key = r.client || '미입력';
    const prev = clientMap.get(key) ?? { client: key, amount: 0, supply: 0, orderSet: new Set() };
    prev.amount += r.total;
    prev.supply += r.supply;
    prev.orderSet.add(r.orderNo);
    clientMap.set(key, prev);
  });
  const clientRanking = [...clientMap.values()]
    .map((c) => ({ client: c.client, amount: c.amount, supply: c.supply, count: c.orderSet.size }))
    .sort((a, b) => b.amount - a.amount);

  // 영업 담당자별 실적 랭킹
  const repMap = new Map();
  rawRows.forEach((r) => {
    const key = r.rep || '미지정';
    const prev = repMap.get(key) ?? { rep: key, amount: 0, supply: 0, orderSet: new Set() };
    prev.amount += r.total;
    prev.supply += r.supply;
    prev.orderSet.add(r.orderNo);
    repMap.set(key, prev);
  });
  const repRanking = [...repMap.values()]
    .map((c) => ({ rep: c.rep, amount: c.amount, supply: c.supply, count: c.orderSet.size }))
    .sort((a, b) => b.amount - a.amount);

  // 주력 제품별 랭킹 (품명 기준)
  const productMap = new Map();
  rawRows.forEach((r) => {
    const key = r.itemName || r.itemNo || '미입력';
    const prev = productMap.get(key) ?? { name: key, itemNo: r.itemNo, amount: 0, qty: 0, count: 0 };
    prev.amount += r.total;
    prev.qty += r.qty;
    prev.count += 1;
    productMap.set(key, prev);
  });
  const productRanking = [...productMap.values()].sort((a, b) => b.amount - a.amount);

  // 최근 발주 주문 요약 (주문번호 기준 그룹핑 상위 20건)
  const orderSummaryMap = new Map();
  rawRows.forEach((r) => {
    const prev = orderSummaryMap.get(r.orderNo) ?? {
      orderNo: r.orderNo,
      orderDate: r.orderDate,
      month: r.month,
      day: r.day,
      dateStr: r.dateStr,
      client: r.client,
      delivery: r.delivery,
      rep: r.rep,
      amount: 0,
      itemCount: 0,
      firstItem: r.itemName,
    };
    prev.amount += r.total;
    prev.itemCount += 1;
    orderSummaryMap.set(r.orderNo, prev);
  });
  const recentOrders = [...orderSummaryMap.values()]
    .sort((a, b) => (b.dateStr || '').localeCompare(a.dateStr || '') || b.amount - a.amount);

  return {
    totalAmount,
    totalSupply,
    totalVat,
    totalOrders,
    totalItems: rawRows.length,
    uniqueClients: uniqueClients.size,
    monthlyTotals,
    clientRanking,
    repRanking,
    productRanking,
    recentOrders,
    rawRows,
  };
}

/** Drive 동기화 폴더(stats/{department}_orders.json)에 캐시 파일 저장 */
export function syncOrderHistoryToDrive(agentFolder, department, year, orderStats, fileName) {
  try {
    const statsDir = join(agentFolder, 'stats');
    if (!existsSync(statsDir)) mkdirSync(statsDir, { recursive: true });
    const payload = {
      department,
      year,
      sourceFileName: fileName,
      generatedAt: new Date().toISOString(),
      ...orderStats,
    };
    const targetFile = join(statsDir, `${department}_orders.json`);
    writeFileSync(targetFile, JSON.stringify(payload), 'utf8');
    console.log(`[에이전트] 발주 내역 통계 JSON 동기화 완료: ${targetFile}`);
  } catch (err) {
    console.warn(`[에이전트] 발주 내역 JSON 동기화 실패: ${err.message}`);
  }
}

/** 발주 내역 업로드 웹 페이지 HTML */
export function orderHistoryUploadHtml(session, department, year, latestFile) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>발주 내역 파일 업로드 - ${department}</title>
  <style>
    body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; background: #f0ede8; margin: 0; padding: 40px 16px; color: #191919; }
    .card { max-width: 680px; margin: 0 auto; background: #fff; border: 1px solid #ddd9d2; border-radius: 12px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    h1 { font-size: 18px; margin: 0 0 6px; color: #0f172a; }
    .sub { color: #64748b; font-size: 12px; margin-bottom: 20px; line-height: 1.5; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; margin-bottom: 12px; }
    .drop-zone { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 32px 20px; text-align: center; background: #fafbfc; cursor: pointer; transition: all 0.2s; margin-bottom: 16px; }
    .drop-zone:hover, .drop-zone.dragover { border-color: #059669; background: #f0fdf4; }
    .drop-zone p { margin: 6px 0; font-size: 13px; color: #475569; }
    .file-input { display: none; }
    .btn { display: inline-block; width: 100%; box-sizing: border-box; background: #059669; color: #fff; padding: 12px 20px; font-size: 14px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; text-align: center; }
    .btn:hover { background: #047857; }
    .btn:disabled { background: #cbd5e1; cursor: not-allowed; }
    .file-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 12px; color: #334155; }
    .file-name { font-weight: bold; color: #0f172a; }
    .status { margin-top: 16px; font-size: 13px; text-align: center; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">ERP 발주 내역 동기화</span>
    <h1>${department} ${year}년도 발주 내역 파일 업로드</h1>
    <div class="sub">
      ERP/엑셀에서 내려받은 수주·발주 내역 파일(.xlsx)을 업로드하면, 대시보드의 발주(수주) 실적 분석에 최신 데이터로 즉시 반영됩니다.
    </div>

    ${latestFile ? `
      <div class="file-info">
        <strong>현재 적용 중인 최신 파일:</strong><br>
        📁 <span class="file-name">${latestFile.name}</span> (${new Date(latestFile.mtime).toLocaleString('ko-KR')})
      </div>
    ` : `
      <div class="file-info" style="color: #64748b;">
        현재 등록된 발주 내역 파일이 없습니다. 새 파일을 업로드해 주세요.
      </div>
    `}

    <div class="drop-zone" id="dropZone">
      <svg style="width: 36px; height: 36px; color: #059669; margin: 0 auto;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p style="font-weight: bold; color: #0f172a; margin-top: 8px;">엑셀 파일(.xlsx, .xls)을 여기에 끌어다 놓거나 클릭하여 선택하세요</p>
      <p style="font-size: 11px; color: #94a3b8;">주문번호, 주문일자, 고객, 품명, 수량, 합계액 등이 포함된 파일</p>
      <input type="file" id="fileInput" class="file-input" accept=".xlsx,.xls,.csv" />
    </div>

    <div id="selectedDisplay" style="display: none; margin-bottom: 16px; font-size: 13px; font-weight: bold; color: #059669;">
      선택된 파일: <span id="selectedFileName"></span>
    </div>

    <button type="button" class="btn" id="uploadBtn" disabled>발주 내역 업로드 및 분석 반영</button>
    <div id="statusMsg" class="status"></div>
  </div>

  <script>
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const selectedDisplay = document.getElementById('selectedDisplay');
    const selectedFileName = document.getElementById('selectedFileName');
    const statusMsg = document.getElementById('statusMsg');
    let selectedFile = null;

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) handleFile(fileInput.files[0]);
    });

    function handleFile(file) {
      selectedFile = file;
      selectedFileName.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
      selectedDisplay.style.display = 'block';
      uploadBtn.disabled = false;
      statusMsg.textContent = '';
    }

    uploadBtn.addEventListener('click', () => {
      if (!selectedFile) return;
      uploadBtn.disabled = true;
      statusMsg.style.color = '#2563eb';
      statusMsg.textContent = '파일 업로드 및 발주 데이터 분석 중... 잠시만 기다려 주세요.';

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const res = await fetch('/api/order-history/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              department: '${department}',
              year: ${year},
              fileName: selectedFile.name,
              base64: base64
            })
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.message || '업로드 실패');

          statusMsg.style.color = '#059669';
          statusMsg.textContent = '✅ 업로드 및 발주 분석 반영 완료! 창이 자동으로 닫힙니다.';
          if (window.opener) {
            window.opener.postMessage({ source: 'cimon-order-history-agent', type: 'ORDER_HISTORY_UPLOADED' }, '*');
          }
          setTimeout(() => window.close(), 1200);
        } catch (err) {
          uploadBtn.disabled = false;
          statusMsg.style.color = '#dc2626';
          statusMsg.textContent = '❌ 오류: ' + err.message;
        }
      };
      reader.readAsDataURL(selectedFile);
    });
  </script>
</body>
</html>`;
}
