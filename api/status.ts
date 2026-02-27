import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_lib/auth';
import { supabaseAdmin } from './_lib/supabase-admin';
import { RunPodBackend } from './_lib/runpod';
import { decrypt } from './_lib/encryption';

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

    // If job is in a terminal state, return cached data
    if (job.status === 'completed' || job.status === 'failed') {
      res.status(200).json({
        job_id: job.id,
        status: job.status,
        progress: job.progress,
        current_epoch: job.current_epoch,
        total_epochs: job.total_epochs,
        training_loss: job.training_loss,
        error: job.error,
        eta_seconds: 0,
      });
      return;
    }

    // If we have a RunPod job ID, fetch live status
    const runpodJobId = job.runpod_job_id as string | null;

    if (runpodJobId) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('runpod_api_key_encrypted, runpod_endpoint_id')
          .eq('id', user.id)
          .single();

        if (!profile?.runpod_api_key_encrypted || !profile?.runpod_endpoint_id) {
          res.status(200).json({
            job_id: job.id,
            status: job.status,
            progress: job.progress,
            current_epoch: job.current_epoch,
            total_epochs: job.total_epochs,
            training_loss: job.training_loss,
            eta_seconds: null,
            warning: 'RunPod credentials not found. Cannot fetch live status.',
          });
          return;
        }

        const backend = new RunPodBackend({
          apiKey: decrypt(profile.runpod_api_key_encrypted as string),
          endpointId: profile.runpod_endpoint_id as string,
        });

        const liveStatus = await backend.getStatus(runpodJobId);

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

        res.status(200).json({
          job_id: job.id,
          status: liveStatus.status,
          progress: liveStatus.progress,
          current_epoch: liveStatus.current_epoch,
          total_epochs: liveStatus.total_epochs,
          training_loss: liveStatus.training_loss,
          eta_seconds: liveStatus.eta_seconds,
        });
        return;
      } catch (backendError) {
        // If backend is unreachable, return cached data with a warning
        res.status(200).json({
          job_id: job.id,
          status: job.status,
          progress: job.progress,
          current_epoch: job.current_epoch,
          total_epochs: job.total_epochs,
          training_loss: job.training_loss,
          eta_seconds: null,
          warning: `Could not reach RunPod backend for live status: ${
            backendError instanceof Error ? backendError.message : 'Unknown error'
          }`,
        });
        return;
      }
    }

    // No RunPod job ID yet -- return queued status
    res.status(200).json({
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      current_epoch: job.current_epoch,
      total_epochs: job.total_epochs,
      training_loss: job.training_loss,
      eta_seconds: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
