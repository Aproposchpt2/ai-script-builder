import type { NextApiRequest, NextApiResponse } from 'next';
import { ingestTranscript, type NormalizedTranscript } from '@/lib/transcriptIntelligenceEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<NormalizedTranscript | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { text, fileName, mimeType } = req.body as { text?: string; fileName?: string; mimeType?: string };
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const transcript = ingestTranscript({ text, fileName, mimeType });
    return res.status(200).json(transcript);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
