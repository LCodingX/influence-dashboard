import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.RUNPOD_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('RUNPOD_KEY_ENCRYPTION_SECRET environment variable is not set');
  }
  // Expect a 32-byte hex-encoded key (64 hex chars)
  if (secret.length === 64) {
    return Buffer.from(secret, 'hex');
  }
  // Fallback: use raw bytes (must be exactly 32 bytes)
  const keyBuffer = Buffer.from(secret, 'utf-8');
  if (keyBuffer.length !== 32) {
    throw new Error(
      'RUNPOD_KEY_ENCRYPTION_SECRET must be either a 64-character hex string or a 32-byte UTF-8 string'
    );
  }
  return keyBuffer;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64(iv + ciphertext + authTag).
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Concatenate: iv (12 bytes) + ciphertext (variable) + authTag (16 bytes)
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString('base64');
}

/**
 * Decrypt a base64-encoded string produced by encrypt().
 * Expects base64(iv + ciphertext + authTag).
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, 'base64');

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data: too short');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf-8');
}
