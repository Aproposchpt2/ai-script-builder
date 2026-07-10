import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type Flow = {
  id: string;
  name: string;
  text_input: string;
  parsed_output: object;
  engine: string;
  created_at: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Flow[] | { error: string }>
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(200).json([]);

  const authHeader  = req.headers.authorization ?? '';
  const accessToken = authHeader.replace('Bearer ', '');
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const supabase = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth:   { persistSession: false },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { data, error } = await supabase
    .from('flows')
    .select('id, name, text_input, parsed_output, engine, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data ?? []);
}
