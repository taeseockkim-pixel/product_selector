import { google } from 'googleapis';
import { Readable } from 'stream';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.compose';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const SHEET_MIME = 'application/vnd.google-apps.spreadsheet';
const DEFAULT_DRIVE_ROOT_FOLDER_ID = '1NOwf4QXey_4W51pfd6_TQ2JYcXnpdbX3';
const DEFAULT_QUOTE_TEMPLATE_ID = '1uYNTzJrmEgePXT7RhnTpmz8Xd4atHCCNQPpW3-UmaAM';

const LEDGER_HEADERS = ['NO', '년도', '월', '견적번호', '업체명', '고객명', '연락처', '이메일', '제품 항목', '제품명', '견적 금액', '비고', '파일링크'];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return value;
}

function privateKey() {
  return requiredEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');
}

function serviceAccountEmail() {
  return requiredEnv('GOOGLE_CLIENT_EMAIL');
}

function googleAuth(scopes, subject) {
  return new google.auth.JWT({
    email: serviceAccountEmail(),
    key: privateKey(),
    scopes,
    subject,
  });
}

function safeDriveName(value) {
  return String(value ?? '').replace(/[\/\\:*?"<>|]/g, '').trim();
}

function formatDatePart(date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return { yy, mm };
}

function productSummary(items) {
  if (items.length > 1) return `${items[0].name} 외 ${items.length - 1}건`;
  return items[0]?.name ?? '';
}

function encodeMailHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function base64url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function bufferToStream(buffer) {
  return Readable.from(buffer);
}

async function findFileByName(drive, parentId, name, mimeType) {
  const escapedName = name.replace(/'/g, "\\'");
  const query = [
    `'${parentId}' in parents`,
    `name = '${escapedName}'`,
    mimeType ? `mimeType = '${mimeType}'` : '',
    'trashed = false',
  ].filter(Boolean).join(' and ');
  const res = await drive.files.list({
    q: query,
    fields: 'files(id,name,webViewLink)',
    spaces: 'drive',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return res.data.files?.[0] ?? null;
}

async function getOrCreateFolder(drive, parentId, name) {
  const existing = await findFileByName(drive, parentId, name, FOLDER_MIME);
  if (existing?.id) return existing;
  const res = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: 'id,name,webViewLink',
    supportsAllDrives: true,
  });
  return res.data;
}

async function getOrCreateLedger(drive, sheets, yearFolderId, year) {
  const ledgerName = `${year}_견적관리대장`;
  const existing = await findFileByName(drive, yearFolderId, ledgerName, SHEET_MIME);
  if (existing?.id) return existing;

  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: ledgerName },
      sheets: [{ properties: { title: '견적관리대장' } }],
    },
    fields: 'spreadsheetId,spreadsheetUrl',
  });
  const spreadsheetId = createRes.data.spreadsheetId;
  if (!spreadsheetId) throw new Error('견적관리대장 생성에 실패했습니다.');

  await drive.files.update({
    fileId: spreadsheetId,
    addParents: yearFolderId,
    removeParents: 'root',
    fields: 'id,name,webViewLink',
    supportsAllDrives: true,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: '견적관리대장!A1:M1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [LEDGER_HEADERS] },
  });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { repeatCell: { range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.95, green: 0.96, blue: 0.97 } } }, fields: 'userEnteredFormat(textFormat,backgroundColor)' } },
      ],
    },
  });

  return { id: spreadsheetId, name: ledgerName, webViewLink: createRes.data.spreadsheetUrl };
}

async function nextQuoteNumber(sheets, ledgerId, date) {
  const { yy, mm } = formatDatePart(date);
  const prefix = `기술영업 ${yy}${mm}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ledgerId,
    range: '견적관리대장!D2:D',
  });
  const count = (res.data.values ?? []).filter((row) => String(row[0] ?? '').startsWith(prefix)).length;
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
}

async function appendLedger(sheets, ledgerId, quote, pdfUrl) {
  const date = new Date(quote.createdAt);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ledgerId,
    range: '견적관리대장!A:A',
  });
  const nextNo = Math.max(1, (res.data.values?.length ?? 1));
  await sheets.spreadsheets.values.append({
    spreadsheetId: ledgerId,
    range: '견적관리대장!A:M',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        nextNo,
        date.getFullYear(),
        date.getMonth() + 1,
        quote.quoteNumber,
        quote.client.company,
        quote.client.contact,
        quote.client.phone,
        quote.client.email,
        quote.items[0]?.type ?? '',
        productSummary(quote.items),
        quote.vatTotal,
        quote.details.notes ?? '',
        pdfUrl,
      ]],
    },
  });
}

async function copyTemplate(drive, templateId, targetFolderId, fileName) {
  const res = await drive.files.copy({
    fileId: templateId,
    requestBody: { name: fileName, parents: [targetFolderId] },
    fields: 'id,name,webViewLink',
    supportsAllDrives: true,
  });
  if (!res.data.id) throw new Error('견적서 템플릿 복사에 실패했습니다.');
  return res.data;
}

async function fillQuoteSheet(sheets, spreadsheetId, quote) {
  const values = [
    { range: '견적!C3', values: [[quote.client.company]] },
    { range: '견적!C4', values: [[quote.client.contact]] },
    { range: '견적!F3', values: [[quote.client.phone]] },
    { range: '견적!F4', values: [[quote.client.email]] },
    { range: '견적!I3', values: [[quote.quoteNumber]] },
    { range: '견적!I4', values: [[quote.details.quoteDate]] },
    { range: '견적!C9', values: [[quote.details.deliveryLocation]] },
    { range: '견적!C10', values: [[quote.details.deliveryDeadline]] },
    { range: '견적!C11', values: [[quote.details.paymentTerms]] },
    { range: '견적!C12', values: [[quote.details.validityPeriod]] },
    { range: '견적!C13', values: [[quote.details.packing]] },
    { range: '견적!B34', values: [[quote.details.notes ?? '']] },
    { range: '견적!H37', values: [[quote.author.name]] },
    { range: '견적!H38', values: [[quote.author.phone]] },
    { range: '견적!H39', values: [[quote.author.email]] },
    { range: '견적!A30', values: [[`총 견적 금액(VAT포함): ${Math.round(quote.vatTotal).toLocaleString('ko-KR')} 원`]] },
  ];

  quote.items.forEach((item, index) => {
    const row = 16 + index;
    values.push({ range: `견적!A${row}`, values: [[index + 1]] });
    values.push({ range: `견적!B${row}`, values: [[item.name]] });
    values.push({ range: `견적!D${row}`, values: [[item.spec ?? '']] });
    values.push({ range: `견적!G${row}`, values: [[item.quantity]] });
    values.push({ range: `견적!H${row}`, values: [[item.unitPrice]] });
    values.push({ range: `견적!I${row}`, values: [[item.totalPrice]] });
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: values,
    },
  });
}

async function exportPdf(drive, spreadsheetId) {
  const res = await drive.files.export(
    { fileId: spreadsheetId, mimeType: 'application/pdf' },
    { responseType: 'arraybuffer' },
  );
  return Buffer.from(res.data);
}

async function createPdfFile(drive, folderId, fileName, pdfBuffer) {
  const res = await drive.files.create({
    requestBody: { name: `${fileName}.pdf`, parents: [folderId], mimeType: 'application/pdf' },
    media: { mimeType: 'application/pdf', body: bufferToStream(pdfBuffer) },
    fields: 'id,name,webViewLink',
    supportsAllDrives: true,
  });
  return res.data;
}

async function createGmailDraft(quote, subject, body, pdfFileName, pdfBuffer) {
  const userEmail = quote.author.email || process.env.GOOGLE_IMPERSONATE_EMAIL;
  if (!userEmail) throw new Error('Gmail 초안을 생성할 작성자 이메일이 없습니다.');

  const auth = googleAuth([GMAIL_SCOPE], userEmail);
  const gmail = google.gmail({ version: 'v1', auth });
  const boundary = `cimon_quote_${Date.now()}`;
  const message = [
    `To: ${quote.client.email}`,
    `Subject: ${encodeMailHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf8').toString('base64'),
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${encodeMailHeader(`${pdfFileName}.pdf`)}"`,
    `Content-Disposition: attachment; filename="${encodeMailHeader(`${pdfFileName}.pdf`)}"`,
    'Content-Transfer-Encoding: base64',
    '',
    pdfBuffer.toString('base64'),
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw: base64url(message) } },
  });
  return res.data;
}

export async function processGoogleWorkspaceQuote(inputQuote, options = {}) {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || DEFAULT_DRIVE_ROOT_FOLDER_ID;
  const templateId = process.env.GOOGLE_QUOTE_TEMPLATE_ID || DEFAULT_QUOTE_TEMPLATE_ID;
  const auth = googleAuth([DRIVE_SCOPE, SHEETS_SCOPE], process.env.GOOGLE_IMPERSONATE_EMAIL);
  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });

  const quote = structuredClone(inputQuote);
  const date = new Date(quote.createdAt);
  const year = date.getFullYear();
  const yearFolder = await getOrCreateFolder(drive, rootFolderId, String(year));
  if (!yearFolder.id) throw new Error('연도 폴더를 생성할 수 없습니다.');

  const ledger = await getOrCreateLedger(drive, sheets, yearFolder.id, year);
  if (!ledger.id) throw new Error('견적관리대장을 확인할 수 없습니다.');

  quote.quoteNumber = await nextQuoteNumber(sheets, ledger.id, date);
  const safeQuoteNumber = safeDriveName(quote.quoteNumber);
  const safeClientName = safeDriveName(quote.client.company);
  const folderName = `${safeQuoteNumber}_${safeClientName}`;
  const targetFolder = await getOrCreateFolder(drive, yearFolder.id, folderName);
  if (!targetFolder.id) throw new Error('견적 폴더를 생성할 수 없습니다.');

  const fileName = `${safeClientName}_견적서_${quote.details.quoteDate}`;
  const spreadsheet = await copyTemplate(drive, templateId, targetFolder.id, fileName);
  await fillQuoteSheet(sheets, spreadsheet.id, quote);

  const pdfBuffer = await exportPdf(drive, spreadsheet.id);
  const pdfFile = await createPdfFile(drive, targetFolder.id, fileName, pdfBuffer);
  await appendLedger(sheets, ledger.id, quote, pdfFile.webViewLink ?? '');

  let draftId = '';
  if (options.createDraft) {
    const subject = options.subject || `[CIMON] ${quote.client.company} - 제품 견적서 송부 드립니다.`;
    const body = options.body || `안녕하세요, ${quote.client.contact} 님\nCIMON ${quote.author.name} 입니다.\n\n요청하신 제품 견적서 송부 드립니다.\n발주 시 발주서와 사업자등록증 전달 부탁 드립니다.\n\n추가 문의 사항이 있으시다면 연락 / 회신 부탁 드립니다.\n\n감사합니다.`;
    const draft = await createGmailDraft(quote, subject, body, fileName, pdfBuffer);
    draftId = draft.id ?? '';
  }

  return {
    success: true,
    newQuoteNumber: quote.quoteNumber,
    folderUrl: targetFolder.webViewLink,
    sheetUrl: spreadsheet.webViewLink,
    pdfUrl: pdfFile.webViewLink,
    draftId,
    message: `[완료] ${year}년도 Google Drive 폴더에 저장 완료.\n번호: ${quote.quoteNumber}${options.createDraft ? '\n\nGmail 초안 생성 완료!' : ''}`,
  };
}
