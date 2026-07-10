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

