import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabase-admin.js';
import { encrypt, decrypt } from '../_lib/encryption.js';

interface PostBody {
  token: string;
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
 * GET /api/settings/hf-token
 * Returns the last 4 characters of the stored HuggingFace token, if any.
 */
async function handleGet(userId: string, res: VercelResponse): Promise<void> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
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

  res.status(200).json({ hf_token_last4: hfTokenLastFour });
}

/**
 * POST /api/settings/hf-token
 * Validate a HuggingFace token, encrypt and store it.
 */
async function handlePost(
  userId: string,
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const body = req.body as PostBody;

  if (!body.token || typeof body.token !== 'string' || body.token.trim().length === 0) {
    res.status(400).json({ error: 'token is required' });
    return;
  }

  const token = body.token.trim();

  // Validate the token by calling HuggingFace API
  try {
    const response = await fetch('https://huggingface.co/api/whoami', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        res.status(400).json({ error: 'Invalid HuggingFace token' });
        return;
      }
      res.status(400).json({ error: `HuggingFace API returned status ${response.status}` });
      return;
    }
  } catch (validationError) {
    const message =
      validationError instanceof Error ? validationError.message : 'Failed to validate HuggingFace token';
    res.status(400).json({ error: message });
    return;
  }

  // Encrypt and store
  const encryptedToken = encrypt(token);

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ hf_token_encrypted: encryptedToken })
    .eq('id', userId);

  if (updateError) {
    res.status(500).json({ error: `Failed to update profile: ${updateError.message}` });
    return;
  }

  res.status(200).json({ hf_token_last4: token.slice(-4) });
}

/**
 * DELETE /api/settings/hf-token
 * Remove the stored HuggingFace token.
 */
async function handleDelete(userId: string, res: VercelResponse): Promise<void> {
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ hf_token_encrypted: null })
    .eq('id', userId);

  if (updateError) {
    res.status(500).json({ error: `Failed to update profile: ${updateError.message}` });
    return;
  }

  res.status(200).json({ hf_token_last4: null });
}
