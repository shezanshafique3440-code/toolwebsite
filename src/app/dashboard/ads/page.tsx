import type { Metadata } from 'next';
import { PageHeader } from '@/components/dashboard/topbar';
import { AdTool } from '@/components/dashboard/tools/ad-tool';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PLANS, planFeatureAllowed } from '@/lib/plans';

export const metadata: Metadata = { title: 'Ad Generator' };

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string; name?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const products = await prisma.product.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, name: true },
  });

  const selected = params.productId ? products.find((product) => product.id === params.productId) : undefined;
  const allowed = planFeatureAllowed(user.plan, 'ads');

  return (
    <>
      <PageHeader
        title="Ad Generator"
        description="Platform-native ad copy for Facebook, Instagram, TikTok and Google — multiple angles, each with short and long versions."
      />
      <AdTool
        products={products}
        defaultProductId={selected?.id}
        defaultName={selected?.name ?? params.name}
        locked={
          allowed
            ? undefined
            : {
                reason: `The ad generator is not included in the ${PLANS[user.plan].name} plan. Upgrade to generate copy for all four platforms.`,
              }
        }
      />
    </>
  );
}
