import { jsonOk, noStore, route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import { getBillingProvider, paymentsConfigured } from '@/lib/billing/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    },
  });

  return noStore(
    jsonOk({
      subscription,
      entitlements: user.entitlements,
      plans: PLAN_ORDER.map((id) => PLANS[id]),
      provider: getBillingProvider().id,
      paymentsEnabled: paymentsConfigured(),
    }),
  );
});
