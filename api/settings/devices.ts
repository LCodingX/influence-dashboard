import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabase-admin.js';
import { decrypt } from '../_lib/encryption.js';
import { RunPodBackend } from '../_lib/runpod.js';

const GPU_DISPLAY_MAP: Record<string, string> = {
  AMPERE_16: 'A10 24GB',
  AMPERE_48: 'L40S 48GB',
  AMPERE_80: 'A100 80GB',
};

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
 * GET /api/settings/devices — list user's devices
 */
async function handleGet(userId: string, res: VercelResponse): Promise<void> {
  const { data: devices, error } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    res.status(500).json({ error: `Failed to fetch devices: ${error.message}` });
    return;
  }

  res.status(200).json(devices ?? []);
}

/**
 * POST /api/settings/devices — create a new device
 * Body: { name: string, gpu_id: string }
 */
async function handlePost(
  userId: string,
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const body = req.body as { name?: string; gpu_id?: string };

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  if (!body.gpu_id || !(body.gpu_id in GPU_DISPLAY_MAP)) {
    res.status(400).json({ error: 'gpu_id must be one of: AMPERE_16, AMPERE_48, AMPERE_80' });
    return;
  }

  // Get user's RunPod API key
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('runpod_api_key_encrypted')
    .eq('id', userId)
    .single();

  if (profileError || !profile?.runpod_api_key_encrypted) {
    res.status(400).json({ error: 'RunPod API key not configured. Please set up your key first.' });
    return;
  }

  let apiKey: string;
  try {
    apiKey = decrypt(profile.runpod_api_key_encrypted as string);
  } catch {
    res.status(500).json({ error: 'Failed to decrypt RunPod API key.' });
    return;
  }

  const templateId = process.env.RUNPOD_TEMPLATE_ID;
  if (!templateId) {
    res.status(500).json({ error: 'RunPod template not configured on server.' });
    return;
  }

  // Create the endpoint on RunPod
  let endpointId: string;
  try {
    endpointId = await RunPodBackend.createEndpoint(apiKey, templateId, {
      name: `influence-${body.name.trim().toLowerCase().replace(/\s+/g, '-')}`,
      gpuIds: body.gpu_id,
    });
  } catch (endpointError) {
    const message = endpointError instanceof Error ? endpointError.message : 'Failed to create endpoint';
    res.status(500).json({ error: message });
    return;
  }

  // Check if user has any existing devices (for is_default)
  const { count } = await supabaseAdmin
    .from('devices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const isFirst = (count ?? 0) === 0;

  // Insert device row
  const { data: device, error: insertError } = await supabaseAdmin
    .from('devices')
    .insert({
      user_id: userId,
      name: body.name.trim(),
      endpoint_id: endpointId,
      gpu_id: body.gpu_id,
      gpu_display: GPU_DISPLAY_MAP[body.gpu_id],
      is_default: isFirst,
    })
    .select('*')
    .single();

  if (insertError || !device) {
    res.status(500).json({ error: `Failed to create device: ${insertError?.message}` });
    return;
  }

  res.status(200).json(device);
}

/**
 * PUT /api/settings/devices — update a device
 * Body: { id: string, name?: string, is_default?: boolean }
 */
async function handlePut(
  userId: string,
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const body = req.body as { id?: string; name?: string; is_default?: boolean };

  if (!body.id) {
    res.status(400).json({ error: 'id is required' });
    return;
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('devices')
    .select('id')
    .eq('id', body.id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();

  // If setting as default, clear old default first
  if (body.is_default === true) {
    await supabaseAdmin
      .from('devices')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);
    updates.is_default = true;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updates provided' });
    return;
  }

  const { data: device, error: updateError } = await supabaseAdmin
    .from('devices')
    .update(updates)
    .eq('id', body.id)
    .select('*')
    .single();

  if (updateError || !device) {
    res.status(500).json({ error: `Failed to update device: ${updateError?.message}` });
    return;
  }

  res.status(200).json(device);
}

/**
 * DELETE /api/settings/devices?id=X — delete a device
 */
async function handleDelete(
  userId: string,
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const deviceId = req.query.id as string | undefined;
  if (!deviceId) {
    res.status(400).json({ error: 'id query parameter is required' });
    return;
  }

  // Verify ownership and get device details
  const { data: device, error: fetchError } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('id', deviceId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !device) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }

  // Check for active jobs on this device
  const { count: activeJobs } = await supabaseAdmin
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', deviceId)
    .not('status', 'in', '("completed","failed")');

  if ((activeJobs ?? 0) > 0) {
    res.status(400).json({ error: 'Cannot delete device with active jobs' });
    return;
  }

  // Delete the device
  const { error: deleteError } = await supabaseAdmin
    .from('devices')
    .delete()
    .eq('id', deviceId);

  if (deleteError) {
    res.status(500).json({ error: `Failed to delete device: ${deleteError.message}` });
    return;
  }

  // If deleted device was default, promote the next one
  if (device.is_default) {
    const { data: nextDevice } = await supabaseAdmin
      .from('devices')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (nextDevice) {
      await supabaseAdmin
        .from('devices')
        .update({ is_default: true })
        .eq('id', nextDevice.id);
    }
  }

  res.status(200).json({ success: true });
}
