import type { NextApiRequest, NextApiResponse } from 'next';
import { deployToEnvironment, type DeploymentReport, type EnvironmentName } from '@/lib/deploymentEngine';
import type { FlowJson } from '@/lib/versioningEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<DeploymentReport | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { environment, versionId, flow, user, notes } = req.body as {
    environment?: EnvironmentName;
    versionId?: string;
    flow?: FlowJson;
    user?: string;
    notes?: string;
  };
  if (!environment) {
    return res.status(400).json({ error: 'environment is required' });
  }

  try {
    const report = deployToEnvironment({ environment, versionId, flow, user, notes });
    return res.status(200).json(report);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
