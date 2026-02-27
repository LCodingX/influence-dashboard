import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase-admin.js';

interface CallbackBody {
  job_id: string;
  status: string;
  results?: {
    eval_results: Array<{
      eval_question: string;
      base_output: string;
      fewshot_output: string;
      finetuned_output: string;
    }>;
    influence: {
      training_labels: string[];
      eval_labels: string[];
      scores: number[][];
    };
    training_metadata: {
      total_training_time_seconds: number;
      total_influence_time_seconds: number;
      peak_gpu_memory_gb: number;
      final_training_loss: number;
      loss_history: number[];
    };
  };
  error?: string;
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
    // Verify webhook secret (not user auth — this is called by the compute backend)
    const webhookSecret = process.env.MODAL_WEBHOOK_SECRET;
    const providedSecret = req.headers['x-webhook-secret'] as string | undefined;

    if (!webhookSecret) {
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    if (!providedSecret || providedSecret !== webhookSecret) {
      res.status(403).json({ error: 'Invalid webhook secret' });
      return;
    }

    const body = req.body as CallbackBody;

    // Validate required fields
    if (!body.job_id) {
      res.status(400).json({ error: 'job_id is required' });
      return;
    }
    if (!body.status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: body.status,
    };

    if (body.results) {
      updateData.results = body.results;
      updateData.training_metadata = body.results.training_metadata;
    }

    if (body.error) {
      updateData.error = body.error;
    }

    // Set completed_at for terminal states
    if (body.status === 'completed' || body.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    // If results include training metadata, extract progress fields
    if (body.results?.training_metadata) {
      updateData.training_loss = body.results.training_metadata.final_training_loss;
      updateData.progress = 1.0;
    }

    // Update the job record
    const { error: updateError } = await supabaseAdmin
      .from('jobs')
      .update(updateData)
      .eq('id', body.job_id);

    if (updateError) {
      res.status(500).json({ error: `Failed to update job: ${updateError.message}` });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
