import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_lib/auth.js';
import { supabaseAdmin } from './_lib/supabase-admin.js';
import { RunPodBackend } from './_lib/runpod.js';
import type { StreamLogEntry } from './_lib/runpod.js';
import { decrypt } from './_lib/encryption.js';

/**
 * Resolve the RunPod endpoint ID for a job.
 * Priority: job.device_id → devices table → fallback to profile.runpod_endpoint_id
 */
async function resolveEndpointId(
  userId: string,
  deviceId: string | null
): Promise<string | null> {
  if (deviceId) {
    const { data: device } = await supabaseAdmin
      .from('devices')
      .select('endpoint_id')
      .eq('id', deviceId)
      .eq('user_id', userId)
      .single();
    if (device?.endpoint_id) return device.endpoint_id as string;
  }

  // Fallback to profile for legacy jobs
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('runpod_endpoint_id')
    .eq('id', userId)
    .single();

  return (profile?.runpod_endpoint_id as string) ?? null;
}

/**
 * Persist new log entries from the RunPod stream into the job_logs table.
 */
async function persistLogs(
  jobId: string,
  userId: string,
  logs: StreamLogEntry[],
  currentCursor: number
): Promise<number> {
  const newLogs = logs.filter((l) => l.seq > currentCursor);
  if (newLogs.length === 0) return currentCursor;

  const rows = newLogs.map((l) => ({
    job_id: jobId,
    user_id: userId,
    seq: l.seq,
    timestamp: l.timestamp,
    level: l.level,
    phase: l.phase,
    message: l.message,
    metadata: l.metadata,
  }));

  // Upsert to handle duplicates gracefully
  await supabaseAdmin
    .from('job_logs')
    .upsert(rows, { onConflict: 'job_id,seq', ignoreDuplicates: true });

  const maxSeq = Math.max(...newLogs.map((l) => l.seq));

  // Update the cursor on the job
  await supabaseAdmin
    .from('jobs')
    .update({ log_seq_cursor: maxSeq })
    .eq('id', jobId);

  return maxSeq;
}

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

  // Prevent caching of status responses (avoids 304 on polling)
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

    // If job is in a terminal state, return the full record as-is
    if (job.status === 'completed' || job.status === 'failed') {
      res.status(200).json(job);
      return;
    }

    // If we have a RunPod job ID, fetch live status and merge into the record
    const runpodJobId = job.runpod_job_id as string | null;

    if (runpodJobId) {
      try {
        // Get the user's RunPod API key
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('runpod_api_key_encrypted')
          .eq('id', user.id)
          .single();

        if (!profile?.runpod_api_key_encrypted) {
          res.status(200).json({
            ...job,
            _warning: 'RunPod credentials not found. Cannot fetch live status.',
          });
          return;
        }

        // Resolve endpoint from device or profile fallback
        const endpointId = await resolveEndpointId(
          user.id,
          (job.device_id as string) ?? null
        );

        if (!endpointId) {
          res.status(200).json({
            ...job,
            _warning: 'RunPod endpoint not found. Cannot fetch live status.',
          });
          return;
        }

        const backend = new RunPodBackend({
          apiKey: decrypt(profile.runpod_api_key_encrypted as string),
          endpointId,
        });

        const { statusResult: liveStatus, logs } = await backend.getStreamWithLogs(runpodJobId);

        // Persist any new log entries
        const currentCursor = (job.log_seq_cursor as number) ?? 0;
        await persistLogs(jobId, user.id, logs, currentCursor);

        // Update Supabase with latest status
        const updateData: Record<string, unknown> = {
          status: liveStatus.status,
          progress: liveStatus.progress,
          current_epoch: liveStatus.current_epoch,
          total_epochs: liveStatus.total_epochs,
          training_loss: liveStatus.training_loss,
        };

        if (liveStatus.status === 'completed' || liveStatus.status === 'failed') {
          updateData.completed_at = new Date().toISOString();
        }

        await supabaseAdmin
          .from('jobs')
          .update(updateData)
          .eq('id', jobId);

        // Return the full job record merged with live data
        res.status(200).json({
          ...job,
          ...updateData,
        });
        return;
      } catch (backendError) {
        // If backend is unreachable, return the cached job with a warning
        res.status(200).json({
          ...job,
          _warning: `Could not reach RunPod backend for live status: ${
            backendError instanceof Error ? backendError.message : 'Unknown error'
          }`,
        });
        return;
      }
    }

    // No RunPod job ID yet -- return the full job record as-is
    res.status(200).json(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
