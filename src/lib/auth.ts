// Password utilities using Web Crypto API (SHA-256)
// Runs entirely in the browser — no server or bcrypt needed

/**
 * Hash a plaintext password using SHA-256.
 * Returns a lowercase hex string (64 chars).
 */
export async function hashPassword(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a plaintext password against a stored SHA-256 hex hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(plain);
  return computed === hash;
}
