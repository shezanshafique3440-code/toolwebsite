import type { Metadata } from 'next';
import { PageHeader } from '@/components/dashboard/topbar';
import { ListingTool } from '@/components/dashboard/tools/listing-tool';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PLANS, planFeatureAllowed } from '@/lib/plans';

export const metadata: Metadata = { title: 'Listing Generator' };

export default async function ListingsPage({
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
  const allowed = planFeatureAllowed(user.plan, 'listing');

  return (
    <>
      <PageHeader
        title="Listing Generator"
        description="A complete, conversion-focused product listing with meta tags and image alt text — every section copyable on its own."
      />
      <ListingTool
        products={products}
        defaultProductId={selected?.id}
        defaultName={selected?.name ?? params.name}
        locked={
          allowed
            ? undefined
            : {
                reason: `The listing generator is not included in the ${PLANS[user.plan].name} plan. Upgrade to generate full listings with FAQ, meta tags and alt text.`,
              }
        }
      />
    </>
  );
}
