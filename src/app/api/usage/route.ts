import { jsonOk, noStore, route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/current-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PLANS } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route('usage.get', async () => {
  const user = await requireUser();
  await enforceRateLimit('read', user.id);

  const history = await prisma.usage.findMany({
    where: { userId: user.id },
    orderBy: { periodStart: 'desc' },
    take: 6,
    select: {
      periodStart: true,
      periodEnd: true,
      analysisCount: true,
      generationCount: true,
      creditsUsed: true,
    },
  });

  return noStore(
    jsonOk({
      plan: user.plan,
      planName: PLANS[user.plan].name,
      entitlements: user.entitlements,
      history,
    }),
  );
});
