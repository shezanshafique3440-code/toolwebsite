import { jsonOk, noStore, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { createPortalSession } from '@/lib/billing/paddle/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns short-lived Paddle customer portal links so the customer can manage
 * billing details, payment methods, invoices and cancellation inside Paddle.
 */
export const POST = route('billing.portal', async () => {
  const user = await requireUser();
  await enforceRateLimit('write', `portal:${user.id}`);
  return noStore(jsonOk(await createPortalSession(user.id)));
});
