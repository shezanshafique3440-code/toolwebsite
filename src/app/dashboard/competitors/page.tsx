import type { Metadata } from 'next';
import { PageHeader } from '@/components/dashboard/topbar';
import { CompetitorTool } from '@/components/dashboard/tools/competitor-tool';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PLANS, planFeatureAllowed } from '@/lib/plans';
import { getCompetitorDataProvider } from '@/lib/data-providers';

export const metadata: Metadata = { title: 'Competitor Analysis' };

export default async function CompetitorsPage({
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
  const allowed = planFeatureAllowed(user.plan, 'competitorAnalysis');
  const source = getCompetitorDataProvider().status();

  return (
    <>
      <PageHeader
        title="Competitor Analysis"
        description="Positioning, offers, angles and calls to action side by side — plus where the gaps are."
      />

      {!source.available && (
        <p className="rounded-card bg-surface px-4 py-3 text-xs leading-relaxed text-fg-muted hairline">
          <span className="font-medium text-fg">Live data unavailable.</span> {source.reason}
        </p>
      )}

      <CompetitorTool
        products={products}
        defaultProductId={selected?.id}
        defaultName={selected?.name ?? params.name}
        locked={
          allowed
            ? undefined
            : {
                reason: `Competitor analysis is not included in the ${PLANS[user.plan].name} plan. Upgrade to compare competitors side by side.`,
              }
        }
      />
    </>
  );
}
