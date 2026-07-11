import type { NextApiRequest, NextApiResponse } from 'next';
import { createJourney, type JourneyDefinition } from '@/lib/journeyDesignerEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const payload = req.body as Omit<JourneyDefinition, 'id'>;
    return res.status(200).json({ journey: createJourney(payload) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

