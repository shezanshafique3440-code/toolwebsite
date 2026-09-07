'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, RefreshCw, Save, Trash2 } from 'lucide-react';
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

export function ReportActions({
  productId,
  analysisId,
  canExport,
}: {
  productId: string;
  analysisId: string;
  canExport: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  async function createReport() {
    return apiFetch<{ id: string }>('/api/reports', { body: { productId, analysisId } });
  }

  async function onSave() {
    setSaving(true);
    try {
      await createReport();
      toast({ title: 'Report saved', description: 'Find it under Reports.', variant: 'success' });
      router.refresh();
    } catch (error) {
      toast({ title: 'Could not save the report', description: errorMessage(error), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function onExport() {
    setExporting(true);
    try {
      // A PDF always exports an immutable snapshot, so one is created first.
      const report = await createReport();
      // The endpoint responds with Content-Disposition: attachment, so this is a
      // file download rather than a navigation — an anchor click keeps the SPA
      // history untouched.
      const link = document.createElement('a');
      link.href = `/api/reports/${report.id}/export`;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: 'Preparing your PDF', description: 'The download will start in a moment.', variant: 'success' });
      router.refresh();
    } catch (error) {
      toast({ title: 'Could not export the report', description: errorMessage(error), variant: 'error' });
    } finally {
      setExporting(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/products/${productId}`, { method: 'DELETE' });
      toast({ title: 'Product deleted', variant: 'success' });
      router.push('/dashboard/products');
      router.refresh();
    } catch (error) {
      toast({ title: 'Could not delete the product', description: errorMessage(error), variant: 'error' });
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <Button asChild variant="secondary" size="sm">
        <Link href={`/dashboard/research?productId=${productId}`}>
          <RefreshCw aria-hidden />
          Analyze again
        </Link>
      </Button>

      <Button variant="secondary" size="sm" onClick={onSave} loading={saving}>
        <Save aria-hidden />
        Save report
      </Button>

      {canExport ? (
        <Button size="sm" onClick={onExport} loading={exporting}>
          <Download aria-hidden />
          Export PDF
        </Button>
      ) : (
        <Button asChild size="sm" variant="secondary" title="PDF export is available on Pro and Business">
          <Link href="/dashboard/billing">
            <Download aria-hidden />
            Export PDF (Pro)
          </Link>
        </Button>
      )}

      <Button variant="ghost" size="icon" onClick={() => setConfirmOpen(true)} aria-label="Delete product">
        <Trash2 />
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this product?</DialogTitle>
            <DialogDescription>
              This permanently removes the product, every analysis run against it, and any saved reports. This cannot
              be undone.
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
