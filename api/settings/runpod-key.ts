import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabase-admin.js';
import { encrypt, decrypt } from '../_lib/encryption.js';
import { RunPodBackend } from '../_lib/runpod.js';

interface PostBody {
  api_key: string;
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
      case 'DELETE':
        await handleDelete(user.id, res);
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
 * GET /api/settings/runpod-key
 * Returns the current backend status: compute_backend, last 4 chars of key if set, endpoint_id.
 */
async function handleGet(userId: string, res: VercelResponse): Promise<void> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('runpod_api_key_encrypted, runpod_endpoint_id, hf_token_encrypted')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  let keyLastFour: string | null = null;
  if (profile.runpod_api_key_encrypted) {
    try {
      const decryptedKey = decrypt(profile.runpod_api_key_encrypted as string);
      keyLastFour = decryptedKey.slice(-4);
    } catch {
      // Key could not be decrypted; treat as not set
      keyLastFour = null;
    }
  }

  let hfTokenLastFour: string | null = null;
  if (profile.hf_token_encrypted) {
    try {
      const decryptedToken = decrypt(profile.hf_token_encrypted as string);
      hfTokenLastFour = decryptedToken.slice(-4);
    } catch {
      hfTokenLastFour = null;
    }
  }

  res.status(200).json({
    runpod_key_last4: keyLastFour,
    runpod_endpoint_id: profile.runpod_endpoint_id || null,
    hf_token_last4: hfTokenLastFour,
  });
}

/**
 * POST /api/settings/runpod-key
 * Validate a RunPod API key, encrypt and store it, and optionally create an endpoint.
 */
async function handlePost(
  userId: string,
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const body = req.body as PostBody;

  if (!body.api_key || typeof body.api_key !== 'string' || body.api_key.trim().length === 0) {
    res.status(400).json({ error: 'api_key is required' });
    return;
  }

  const apiKey = body.api_key.trim();

  // Validate the API key by calling RunPod
  try {
    await RunPodBackend.validateApiKey(apiKey);
  } catch (validationError) {
    const message =
      validationError instanceof Error ? validationError.message : 'Invalid RunPod API key';
    res.status(400).json({ error: message });
    return;
  }

  // Encrypt the API key
  const encryptedKey = encrypt(apiKey);

  // Check if user already has an endpoint, otherwise create one
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('runpod_endpoint_id')
    .eq('id', userId)
    .single();

  if (fetchError || !profile) {
    res.status(500).json({ error: 'Failed to fetch profile' });
    return;
  }

  let endpointId = profile.runpod_endpoint_id as string | null;

  // If the hosted endpoint is configured via env var, use that instead of creating a new one
  const hostedEndpointId = process.env.RUNPOD_HOSTED_ENDPOINT_ID;
  if (!endpointId && hostedEndpointId) {
    endpointId = hostedEndpointId;
  }

  // If no endpoint exists and a template ID is configured, create one
  if (!endpointId) {
    const templateId = process.env.RUNPOD_TEMPLATE_ID;
    if (templateId) {
      try {
        endpointId = await RunPodBackend.createEndpoint(apiKey, templateId);
      } catch (endpointError) {
        const message =
          endpointError instanceof Error
            ? endpointError.message
            : 'Failed to create RunPod endpoint';
        res.status(500).json({ error: message });
        return;
      }
    }
  }

  // Update the user's profile
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      compute_backend: 'runpod',
      runpod_api_key_encrypted: encryptedKey,
      runpod_endpoint_id: endpointId,
    })
    .eq('id', userId);

  if (updateError) {
    res.status(500).json({ error: `Failed to update profile: ${updateError.message}` });
    return;
  }

  res.status(200).json({
    runpod_key_last4: apiKey.slice(-4),
    runpod_endpoint_id: endpointId,
  });
}

/**
 * DELETE /api/settings/runpod-key
 * Remove the RunPod API key and endpoint configuration.
 */
async function handleDelete(userId: string, res: VercelResponse): Promise<void> {
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      runpod_api_key_encrypted: null,
      runpod_endpoint_id: null,
    })
    .eq('id', userId);

  if (updateError) {
    res.status(500).json({ error: `Failed to update profile: ${updateError.message}` });
    return;
  }

  res.status(200).json({
    runpod_key_last4: null,
    runpod_endpoint_id: null,
  });
}
