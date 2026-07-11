import type { NextApiRequest, NextApiResponse } from 'next';
import { generateForecast, type ForecastRequest } from '@/lib/workforceManagementEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const payload = req.body as ForecastRequest;
    const forecast = generateForecast(payload);
    return res.status(200).json({ forecast });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

