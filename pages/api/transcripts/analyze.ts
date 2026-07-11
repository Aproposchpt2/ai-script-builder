import type { NextApiRequest, NextApiResponse } from 'next';
import {
  analyzeTranscript,
  ingestTranscript,
  type NormalizedTranscript,
  type TranscriptAnalysis,
} from '@/lib/transcriptIntelligenceEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<TranscriptAnalysis | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { transcript, text, fileName, mimeType } = req.body as {
    transcript?: NormalizedTranscript;
    text?: string;
    fileName?: string;
    mimeType?: string;
  };

  try {
    const normalized = transcript ?? ingestTranscript({ text, fileName, mimeType });
    const analysis = analyzeTranscript(normalized);
    return res.status(200).json(analysis);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
