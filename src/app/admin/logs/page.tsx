import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { requireAdmin } from '@/lib/auth/current-user';
import { listSystemLogs } from '@/lib/services/admin';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'System logs' };

const LEVELS = ['ALL', 'INFO', 'WARN', 'ERROR'] as const;

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const level = LEVELS.includes(params.level as (typeof LEVELS)[number]) ? params.level : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const result = await listSystemLogs({
    level: level === 'ALL' || !level ? undefined : (level as 'INFO' | 'WARN' | 'ERROR'),
    page,
    pageSize: 50,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const active = level ?? 'ALL';

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">System logs</h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          Server-side events. Credentials and tokens are redacted before anything is written.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1.5" aria-label="Filter by level">
        {LEVELS.map((value) => (
          <Link
            key={value}
            href={value === 'ALL' ? '/admin/logs' : `/admin/logs?level=${value}`}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              active === value ? 'bg-accent text-accent-fg' : 'bg-surface-muted text-fg-muted hover:text-fg',
            )}
          >
            {value === 'ALL' ? 'All levels' : value}
          </Link>
        ))}
      </nav>

      <Card>
        <CardContent className="p-0">
          {result.logs.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-fg-muted">No log entries at this level.</p>
          ) : (
            <ul className="divide-y divide-line">
              {result.logs.map((log) => (
                <li key={log.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={log.level === 'ERROR' ? 'avoid' : log.level === 'WARN' ? 'potential' : 'neutral'}>
                      {log.level}
                    </Badge>
                    <span className="font-mono text-xs text-fg-muted">{log.event}</span>
                    <span className="ml-auto text-xs text-fg-subtle">{formatDateTime(log.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-fg">{log.message}</p>
                  {log.context ? (
                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-surface-muted p-3 text-xs leading-relaxed text-fg-muted">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
          <Button asChild variant="secondary" size="sm" disabled={page <= 1}>
            <Link href={`/admin/logs?${new URLSearchParams({ ...(level ? { level } : {}), page: String(page - 1) })}`}>
              Previous
            </Link>
          </Button>
          <p className="text-sm text-fg-muted">
            Page {page} of {totalPages}
          </p>
          <Button asChild variant="secondary" size="sm" disabled={page >= totalPages}>
            <Link href={`/admin/logs?${new URLSearchParams({ ...(level ? { level } : {}), page: String(page + 1) })}`}>
              Next
            </Link>
          </Button>
        </nav>
      )}
    </>
  );
}
