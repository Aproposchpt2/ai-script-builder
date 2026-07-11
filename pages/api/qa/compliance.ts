import type { NextApiRequest, NextApiResponse } from 'next';
import { detectCompliance, type QAInput } from '@/lib/qualityAssuranceEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    return res.status(200).json({ compliance: detectCompliance(req.body as QAInput) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

