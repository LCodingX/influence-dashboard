import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_lib/auth.js';
import { supabaseAdmin } from './_lib/supabase-admin.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const user = await verifyAuth(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const jobId = req.query.job_id as string | undefined;
    if (!jobId) {
      res.status(400).json({ error: 'job_id query parameter is required' });
      return;
    }

    const afterSeq = parseInt(req.query.after_seq as string || '0', 10);

    // Verify job ownership
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    // Fetch log entries after the given sequence number
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('job_logs')
      .select('id, job_id, seq, timestamp, level, phase, message, metadata')
      .eq('job_id', jobId)
      .gt('seq', afterSeq)
      .order('seq', { ascending: true })
      .limit(200);

    if (logsError) {
      res.status(500).json({ error: `Failed to fetch logs: ${logsError.message}` });
      return;
    }

    res.status(200).json(logs ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
