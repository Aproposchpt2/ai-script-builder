import type { NextApiRequest, NextApiResponse } from 'next';
import { buildAnalyticsReport, type AnalyticsInput, type AnalyticsReport } from '@/lib/analyticsEngine';

type ErrorResponse = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyticsReport | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { script } = req.body as { script?: AnalyticsInput };
  if (!script || typeof script !== 'object') {
    return res.status(400).json({ error: 'script object is required' });
  }

  const report = buildAnalyticsReport(script);
  return res.status(200).json(report);
}

