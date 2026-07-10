/**
 * doPost handler for the React/Vercel app.
 * Replace only the existing doPost function in code.gs with this function,
 * then deploy a new Apps Script Web App version.
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const createDraft = Boolean(payload.createDraft);
    const customSubject = payload.customSubject || '';
    const customBody = payload.customBody || '';

    const quoteData = {
      details: payload.details,
      items: payload.items
    };

    const result = processQuote(quoteData, createDraft, customSubject, customBody);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
