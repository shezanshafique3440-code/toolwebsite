import 'server-only';
import { AppError } from '@/lib/errors';

type Bucket = { count: number; resetAt: number };

/**
 * Rate limiter interface. The default implementation is an in-process fixed
 * window, which is correct for a single node and for development. A Redis-backed
 * implementation can be substituted without touching call sites.
 */
export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    this.sweep(now);

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt };
    }

    bucket.count += 1;
    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }

  private sweep(now: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

const globalForLimiter = globalThis as unknown as { rateLimiter?: RateLimiter };
export const rateLimiter: RateLimiter = globalForLimiter.rateLimiter ?? new MemoryRateLimiter();
if (process.env.NODE_ENV !== 'production') globalForLimiter.rateLimiter = rateLimiter;

/** Named policies so limits live in one place. */
export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  ai: { limit: 20, windowMs: 60_000 },
  aiHeavy: { limit: 8, windowMs: 60_000 },
  read: { limit: 240, windowMs: 60_000 },
  write: { limit: 60, windowMs: 60_000 },
} as const;

export type RateLimitPolicy = keyof typeof RATE_LIMITS;

export async function enforceRateLimit(policy: RateLimitPolicy, identifier: string) {
  const { limit, windowMs } = RATE_LIMITS[policy];
  const result = await rateLimiter.check(`${policy}:${identifier}`, limit, windowMs);
  if (!result.allowed) {
    const seconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    throw new AppError(
      'RATE_LIMITED',
      `Too many requests. Please try again in ${seconds < 60 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`}.`,
      { details: { retryAfterSeconds: seconds } },
    );
  }
  return result;
}

/** Best-effort client IP for anonymous rate limiting. */
export function clientIp(request: Request) {
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return headers.get('x-real-ip') ?? headers.get('cf-connecting-ip') ?? 'unknown';
}
