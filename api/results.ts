import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_lib/auth.js';
import { supabaseAdmin } from './_lib/supabase-admin.js';
import { RunPodBackend } from './_lib/runpod.js';
import { decrypt } from './_lib/encryption.js';

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
    // Verify authentication
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

    // Fetch job from Supabase, verifying ownership
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    // If results are already cached, return them directly
    if (job.results) {
      res.status(200).json(job.results);
      return;
    }

    // Job must be completed to have results
    if (job.status !== 'completed') {
      res.status(400).json({
        error: `Job is not completed (current status: ${job.status})`,
      });
      return;
    }

    // Fetch results from RunPod
    const runpodJobId = job.runpod_job_id as string | null;

    if (!runpodJobId) {
      res.status(500).json({ error: 'Job has no RunPod job ID' });
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('runpod_api_key_encrypted, runpod_endpoint_id')
      .eq('id', user.id)
      .single();

    if (!profile?.runpod_api_key_encrypted) {
      res.status(500).json({
        error: 'RunPod API key not found. Cannot fetch results.',
      });
      return;
    }

    // Resolve endpoint from device or profile fallback
    let endpointId: string | null = null;
    const deviceId = job.device_id as string | null;
    if (deviceId) {
      const { data: device } = await supabaseAdmin
        .from('devices')
        .select('endpoint_id')
        .eq('id', deviceId)
        .eq('user_id', user.id)
        .single();
      if (device?.endpoint_id) {
        endpointId = device.endpoint_id as string;
      }
    }
    if (!endpointId) {
      endpointId = (profile.runpod_endpoint_id as string) ?? null;
    }

    if (!endpointId) {
      res.status(500).json({
        error: 'RunPod endpoint not configured. Cannot fetch results.',
      });
      return;
    }

    const backend = new RunPodBackend({
      apiKey: decrypt(profile.runpod_api_key_encrypted as string),
      endpointId,
    });

    const backendResults = await backend.getResults(runpodJobId);

    // Cache results in Supabase
    await supabaseAdmin
      .from('jobs')
      .update({
        results: backendResults,
        training_metadata: backendResults.training_metadata,
      })
      .eq('id', jobId);

    res.status(200).json(backendResults);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
