import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Bookmark, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/topbar';
import { ProductFilters } from '@/components/dashboard/product-filters';
import { ProductCard } from '@/components/dashboard/product-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { requireUser } from '@/lib/auth/current-user';
import { listProducts } from '@/lib/services/products';
import { listProductsSchema } from '@/lib/validation/tools';

export const metadata: Metadata = { title: 'Saved Products' };

export default async function SavedProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const raw = await searchParams;

  const parsed = listProductsSchema.safeParse({
    q: typeof raw.q === 'string' ? raw.q : undefined,
    sort: typeof raw.sort === 'string' ? raw.sort : undefined,
    filter: typeof raw.filter === 'string' ? raw.filter : undefined,
    page: typeof raw.page === 'string' ? raw.page : undefined,
  });

  // Invalid query strings fall back to defaults rather than erroring the page.
  const query = parsed.success ? parsed.data : listProductsSchema.parse({});
  const result = await listProducts(user.id, query);
  const isFiltered = Boolean(query.q) || query.filter !== 'all';

  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.filter !== 'all') params.set('filter', query.filter);
    if (query.sort !== 'newest') params.set('sort', query.sort);
    if (page > 1) params.set('page', String(page));
    const search = params.toString();
    return search ? `/dashboard/products?${search}` : '/dashboard/products';
  }

  return (
    <>
      <PageHeader
        title="Saved Products"
        description="Everything you've analysed, searchable and filterable by verdict."
        actions={
          <Button asChild>
            <Link href="/dashboard/research">
              <Sparkles aria-hidden />
              Analyze New Product
            </Link>
          </Button>
        }
      />

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <ProductFilters />
      </Suspense>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title={isFiltered ? 'No products match those filters' : 'No saved products yet'}
          description={
            isFiltered
              ? 'Try a different search term, or clear the filters to see everything in your library.'
              : 'Analyse your first product and it will appear here with its score and verdict.'
          }
          action={
            isFiltered ? (
              <Button asChild variant="secondary">
                <Link href="/dashboard/products">Clear filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/dashboard/research">Analyze a product</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm text-fg-muted">
            {result.total} product{result.total === 1 ? '' : 's'}
            {isFiltered ? ' matching your filters' : ''}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  category: product.category,
                  imageUrl: product.imageUrl,
                  isDemo: product.isDemo,
                  createdAt: product.createdAt,
                  latestAnalysis: product.latestAnalysis
                    ? {
                        id: product.latestAnalysis.id,
                        overallScore: product.latestAnalysis.overallScore,
                        verdict: product.latestAnalysis.verdict,
                        isDemo: product.latestAnalysis.isDemo,
                        createdAt: product.latestAnalysis.createdAt,
                      }
                    : null,
                }}
              />
            ))}
          </div>

          {result.totalPages > 1 && (
            <nav className="flex items-center justify-between gap-3 pt-2" aria-label="Pagination">
              <Button asChild variant="secondary" size="sm" disabled={result.page <= 1}>
                <Link href={pageHref(result.page - 1)} aria-disabled={result.page <= 1}>
                  Previous
                </Link>
              </Button>
              <p className="text-sm text-fg-muted">
                Page {result.page} of {result.totalPages}
              </p>
              <Button asChild variant="secondary" size="sm" disabled={result.page >= result.totalPages}>
                <Link href={pageHref(result.page + 1)} aria-disabled={result.page >= result.totalPages}>
                  Next
                </Link>
              </Button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
