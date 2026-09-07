import 'server-only';
import type { Plan } from '@prisma/client';

/**
 * Paddle configuration, resolved from the environment on the server only.
 *
 * `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET` are never imported by client
 * code — this module carries the `server-only` marker so a client import fails
 * the build rather than leaking a secret into the browser bundle.
 */
export type PaddleEnvironment = 'sandbox' | 'production';

export type PaddleConfig = {
  apiKey: string;
  webhookSecret: string;
  environment: PaddleEnvironment;
  /** Safe to send to the browser: Paddle.js needs it to open the checkout. */
  clientToken: string;
  priceIds: { PRO: string; BUSINESS: string };
};

export type PaddleConfigProblem = { key: string; message: string };

function readEnvironment(): PaddleEnvironment {
  return process.env.PADDLE_ENVIRONMENT?.trim().toLowerCase() === 'production' ? 'production' : 'sandbox';
}

/**
 * Returns the config, or the list of what is missing. Billing is simply
 * unavailable when Paddle is not configured — the app never falls back to
 * granting a paid plan without payment.
 */
export function resolvePaddleConfig(): { config: PaddleConfig } | { problems: PaddleConfigProblem[] } {
  const required = {
    PADDLE_API_KEY: process.env.PADDLE_API_KEY?.trim(),
    PADDLE_CLIENT_TOKEN: process.env.PADDLE_CLIENT_TOKEN?.trim(),
    PADDLE_WEBHOOK_SECRET: process.env.PADDLE_WEBHOOK_SECRET?.trim(),
    PADDLE_PRO_PRICE_ID: process.env.PADDLE_PRO_PRICE_ID?.trim(),
    PADDLE_BUSINESS_PRICE_ID: process.env.PADDLE_BUSINESS_PRICE_ID?.trim(),
  };

  const problems: PaddleConfigProblem[] = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => ({ key, message: `${key} is not set` }));

  if (problems.length > 0) return { problems };

  return {
    config: {
      apiKey: required.PADDLE_API_KEY as string,
      clientToken: required.PADDLE_CLIENT_TOKEN as string,
      webhookSecret: required.PADDLE_WEBHOOK_SECRET as string,
      environment: readEnvironment(),
      priceIds: {
        PRO: required.PADDLE_PRO_PRICE_ID as string,
        BUSINESS: required.PADDLE_BUSINESS_PRICE_ID as string,
      },
    },
  };
}

export function isPaddleConfigured() {
  return 'config' in resolvePaddleConfig();
}

/** Public, non-secret configuration the billing page needs. */
export function paddlePublicConfig() {
  const resolved = resolvePaddleConfig();
  if ('problems' in resolved) return { configured: false as const, environment: readEnvironment() };
  return {
    configured: true as const,
    environment: resolved.config.environment,
    clientToken: resolved.config.clientToken,
    priceIds: resolved.config.priceIds,
  };
}

/** Maps a paid plan to its configured Paddle price id. */
export function priceIdForPlan(config: PaddleConfig, plan: Exclude<Plan, 'FREE'>) {
  return config.priceIds[plan];
}

/** Reverse lookup used when a webhook reports which price is being billed. */
export function planForPriceId(config: PaddleConfig, priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === config.priceIds.PRO) return 'PRO';
  if (priceId === config.priceIds.BUSINESS) return 'BUSINESS';
  return null;
}
