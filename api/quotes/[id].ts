import type { VercelRequest, VercelResponse } from '@vercel/node';

/** localStorage 기반 저장 방식에서는 서버 단건 조회/삭제 불필요 — 클라이언트에서 처리 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ message: 'Handled client-side' });
}
