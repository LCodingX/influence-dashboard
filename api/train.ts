import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_lib/auth.js';
import { supabaseAdmin } from './_lib/supabase-admin.js';
import { RunPodBackend } from './_lib/runpod.js';
import { decrypt } from './_lib/encryption.js';

interface TrainRequestBody {
  model_id: string;
  training_data: Array<{ id: string; question: string; answer: string }>;
  eval_data: Array<{ id: string; question: string }>;
  hyperparams: {
    learning_rate: number;
    num_epochs: number;
    batch_size: number;
    lora_rank: number;
    lora_alpha: number;
    lora_target_modules: string[];
    quantization: '4bit' | '8bit' | 'none';
    max_seq_length: number;
    warmup_ratio: number;
    weight_decay: number;
  };
  influence_method: 'tracin' | 'datainf' | 'kronfluence';
  checkpoint_interval: number;
  experiment_id?: string;
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

  if (req.method !== 'POST') {
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

    const body = req.body as TrainRequestBody;

    // Validate required fields
    if (!body.model_id) {
      res.status(400).json({ error: 'model_id is required' });
      return;
    }
    if (!body.training_data || !Array.isArray(body.training_data) || body.training_data.length === 0) {
      res.status(400).json({ error: 'training_data is required and must be a non-empty array' });
      return;
    }
    if (!body.eval_data || !Array.isArray(body.eval_data) || body.eval_data.length === 0) {
      res.status(400).json({ error: 'eval_data is required and must be a non-empty array' });
      return;
    }
    if (!body.hyperparams) {
      res.status(400).json({ error: 'hyperparams is required' });
      return;
    }
    if (!body.influence_method) {
      res.status(400).json({ error: 'influence_method is required' });
      return;
    }

    // Fetch user's RunPod credentials and HF token from their profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('runpod_api_key_encrypted, runpod_endpoint_id, hf_token_encrypted')
      .eq('id', user.id)
      .single();

    if (profileError) {
      res.status(500).json({ error: `Failed to fetch profile: ${profileError.message}` });
      return;
    }

    if (!profile?.runpod_api_key_encrypted) {
      res.status(400).json({
        error: 'RunPod API key not configured. Please set up your RunPod key in settings.',
      });
      return;
    }

    let decryptedKey: string;
    try {
      decryptedKey = decrypt(profile.runpod_api_key_encrypted as string);
    } catch {
      res.status(500).json({
        error: 'Failed to decrypt RunPod API key. Please reconfigure your key in settings.',
      });
      return;
    }

    // Decrypt HuggingFace token if present (optional — only needed for gated models)
    let decryptedHfToken: string | null = null;
    if (profile.hf_token_encrypted) {
      try {
        decryptedHfToken = decrypt(profile.hf_token_encrypted as string);
      } catch {
        // HF token decryption failure is non-fatal; proceed without it
      }
    }

    const endpointId = profile.runpod_endpoint_id as string | null;
    if (!endpointId) {
      res.status(400).json({
        error: 'RunPod endpoint not configured. Please set up your endpoint in settings.',
      });
      return;
    }

    // Build the job config
    const config = {
      model_id: body.model_id,
      training_data: body.training_data,
      eval_data: body.eval_data,
      hyperparams: body.hyperparams,
      influence_method: body.influence_method,
      checkpoint_interval: body.checkpoint_interval || 10,
    };

    // Create job record in Supabase
    const { data: job, error: insertError } = await supabaseAdmin
      .from('jobs')
      .insert({
        user_id: user.id,
        experiment_id: body.experiment_id || null,
        status: 'queued',
        progress: 0,
        config,
        compute_backend: 'runpod',
      })
      .select('id')
      .single();

    if (insertError || !job) {
      res.status(500).json({ error: `Failed to create job: ${insertError?.message}` });
      return;
    }

    const jobId = job.id as string;

    // Build the callback URL from the request origin
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const callbackUrl = `${protocol}://${host}/api/job-callback`;

    // Submit to RunPod
    try {
      const backend = new RunPodBackend({
        apiKey: decryptedKey,
        endpointId,
      });

      const submitResult = await backend.submitJob({
        job_id: jobId,
        model_id: body.model_id,
        training_data: body.training_data,
        eval_data: body.eval_data,
        hyperparams: body.hyperparams,
        influence_method: body.influence_method,
        checkpoint_interval: body.checkpoint_interval || 10,
        callback_url: callbackUrl,
        hf_token: decryptedHfToken,
      });

      // Update job with the RunPod job ID
      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'starting',
          runpod_job_id: submitResult.jobId,
        })
        .eq('id', jobId);

      res.status(200).json({ job_id: jobId, status: 'queued' });
    } catch (backendError) {
      // If backend call fails, mark the job as failed
      const errorMessage =
        backendError instanceof Error ? backendError.message : 'Failed to start training';

      await supabaseAdmin
        .from('jobs')
        .update({
          status: 'failed',
          error: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      res.status(500).json({ error: errorMessage, job_id: jobId });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
