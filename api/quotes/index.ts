import type { VercelRequest, VercelResponse } from '@vercel/node';

/** 견적번호 생성만 담당 — 저장은 클라이언트 localStorage에서 처리 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const body = req.body as { yymm?: string; seq?: number; department?: string };

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yymm = body.yymm ?? `${yy}${mm}`;
    const seq = body.seq ?? 1;
    const department = typeof body.department === 'string' && body.department.trim()
      ? body.department.trim()
      : '기술영업';
    const quoteNumber = `${department} ${yymm}-${String(seq).padStart(3, '0')}`;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return res.status(201).json({ id, quoteNumber });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
