const VERCEL_APP_URL = 'https://product-selector-two.vercel.app';

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  const queryString = e && e.queryString ? '?' + e.queryString : '';
  template.appUrl = VERCEL_APP_URL + queryString;
  return template
    .evaluate()
    .setTitle('CIMON 제품 선택 가이드')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function processQuoteFromReact(payload) {
  const quoteData = {
    details: payload.details,
    items: payload.items
  };

  return processQuote(
    quoteData,
    Boolean(payload.createDraft),
    payload.customSubject || '',
    payload.customBody || ''
  );
}

function getQuoteLedgerFromReact() {
  const system = getYearSystem(new Date().getFullYear());
  const sheet = system.ledgerSheet;
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) {
    return { success: true, headers: [], rows: [] };
  }

  const range = sheet.getRange(1, 1, lastRow, lastColumn);
  const displayValues = range.getDisplayValues();
  const richTextValues = range.getRichTextValues();
  const headers = displayValues[0];
  const rows = displayValues.slice(1).map((values, rowIndex) => ({
    values: values,
    links: values.map((_, columnIndex) => {
      const richText = richTextValues[rowIndex + 1][columnIndex];
      return richText ? richText.getLinkUrl() : null;
    })
  }));

  return { success: true, headers: headers, rows: rows };
}

// 작성자 DB 시트(시트1)에서 작성자 목록을 읽는다. (CONFIG.AUTHOR_DB_SHEET_ID/AUTHOR_DB_SHEET_NAME 필요)
// 기대하는 열 구성: 작성자(또는 이름/성명) | 연락처 | 이메일 | 부서
function getAuthorsFromReact() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.AUTHOR_DB_SHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.AUTHOR_DB_SHEET_NAME) || spreadsheet.getSheets()[0];
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 1 || lastColumn < 1) {
      return { success: true, authors: [] };
    }

    const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
    const headers = values[0].map(function(v) { return String(v || '').trim(); });

    function findColumn(keywords) {
      for (let c = 0; c < headers.length; c++) {
        for (const keyword of keywords) {
          if (headers[c].indexOf(keyword) !== -1) return c;
        }
      }
      return -1;
    }

    let nameCol = findColumn(['작성자', '이름', '성명']);
    let phoneCol = findColumn(['연락처', '전화', '휴대폰']);
    let emailCol = findColumn(['이메일', '메일']);
    let deptCol = findColumn(['부서', '소속', '팀']);

    const headerMatched = nameCol !== -1;
    if (!headerMatched) {
      nameCol = 0;
      phoneCol = 1;
      emailCol = 2;
      deptCol = 3;
    }

    const authors = [];
    for (let r = headerMatched ? 1 : 0; r < values.length; r++) {
      const name = String(values[r][nameCol] || '').trim();
      if (!name) continue;
      authors.push({
        name: name,
        phone: phoneCol >= 0 ? String(values[r][phoneCol] || '').trim() : '',
        email: emailCol >= 0 ? String(values[r][emailCol] || '').trim() : '',
        department: deptCol >= 0 ? String(values[r][deptCol] || '').trim() : ''
      });
    }

    return { success: true, authors: authors };
  } catch (err) {
    return { success: false, message: '작성자 목록을 불러오지 못했습니다: ' + err.toString(), authors: [] };
  }
}
