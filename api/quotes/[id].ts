import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list } from '@vercel/blob';
import type { QuoteMeta } from '../../src/types/quote';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    try {
      const meta = await readMeta();
      const quote = meta.quotes.find((q) => q.id === id);
      if (!quote) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(quote);
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const meta = await readMeta();
      const idx = meta.quotes.findIndex((q) => q.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      meta.quotes.splice(idx, 1);
      await writeMeta(meta);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
