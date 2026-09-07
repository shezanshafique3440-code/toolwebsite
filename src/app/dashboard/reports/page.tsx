import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/topbar';
import { ReportRowActions } from '@/components/dashboard/report-row-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { requireUser } from '@/lib/auth/current-user';
import { listReports } from '@/lib/services/reports';
import { planFeatureAllowed } from '@/lib/plans';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Reports' };

export default async function ReportsPage() {
  const user = await requireUser();
  const reports = await listReports(user.id);
  const canExport = planFeatureAllowed(user.plan, 'export');

  return (
    <>
      <PageHeader
        title="Reports"
        description="Saved snapshots of your analyses. A report never changes after it is saved, so an exported PDF always matches what you reviewed."
        actions={
          <Button asChild>
            <Link href="/dashboard/products">Browse products</Link>
          </Button>
        }
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No saved reports yet"
          description="Open any analysed product and choose “Save report” to keep a permanent snapshot you can export."
          action={
            <Button asChild>
              <Link href="/dashboard/products">Go to your products</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className="flex flex-col gap-4 rounded-card bg-surface p-5 hairline shadow-subtle sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-sm font-semibold">{report.title}</h2>
                  {report.isDemo && <Badge variant="potential">Demo</Badge>}
                </div>
                <p className="mt-1 text-xs text-fg-muted">
                  {report.product.category ?? 'Uncategorised'} · saved {formatDate(report.createdAt)}
                </p>
              </div>

              <ReportRowActions
                reportId={report.id}
                productId={report.product.id}
                title={report.title}
                canExport={canExport}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
