import { jsonOk, noStore, route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import { paddlePublicConfig } from '@/lib/billing/paddle/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Billing state for the current user.
 *
 * Everything here is read from the database, which is only ever written by a
 * verified Paddle webhook or an audited admin grant. Nothing the browser sends
 * can influence it.
 */
export const GET = route('billing.get', async () => {
  const user = await requireUser();
  await enforceRateLimit('read', user.id);

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: {
      plan: true,
      status: true,
      interval: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      provider: true,
      providerStatus: true,
      priceId: true,
      pausedAt: true,
      endedAt: true,
      updatedAt: true,
    },
  });

  const paddle = paddlePublicConfig();

  return noStore(
    jsonOk({
      subscription,
      entitlements: user.entitlements,
      plans: PLAN_ORDER.map((id) => PLANS[id]),
      // Public, non-secret: the browser needs it to open Paddle's checkout.
      billing: {
        provider: 'paddle',
        configured: paddle.configured,
        environment: paddle.environment,
        managedExternally: subscription?.provider === 'paddle',
        manualGrant: subscription?.provider === 'manual',
      },
    }),
  );
});
