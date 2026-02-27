import type { VercelRequest } from '@vercel/node';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-admin.js';

/**
 * Verify the Supabase JWT from the Authorization header.
 * Returns the authenticated user or null if invalid/missing.
 */
export async function verifyAuth(req: VercelRequest): Promise<User | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}
