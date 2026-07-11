import type { NextApiRequest, NextApiResponse } from 'next';
import {
  ingestTranscript,
  mapTranscriptToFlow,
  type FlowMappingResult,
  type NormalizedTranscript,
} from '@/lib/transcriptIntelligenceEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<FlowMappingResult | ErrorResponse>) {
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
    const mapping = mapTranscriptToFlow(normalized);
    return res.status(200).json(mapping);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
