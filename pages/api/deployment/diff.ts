import type { NextApiRequest, NextApiResponse } from 'next';
import { diffEnvironments, type DeploymentDiffReport, type EnvironmentName } from '@/lib/deploymentEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<DeploymentDiffReport | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { environmentA, environmentB } = req.body as {
    environmentA?: EnvironmentName;
    environmentB?: EnvironmentName;
  };
  if (!environmentA || !environmentB) {
    return res.status(400).json({ error: 'environmentA and environmentB are required' });
  }

  try {
    const diff = diffEnvironments(environmentA, environmentB);
    return res.status(200).json(diff);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
