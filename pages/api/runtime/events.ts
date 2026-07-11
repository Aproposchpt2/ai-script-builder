import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getRuntimeSnapshot,
  ingestMockEvents,
  type RuntimeEnvironment,
  type RuntimeSeverity,
} from '@/lib/runtimeMonitorEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<object | ErrorResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const environment = (req.query.environment as RuntimeEnvironment | undefined) ?? 'dev';
  const flowId = (req.query.flowId as string | undefined) ?? undefined;
  const nodeId = (req.query.nodeId as string | undefined) ?? undefined;
  const severity = (req.query.severity as RuntimeSeverity | undefined) ?? undefined;
  const minutes = Number(req.query.minutes ?? '30');

  try {
    ingestMockEvents(environment, 25);
    const snapshot = getRuntimeSnapshot({
      environment,
      flowId: flowId && flowId.length > 0 ? flowId : undefined,
      nodeId: nodeId && nodeId.length > 0 ? nodeId : undefined,
      severity: severity && severity.length > 0 ? severity : undefined,
      minutes: Number.isFinite(minutes) ? minutes : 30,
    });
    return res.status(200).json(snapshot);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
