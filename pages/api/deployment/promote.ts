import type { NextApiRequest, NextApiResponse } from 'next';
import { promoteEnvironment, type PromotionReport, type EnvironmentName } from '@/lib/deploymentEngine';

type ErrorResponse = { error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<PromotionReport | ErrorResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { fromEnvironment, toEnvironment, user, notes } = req.body as {
    fromEnvironment?: EnvironmentName;
    toEnvironment?: EnvironmentName;
    user?: string;
    notes?: string;
  };
  if (!fromEnvironment || !toEnvironment) {
    return res.status(400).json({ error: 'fromEnvironment and toEnvironment are required' });
  }

  try {
    const report = promoteEnvironment({ fromEnvironment, toEnvironment, user, notes });
    return res.status(200).json(report);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}
