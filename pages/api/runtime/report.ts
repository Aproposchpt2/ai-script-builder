import type { NextApiRequest, NextApiResponse } from 'next';
import { generateIncidentReport, type RuntimeEnvironment } from '@/lib/runtimeMonitorEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<object | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { incidentId, start, end, environment } = req.body as {
    incidentId?: string;
    start?: string;
    end?: string;
    environment?: RuntimeEnvironment;
  };

  try {
    const report = generateIncidentReport({ incidentId, start, end, environment });
    return res.status(200).json(report);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
