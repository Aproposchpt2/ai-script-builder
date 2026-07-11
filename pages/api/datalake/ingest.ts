import type { NextApiRequest, NextApiResponse } from 'next';
import { ingestData, type DataLakeRecord, type DataLakeState } from '@/lib/dataLakeEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = req.body as { state?: DataLakeState; records: DataLakeRecord[] };
    const state = body.state ?? { records: [] };
    return res.status(200).json({ state: ingestData(state, body.records) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

