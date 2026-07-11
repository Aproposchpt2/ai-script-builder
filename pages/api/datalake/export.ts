import type { NextApiRequest, NextApiResponse } from 'next';
import { exportResults, type DataLakeState } from '@/lib/dataLakeEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = req.body as { state: DataLakeState; query: { source?: string; containsText?: string; limit?: number } };
    return res.status(200).json(exportResults(body.state, body.query));
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

