import type { NextApiRequest, NextApiResponse } from 'next';
import { getDeploymentHistory, type EnvironmentName } from '@/lib/deploymentEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<object | ErrorResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const environment = (req.query.environment as EnvironmentName | undefined) ?? undefined;
  try {
    const payload = getDeploymentHistory(environment);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
