import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { Role } from '@prisma/client';

export const SESSION_COOKIE = 'pp_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionClaims = {
  sub: string;
  email: string;
  role: Role;
  /** Session version — bumped server-side to invalidate every issued token. */
  sv: number;
};

let cachedKey: Uint8Array | null = null;

function secretKey() {
  if (cachedKey) return cachedKey;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is missing or shorter than 32 characters.');
  }
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

export async function createSessionToken(claims: SessionClaims) {
  return new SignJWT({ email: claims.email, role: claims.role, sv: claims.sv })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer('productpilot')
    .setAudience('productpilot-web')
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: 'productpilot',
      audience: 'productpilot-web',
      algorithms: ['HS256'],
    });
    return toClaims(payload);
  } catch {
    return null;
  }
}

function toClaims(payload: JWTPayload): SessionClaims | null {
  const { sub, email, role, sv } = payload as JWTPayload & {
    email?: unknown;
    role?: unknown;
    sv?: unknown;
  };
  if (typeof sub !== 'string' || typeof email !== 'string') return null;
  if (role !== 'USER' && role !== 'ADMIN') return null;
  if (typeof sv !== 'number') return null;
  return { sub, email, role, sv };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
