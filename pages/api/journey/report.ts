import type { NextApiRequest, NextApiResponse } from 'next';
import { analyzeJourney, type JourneyDefinition } from '@/lib/journeyDesignerEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    return res.status(200).json({ report: analyzeJourney(req.body as JourneyDefinition) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

