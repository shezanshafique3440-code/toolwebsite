import 'server-only';
import { Environment, Paddle } from '@paddle/paddle-node-sdk';
import { AppError } from '@/lib/errors';
import { resolvePaddleConfig, type PaddleConfig } from '@/lib/billing/paddle/config';

let cached: { apiKey: string; environment: string; client: Paddle } | null = null;

/**
 * Lazily constructs the Paddle API client. Throws a user-safe error when the
 * integration is not configured, so a misconfigured deployment surfaces as
 * "billing unavailable" rather than as a stack trace or a free upgrade.
 */
export function getPaddleClient(): { paddle: Paddle; config: PaddleConfig } {
  const resolved = resolvePaddleConfig();

  if ('problems' in resolved) {
    throw new AppError('BILLING_UNAVAILABLE', 'Payments are not available right now. Please try again later.', {
      details: { missing: resolved.problems.map((problem) => problem.key) },
    });
  }

  const { config } = resolved;

  if (!cached || cached.apiKey !== config.apiKey || cached.environment !== config.environment) {
    cached = {
      apiKey: config.apiKey,
      environment: config.environment,
      client: new Paddle(config.apiKey, {
        environment: config.environment === 'production' ? Environment.production : Environment.sandbox,
      }),
    };
  }

  return { paddle: cached.client, config };
}
