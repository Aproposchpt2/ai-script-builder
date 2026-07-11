import type { NextApiRequest, NextApiResponse } from 'next';
import {
  muteIncidents,
  type RuntimeEnvironment,
  type RuntimeEvent,
} from '@/lib/runtimeMonitorEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<object | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { incidentId, environment, flowId, nodeId, eventType, durationMinutes, operator } = req.body as {
    incidentId?: string;
    environment?: RuntimeEnvironment;
    flowId?: string;
    nodeId?: string;
    eventType?: RuntimeEvent['type'];
    durationMinutes?: number;
    operator?: string;
  };

  if (!incidentId && !environment && !flowId && !nodeId && !eventType) {
    return res.status(400).json({ error: 'incidentId or mute pattern is required' });
  }

  try {
    const result = muteIncidents({
      incidentId,
      environment,
      flowId,
      nodeId,
      eventType,
      durationMinutes: Number.isFinite(durationMinutes) ? Number(durationMinutes) : 30,
      operator: operator ?? 'operator',
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
