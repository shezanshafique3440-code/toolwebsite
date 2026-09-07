import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Bot, DollarSign, FileText, Package, TrendingUp, UserPlus, Users } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireAdmin } from '@/lib/auth/current-user';
import { getAdminStats, listAiRequests } from '@/lib/services/admin';
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';

export const metadata: Metadata = { title: 'Overview' };

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [stats, requests] = await Promise.all([getAdminStats(), listAiRequests(12)]);

  const failureRate =
    stats.ai.requests30d > 0 ? ((stats.ai.failures30d / stats.ai.requests30d) * 100).toFixed(1) : '0.0';

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Platform overview</h1>
        <p className="mt-1.5 text-sm text-fg-muted">Users, usage and AI cost across the whole workspace.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={formatNumber(stats.users.total)} icon={Users} href="/admin/users" />
        <StatCard
          label="Active (30d)"
          value={formatNumber(stats.users.active)}
          hint="Signed in within 30 days"
          icon={TrendingUp}
        />
        <StatCard
          label="New registrations"
          value={formatNumber(stats.users.new7d)}
          hint={`${stats.users.new30d} in the last 30 days`}
          icon={UserPlus}
        />
        <StatCard
          label="Suspended"
          value={formatNumber(stats.users.suspended)}
          icon={AlertTriangle}
          href="/admin/users"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={formatNumber(stats.content.products)} icon={Package} />
        <StatCard
          label="Analyses"
          value={formatNumber(stats.content.analyses)}
          hint={`${stats.content.analyses7d} in the last 7 days`}
          icon={TrendingUp}
        />
        <StatCard label="Reports" value={formatNumber(stats.content.reports)} icon={FileText} />
        <StatCard
          label="Errors (7d)"
          value={formatNumber(stats.errors7d)}
          icon={AlertTriangle}
          href="/admin/logs?level=ERROR"
          accentClassName={stats.errors7d > 0 ? 'text-score-avoid' : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-4 text-fg-subtle" aria-hidden />
              AI usage (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Requests', value: formatNumber(stats.ai.requests30d) },
              { label: 'Failures', value: `${stats.ai.failures30d} (${failureRate}%)` },
              { label: 'Input tokens', value: formatNumber(stats.ai.inputTokens30d) },
              { label: 'Output tokens', value: formatNumber(stats.ai.outputTokens30d) },
              { label: 'Average latency', value: `${formatNumber(stats.ai.averageLatencyMs)} ms` },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-fg-muted">{row.label}</span>
                <span className="text-sm font-medium tabular-nums">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="size-4 text-fg-subtle" aria-hidden />
              Estimated API cost
            </CardTitle>
            <p className="mt-1 text-sm text-fg-muted">Last 30 days</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{formatCurrency(stats.ai.costUsd30d, 'USD', 2)}</p>
            <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
              Calculated from recorded token counts and the per-million-token rates configured for each provider. It is
              an internal estimate, not a provider invoice.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PLAN_ORDER.map((planId) => (
              <div key={planId} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-fg-muted">{PLANS[planId].name}</span>
                <span className="text-sm font-medium tabular-nums">{stats.subscriptions[planId] ?? 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analyses per day</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">Last 14 days.</p>
        </CardHeader>
        <CardContent>
          {stats.analysesByDay.length === 0 ? (
            <p className="text-sm text-fg-muted">No analyses recorded in this window.</p>
          ) : (
            <div className="flex h-32 items-end gap-1.5">
              {stats.analysesByDay.map((day) => {
                const max = Math.max(...stats.analysesByDay.map((entry) => entry.count), 1);
                return (
                  <div key={day.day} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-t bg-brand-500"
                      style={{ height: `${Math.max(4, (day.count / max) * 100)}%` }}
                      title={`${day.day}: ${day.count}`}
                    />
                    <span className="text-[10px] text-fg-subtle">{day.day.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent AI requests</CardTitle>
          <Link href="/admin/logs" className="text-sm text-fg-muted underline underline-offset-4 hover:text-fg">
            View logs
          </Link>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-fg-muted">No AI requests recorded yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg hairline">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.operation}</TableCell>
                      <TableCell className="text-fg-muted">{request.user?.email ?? '—'}</TableCell>
                      <TableCell className="text-fg-muted">
                        {request.provider}/{request.model}
                      </TableCell>
                      <TableCell>
                        <Badge variant={request.success ? 'strong' : 'avoid'}>
                          {request.success ? 'OK' : (request.errorCode ?? 'Failed')}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{request.latencyMs} ms</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(request.costUsd, 'USD', 2)}</TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">
                        {formatDateTime(request.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
