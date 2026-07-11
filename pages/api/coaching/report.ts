import type { NextApiRequest, NextApiResponse } from 'next';
import {
  generateCoachingReport,
  type CoachingInputTranscript,
  type CoachingOutput,
} from '@/lib/agentCoachingEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<CoachingOutput | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { transcriptIds, transcripts, team, queue, flowId } = req.body as {
    transcriptIds?: string[];
    transcripts?: CoachingInputTranscript[];
    team?: string;
    queue?: string;
    flowId?: string;
  };

  try {
    const result = generateCoachingReport({ transcriptIds, transcripts, team, queue, flowId });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
