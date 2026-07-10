import type { NextApiRequest, NextApiResponse } from 'next';
import { buildRoutingReport, type RoutingReport, type RoutingScript } from '@/lib/routingAnalyzer';

type ErrorResponse = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<RoutingReport | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { script } = req.body as { script?: RoutingScript };
  if (!script || typeof script !== 'object') {
    return res.status(400).json({ error: 'script object is required' });
  }

  const report = buildRoutingReport(script);
  return res.status(200).json(report);
}

