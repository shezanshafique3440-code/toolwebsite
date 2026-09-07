import { z } from 'zod';
import { jsonOk, parseJsonBody, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getBillingProvider } from '@/lib/billing/service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const checkoutSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'BUSINESS']),
  interval: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
});

/**
 * Plan changes go through the billing provider abstraction. The bundled internal
 * provider applies the change directly and takes no payment — the UI states this
 * plainly. Swapping in a payment provider requires no changes here.
 */
export const POST = route('billing.checkout', async (request) => {
  const user = await requireUser();
  await enforceRateLimit('write', user.id);
  const input = await parseJsonBody(request, checkoutSchema);

  const provider = getBillingProvider();
  const result = await provider.createCheckout({
    userId: user.id,
    plan: input.plan,
    interval: input.interval,
  });

  await logger.info({
    event: 'billing.plan_changed',
    message: `Plan set to ${input.plan} (${input.interval})`,
    userId: user.id,
    context: { provider: provider.id },
  });

  return jsonOk(result);
});
