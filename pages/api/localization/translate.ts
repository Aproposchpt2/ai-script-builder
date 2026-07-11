import type { NextApiRequest, NextApiResponse } from 'next';
import { translateContent, type LocalizationRequest } from '@/lib/localizationEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    return res.status(200).json({ result: translateContent(req.body as LocalizationRequest) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

