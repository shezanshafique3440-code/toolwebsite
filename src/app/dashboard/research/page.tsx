import type { Metadata } from 'next';
import Link from 'next/link';
import { History } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/topbar';
import { ResearchForm } from '@/components/dashboard/research-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { formatRelativeTime } from '@/lib/utils';
import { dataSourceStatuses } from '@/lib/data-providers';

export const metadata: Metadata = { title: 'Product Research' };

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const user = await requireUser();
  const { productId } = await searchParams;

  const [recent, existing] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, category: true, createdAt: true },
    }),
    productId
      ? prisma.product.findFirst({
          where: { id: productId, userId: user.id },
          select: { id: true, name: true, url: true, category: true, notes: true },
        })
      : null,
  ]);

  const sources = dataSourceStatuses();

  return (
    <>
      <PageHeader
        title={existing ? `Re-analyse ${existing.name}` : 'Product Research'}
        description="Enter a product and get a structured assessment: demand, competition, profitability, viral potential and a verdict — with the reasoning behind every score."
      />

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <ResearchForm
          analysesRemaining={user.entitlements.analysesRemaining}
          defaults={
            existing
              ? {
                  productId: existing.id,
                  name: existing.name,
                  url: existing.url ?? undefined,
                  category: existing.category ?? undefined,
                  notes: existing.notes ?? undefined,
                }
              : undefined
          }
        />

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>What you&apos;ll get</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm text-fg-muted">
                {[
                  'Overall score out of 100, plus demand, competition, profit and viral sub-scores',
                  'Product overview, target audience and the pain point it solves',
                  'Estimated sourcing price, recommended retail price and margin',
                  'Market saturation, seasonality and a directional trend read',
                  'Full SWOT and recommended marketing channels with a first step',
                  'A verdict that explains itself',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sources.map((source) => (
                <div key={source.id + source.label} className="text-sm">
                  <p className="flex items-center gap-2 font-medium text-fg">
                    {source.label}
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-normal text-fg-subtle">
                      {source.available ? 'Connected' : 'Live data unavailable'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{source.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {recent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="size-4 text-fg-subtle" aria-hidden />
                  Recent products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-line">
                  {recent.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="flex flex-col py-2.5 transition-colors hover:opacity-80"
                      >
                        <span className="truncate text-sm font-medium text-fg">{product.name}</span>
                        <span className="text-xs text-fg-muted">
                          {product.category ?? 'Uncategorised'} · {formatRelativeTime(product.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
