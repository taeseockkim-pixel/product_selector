import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processGoogleWorkspaceQuote } from '../../server/googleWorkspace.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { quote, createDraft = false, subject = '', body = '' } = req.body ?? {};
    if (!quote) return res.status(400).json({ success: false, message: 'quote payload is required' });

    const result = await processGoogleWorkspaceQuote(quote, { createDraft, subject, body });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: String(err) });
  }
}
