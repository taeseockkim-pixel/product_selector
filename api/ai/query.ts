import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processOpenRouterRequest } from '../../server/openrouter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const result = await processOpenRouterRequest(req.body);
    return res.status(result.status).json(result.body);
  } catch {
    return res.status(500).json({ success: false, message: 'AI 요청 처리 중 오류가 발생했습니다.' });
  }
}
