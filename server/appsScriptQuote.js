const REQUIRED_URL_ENV = 'APPS_SCRIPT_WEB_APP_URL';

function requiredAppsScriptUrl() {
  const value = process.env[REQUIRED_URL_ENV];
  if (!value) {
    throw new Error(`${REQUIRED_URL_ENV} is not configured.`);
  }
  return value;
}

function toAppsScriptPayload(quote, options = {}) {
  return {
    details: {
      clientName: quote.client?.company ?? quote.clientCompany ?? '',
      clientContactPerson: quote.client?.contact ?? quote.clientContact ?? '',
      clientPhone: quote.client?.phone ?? '',
      clientEmail: quote.client?.email ?? '',
      quoteNumber: quote.quoteNumber ?? '',
      quoteDate: quote.details?.quoteDate ?? '',
      deliveryLocation: quote.details?.deliveryLocation ?? '',
      deliveryDeadline: quote.details?.deliveryDeadline ?? '',
      paymentTerms: quote.details?.paymentTerms ?? '',
      validityPeriod: quote.details?.validityPeriod ?? '',
      packing: quote.details?.packing ?? '',
      notes: quote.details?.notes ?? '',
      authorName: quote.author?.name ?? quote.authorName ?? '',
      authorPhone: quote.author?.phone ?? '',
      authorEmail: quote.author?.email ?? '',
      authorTeam: quote.author?.authorTeam ?? '',
    },
    items: (quote.items ?? []).map((item) => {
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.unitPrice ?? 0);
      const multiplierValue = Number(item.multiplier ?? 1);
      const multiplier = Number.isFinite(multiplierValue) && multiplierValue > 0 ? multiplierValue : 1;
      return {
        type: item.type ?? '',
        name: item.name ?? '',
        spec: item.spec ?? '',
        quantity,
        unitPrice,
        multiplier,
        totalPrice: Math.round(quantity * unitPrice * multiplier),
      };
    }),
    createDraft: Boolean(options.createDraft),
    customSubject: options.subject ?? '',
    customBody: options.body ?? '',
  };
}

async function readAppsScriptJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.trim().replace(/\s+/g, ' ').slice(0, 180);
    throw new Error(
      `Apps Script returned a non-JSON response. Check the Web App URL and access settings. Response: ${preview || '(empty)'}`,
    );
  }
}

function normalizeResult(result) {
  return {
    ...result,
    pdfUrl: result.pdfUrl ?? result.url,
    sheetUrl: result.sheetUrl ?? '',
    folderUrl: result.folderUrl ?? '',
    newQuoteNumber: result.newQuoteNumber ?? result.quoteNumber,
  };
}

export async function processAppsScriptQuote(inputQuote, options = {}) {
  const url = requiredAppsScriptUrl();
  const payload = toAppsScriptPayload(inputQuote, options);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  const result = normalizeResult(await readAppsScriptJson(res));
  if (!res.ok) {
    return {
      success: false,
      message: result.message ?? `Apps Script request failed: HTTP ${res.status}`,
    };
  }
  return result;
}
