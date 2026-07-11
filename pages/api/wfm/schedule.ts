import type { NextApiRequest, NextApiResponse } from 'next';
import { buildSchedule, type ScheduleRequest } from '@/lib/workforceManagementEngine';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const payload = req.body as ScheduleRequest;
    const schedule = buildSchedule(payload);
    return res.status(200).json({ schedule });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
}

