import type { NextApiRequest, NextApiResponse } from 'next';
import { acknowledgeIncident } from '@/lib/runtimeMonitorEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<object | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { incidentId, operator } = req.body as { incidentId?: string; operator?: string };
  if (!incidentId) {
    return res.status(400).json({ error: 'incidentId is required' });
  }

  try {
    const incident = acknowledgeIncident(incidentId, operator ?? 'operator');
    return res.status(200).json({ incident });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
