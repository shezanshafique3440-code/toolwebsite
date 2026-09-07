import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Opaque, URL-safe token; only its SHA-256 digest is ever stored. */
export function generateToken() {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

export function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60; // 1 hour
export const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
