import type { NextApiRequest, NextApiResponse } from 'next';
import { repairFlow, type FlowModel, type FlowRepairResult } from '@/lib/flowRepairEngine';

type ErrorResponse = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<FlowRepairResult | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { flow } = req.body as { flow?: FlowModel };
  if (!flow || typeof flow !== 'object') {
    return res.status(400).json({ error: 'flow object is required' });
  }

  const result = repairFlow(flow);
  return res.status(200).json(result);
}

