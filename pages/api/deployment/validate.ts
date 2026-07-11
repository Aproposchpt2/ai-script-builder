import type { NextApiRequest, NextApiResponse } from 'next';
import { validateFlow, type ValidationReport, type EnvironmentName } from '@/lib/deploymentEngine';
import type { FlowJson } from '@/lib/versioningEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<ValidationReport | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { flow, versionId } = req.body as { flow?: FlowJson; versionId?: string; environment?: EnvironmentName };
  if (!flow && !versionId) {
    return res.status(400).json({ error: 'flow or versionId is required' });
  }

  try {
    const report = validateFlow({ flow, versionId });
    return res.status(200).json(report);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
