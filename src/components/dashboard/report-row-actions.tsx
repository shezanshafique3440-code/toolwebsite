'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { apiFetch, errorMessage } from '@/lib/api-client';

export function ReportRowActions({
  reportId,
  productId,
  title,
  canExport,
}: {
  reportId: string;
  productId: string;
  title: string;
  canExport: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function onDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/reports/${reportId}`, { method: 'DELETE' });
      toast({ title: 'Report deleted', variant: 'success' });
      setConfirmOpen(false);
      router.refresh();
    } catch (error) {
      toast({ title: 'Could not delete the report', description: errorMessage(error), variant: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/dashboard/products/${productId}`}>
            <ExternalLink aria-hidden />
            Open report
          </Link>
        </Button>

        {canExport ? (
          <Button asChild size="sm">
            <a href={`/api/reports/${reportId}/export`}>
              <Download aria-hidden />
              Export PDF
            </a>
          </Button>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/billing">
              <Download aria-hidden />
              Export (Pro)
            </Link>
          </Button>
        )}

        <Button variant="ghost" size="icon" onClick={() => setConfirmOpen(true)} aria-label={`Delete ${title}`}>
          <Trash2 />
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this report?</DialogTitle>
            <DialogDescription>
              The saved snapshot will be removed. The product and its analyses are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onDelete} loading={deleting}>
              Delete report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
