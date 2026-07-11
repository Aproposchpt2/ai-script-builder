import type { NextApiRequest, NextApiResponse } from 'next';
import { rollbackEnvironment, type RollbackStatus, type EnvironmentName } from '@/lib/deploymentEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<RollbackStatus | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { environment, snapshotId, user } = req.body as {
    environment?: EnvironmentName;
    snapshotId?: string;
    user?: string;
  };
  if (!environment) {
    return res.status(400).json({ error: 'environment is required' });
  }

  try {
    const status = rollbackEnvironment({ environment, snapshotId, user });
    return res.status(200).json(status);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
