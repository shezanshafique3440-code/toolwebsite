import type { Metadata } from 'next';
import { PageHeader } from '@/components/dashboard/topbar';
import { AudienceTool } from '@/components/dashboard/tools/audience-tool';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PLANS, planFeatureAllowed } from '@/lib/plans';

export const metadata: Metadata = { title: 'Audience Builder' };

export default async function AudiencePage({
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
  const allowed = planFeatureAllowed(user.plan, 'audience');

  return (
    <>
      <PageHeader
        title="Audience Builder"
        description="Age, interests, motivations and objections — distilled into a persona card that shows up on the product report."
      />
      <AudienceTool
        products={products}
        defaultProductId={selected?.id}
        defaultName={selected?.name ?? params.name}
        locked={
          allowed
            ? undefined
            : {
                reason: `The audience builder is not included in the ${PLANS[user.plan].name} plan. Upgrade to generate full personas.`,
              }
        }
      />
    </>
  );
}
