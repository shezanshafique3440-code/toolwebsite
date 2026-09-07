import type { Metadata } from 'next';
import { PageHeader } from '@/components/dashboard/topbar';
import { KeywordTool } from '@/components/dashboard/tools/keyword-tool';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'SEO Keywords' };

export default async function KeywordsPage({
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

  return (
    <>
      <PageHeader
        title="SEO Keywords"
        description="Primary, secondary, long-tail, buyer-intent, problem and question keywords — with a suggested product title."
      />
      <KeywordTool
        products={products}
        defaultProductId={selected?.id}
        defaultName={selected?.name ?? params.name}
      />
    </>
  );
}
