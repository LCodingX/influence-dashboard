import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_lib/auth';
import { supabaseAdmin } from './_lib/supabase-admin';

interface ExperimentBody {
  id?: string;
  name: string;
  description?: string | null;
  training_data: Array<{ id: string; question: string; answer: string }>;
  eval_data: Array<{ id: string; question: string }>;
  model_id: string;
  hyperparams: Record<string, unknown>;
  influence_method: string;
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

  try {
    // Verify authentication for all methods
    const user = await verifyAuth(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    switch (req.method) {
      case 'GET':
        await handleGet(user.id, res);
        break;
      case 'POST':
        await handlePost(user.id, req, res);
        break;
      case 'PUT':
        await handlePut(user.id, req, res);
        break;
      case 'DELETE':
        await handleDelete(user.id, req, res);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

/**
 * GET /api/experiments - List all experiments for the authenticated user
 */
async function handleGet(userId: string, res: VercelResponse): Promise<void> {
  const { data: experiments, error } = await supabaseAdmin
    .from('experiments')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: `Failed to fetch experiments: ${error.message}` });
    return;
  }

  res.status(200).json({ experiments });
}

/**
 * POST /api/experiments - Create a new experiment
 */
async function handlePost(
  userId: string,
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const body = req.body as ExperimentBody;

  // Validate required fields
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!body.training_data || !Array.isArray(body.training_data)) {
    res.status(400).json({ error: 'training_data is required and must be an array' });
    return;
  }
  if (!body.eval_data || !Array.isArray(body.eval_data)) {
    res.status(400).json({ error: 'eval_data is required and must be an array' });
    return;
  }
  if (!body.model_id) {
    res.status(400).json({ error: 'model_id is required' });
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

  const { data: experiment, error } = await supabaseAdmin
    .from('experiments')
    .insert({
      user_id: userId,
      name: body.name.trim(),
      description: body.description || null,
      training_data: body.training_data,
      eval_data: body.eval_data,
      model_id: body.model_id,
      hyperparams: body.hyperparams,
      influence_method: body.influence_method,
    })
    .select('*')
    .single();

  if (error || !experiment) {
    res.status(500).json({ error: `Failed to create experiment: ${error?.message}` });
    return;
  }

  res.status(201).json({ experiment });
}

/**
 * PUT /api/experiments - Update an existing experiment
 */
async function handlePut(
  userId: string,
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const body = req.body as ExperimentBody;

  if (!body.id) {
    res.status(400).json({ error: 'id is required in request body' });
    return;
  }

  // Verify ownership by including user_id in the query
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('experiments')
    .select('id')
    .eq('id', body.id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: 'Experiment not found' });
    return;
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.description !== undefined) updateData.description = body.description;
  if (body.training_data !== undefined) updateData.training_data = body.training_data;
  if (body.eval_data !== undefined) updateData.eval_data = body.eval_data;
  if (body.model_id !== undefined) updateData.model_id = body.model_id;
  if (body.hyperparams !== undefined) updateData.hyperparams = body.hyperparams;
  if (body.influence_method !== undefined) updateData.influence_method = body.influence_method;

  const { data: experiment, error: updateError } = await supabaseAdmin
    .from('experiments')
    .update(updateData)
    .eq('id', body.id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (updateError || !experiment) {
    res.status(500).json({ error: `Failed to update experiment: ${updateError?.message}` });
    return;
  }

  res.status(200).json({ experiment });
}

/**
 * DELETE /api/experiments?id=X - Delete an experiment
 */
async function handleDelete(
  userId: string,
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const experimentId = req.query.id as string | undefined;

  if (!experimentId) {
    res.status(400).json({ error: 'id query parameter is required' });
    return;
  }

  // Delete with ownership check in the query
  const { error, count } = await supabaseAdmin
    .from('experiments')
    .delete({ count: 'exact' })
    .eq('id', experimentId)
    .eq('user_id', userId);

  if (error) {
    res.status(500).json({ error: `Failed to delete experiment: ${error.message}` });
    return;
  }

  if (count === 0) {
    res.status(404).json({ error: 'Experiment not found' });
    return;
  }

  res.status(200).json({ success: true });
}
