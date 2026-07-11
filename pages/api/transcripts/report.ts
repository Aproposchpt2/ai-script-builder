import type { NextApiRequest, NextApiResponse } from 'next';
import {
  analyzeTranscript,
  generateIntelligenceReport,
  ingestTranscript,
  mapTranscriptToFlow,
  type FlowMappingResult,
  type IntelligenceReport,
  type NormalizedTranscript,
  type TranscriptAnalysis,
} from '@/lib/transcriptIntelligenceEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<IntelligenceReport | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { transcript, analysis, flowMapping, text, fileName, mimeType } = req.body as {
    transcript?: NormalizedTranscript;
    analysis?: TranscriptAnalysis;
    flowMapping?: FlowMappingResult;
    text?: string;
    fileName?: string;
    mimeType?: string;
  };

  try {
    const normalized = transcript ?? ingestTranscript({ text, fileName, mimeType });
    const computedAnalysis = analysis ?? analyzeTranscript(normalized);
    const computedMapping = flowMapping ?? mapTranscriptToFlow(normalized);
    const report = generateIntelligenceReport({
      transcript: normalized,
      analysis: computedAnalysis,
      flowMapping: computedMapping,
    });
    return res.status(200).json(report);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
