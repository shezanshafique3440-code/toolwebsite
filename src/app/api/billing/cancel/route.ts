import { jsonOk, route } from '@/lib/api';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getBillingProvider } from '@/lib/billing/service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = route('billing.cancel', async () => {
  const user = await requireUser();
  await enforceRateLimit('write', user.id);
  await getBillingProvider().cancel({ userId: user.id });
  await logger.info({
    event: 'billing.cancel_requested',
    message: 'Subscription set to cancel at period end',
    userId: user.id,
  });
  return jsonOk({ message: 'Your plan will move to Free at the end of the current period.' });
});
