import { z } from 'zod';
import { jsonOk, parseJsonBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { createCheckoutIntent } from '@/lib/billing/paddle/checkout';
import { AppError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Only paid plans can be checked out. Downgrading to Free is a cancellation,
// which goes through Paddle so the paid period is honoured.
const checkoutSchema = z.object({
  plan: z.enum(['PRO', 'BUSINESS']),
});

/**
 * Opens a Paddle checkout.
 *
 * This endpoint grants nothing. It creates a Paddle transaction and returns the
 * identifiers the browser needs to open Paddle's hosted checkout. The user's
 * plan changes only when Paddle sends a signature-verified webhook confirming
 * the subscription is active.
 */
export const POST = route('billing.checkout', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('write', `checkout:${user.id}`);
  const input = await parseJsonBody(request, checkoutSchema);

  if (user.plan === input.plan && user.entitlements.active) {
    throw new AppError('CONFLICT', `You are already on the ${input.plan === 'PRO' ? 'Pro' : 'Business'} plan.`);
  }

  const intent = await createCheckoutIntent(
    { id: user.id, email: user.email, name: user.name },
    input.plan,
  );

  return jsonOk(intent);
});
