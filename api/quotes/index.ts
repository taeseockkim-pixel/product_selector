import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list } from '@vercel/blob';
import type { Quote, QuoteMeta, CreateQuoteRequest, QuoteSummary } from '../../src/types/quote';

const META_PATH = 'cimon-quotes-meta.json';

async function readMeta(): Promise<QuoteMeta> {
  const { blobs } = await list({ prefix: META_PATH });
  if (blobs.length === 0) return { sequence: {}, quotes: [] };
  const res = await fetch(blobs[0].url);
  if (!res.ok) return { sequence: {}, quotes: [] };
  return (await res.json()) as QuoteMeta;
}

async function writeMeta(data: QuoteMeta): Promise<void> {
  await put(META_PATH, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
}

function toSummary(q: Quote): QuoteSummary {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    createdAt: q.createdAt,
    clientCompany: q.clientCompany,
    clientContact: q.clientContact,
    vatTotal: q.vatTotal,
    authorName: q.authorName,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const meta = await readMeta();
      return res.status(200).json({ quotes: meta.quotes.map(toSummary) });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body as CreateQuoteRequest;

      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yymm = `${yy}${mm}`;

      const meta = await readMeta();
      const seq = (meta.sequence[yymm] ?? 0) + 1;
      meta.sequence[yymm] = seq;
      const quoteNumber = `기술영업 ${yymm}-${String(seq).padStart(3, '0')}`;

      const id = crypto.randomUUID();
      const quote: Quote = {
        id,
        quoteNumber,
        createdAt: now.toISOString(),
        clientCompany: body.client.company,
        clientContact: body.client.contact,
        vatTotal: body.vatTotal,
        authorName: body.author.name,
        client: body.client,
        author: body.author,
        details: body.details,
        items: body.items,
        subtotal: body.subtotal,
      };

      meta.quotes.unshift(quote);
      await writeMeta(meta);

      return res.status(201).json({ id, quoteNumber });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
