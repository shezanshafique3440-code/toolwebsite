'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VerdictBadge } from '@/components/dashboard/verdict-badge';
import { useToast } from '@/components/ui/toast';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';
import { scoreTextClass } from '@/lib/scoring';

export type ProductListItem = {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  isDemo: boolean;
  createdAt: string | Date;
  latestAnalysis: {
    id: string;
    overallScore: number;
    verdict: string;
    isDemo: boolean;
    createdAt: string | Date;
  } | null;
};

export function ProductCard({ product }: { product: ProductListItem }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function onDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/products/${product.id}`, { method: 'DELETE' });
      toast({ title: 'Product deleted', variant: 'success' });
      setConfirmOpen(false);
      router.refresh();
    } catch (error) {
      toast({ title: 'Could not delete the product', description: errorMessage(error), variant: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <article className="group relative flex flex-col rounded-card bg-surface p-5 transition-colors hairline shadow-subtle hover:border-line-strong">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-supplied product image URL
              <img src={product.imageUrl} alt="" className="size-11 shrink-0 rounded-lg object-cover hairline" loading="lazy" />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-sm font-semibold text-fg-subtle">
                {product.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">
                <Link href={`/dashboard/products/${product.id}`} className="after:absolute after:inset-0">
                  {product.name}
                </Link>
              </h3>
              <p className="truncate text-xs text-fg-muted">{product.category ?? 'Uncategorised'}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative z-10" aria-label={`Actions for ${product.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/research?productId=${product.id}`}>
                  <RefreshCw aria-hidden />
                  Analyse again
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}>
                <Trash2 aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          {product.latestAnalysis ? (
            <>
              <div>
                <p className={`text-3xl font-semibold tabular-nums ${scoreTextClass(product.latestAnalysis.overallScore)}`}>
                  {product.latestAnalysis.overallScore}
                  <span className="text-sm text-fg-subtle">/100</span>
                </p>
                <p className="mt-1 text-xs text-fg-muted">
                  Analysed {formatRelativeTime(product.latestAnalysis.createdAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <VerdictBadge verdict={product.latestAnalysis.verdict} />
                {product.isDemo && <Badge variant="potential">Demo</Badge>}
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-fg-muted">Not analysed yet</p>
                <p className="mt-1 text-xs text-fg-subtle">Added {formatRelativeTime(product.createdAt)}</p>
              </div>
              <Badge variant="outline">No score</Badge>
            </>
          )}
        </div>
      </article>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {product.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the product, its analyses and any saved reports. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onDelete} loading={deleting}>
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
