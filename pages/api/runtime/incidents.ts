import type { NextApiRequest, NextApiResponse } from 'next';
import {
  listIncidents,
  type RuntimeEnvironment,
  type RuntimeIncidentStatus,
} from '@/lib/runtimeMonitorEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<object | ErrorResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const environment = (req.query.environment as RuntimeEnvironment | undefined) ?? undefined;
  const status = (req.query.status as RuntimeIncidentStatus | undefined) ?? undefined;
  const minutes = Number(req.query.minutes ?? '1440');

  try {
    const incidents = listIncidents({
      environment,
      status,
      minutes: Number.isFinite(minutes) ? minutes : 1440,
    });
    return res.status(200).json(incidents);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
