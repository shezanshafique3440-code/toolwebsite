import { jsonOk, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { cancelSubscriptionAtPeriodEnd } from '@/lib/billing/paddle/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Requests cancellation through Paddle. The local plan is not changed here —
 * Paddle confirms it by webhook, and access continues until the paid period
 * ends.
 */
export const POST = route('billing.cancel', async () => {
  const user = await requireUser();
  await enforceRateLimit('write', `cancel:${user.id}`);
  await cancelSubscriptionAtPeriodEnd(user.id);

  return jsonOk({
    message:
      'Cancellation requested. You keep full access until the end of your current billing period, and we will confirm once Paddle has processed it.',
  });
});
