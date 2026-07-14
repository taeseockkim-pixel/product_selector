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
