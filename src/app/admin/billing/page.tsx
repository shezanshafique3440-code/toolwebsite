import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/dashboard/stat-card';
import { requireAdmin } from '@/lib/auth/current-user';
import { listPaymentEvents } from '@/lib/services/admin';
import { prisma } from '@/lib/db';
import { paddlePublicConfig } from '@/lib/billing/paddle/config';
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import { formatDateTime, formatNumber } from '@/lib/utils';

export const metadata: Metadata = { title: 'Billing' };

export default async function AdminBillingPage() {
  await requireAdmin();

  const [events, planCounts, statusCounts, grants, failedEvents] = await Promise.all([
    listPaymentEvents(30),
    prisma.subscription.groupBy({ by: ['plan'], _count: { _all: true } }),
    prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.manualPlanGrant.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        plan: true,
        reason: true,
        expiresAt: true,
        createdAt: true,
        user: { select: { email: true } },
        grantedBy: { select: { email: true } },
      },
    }),
    prisma.paymentEvent.count({ where: { processed: false, error: { not: null } } }),
  ]);

  const paddle = paddlePublicConfig();
  const byPlan = Object.fromEntries(planCounts.map((row) => [row.plan, row._count._all]));
  const paying = (byPlan.PRO ?? 0) + (byPlan.BUSINESS ?? 0);
  const mrr = (byPlan.PRO ?? 0) * PLANS.PRO.monthlyPrice + (byPlan.BUSINESS ?? 0) * PLANS.BUSINESS.monthlyPrice;

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Billing</h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          Subscription mix, complimentary grants and recent Paddle webhook deliveries.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Paying subscriptions" value={formatNumber(paying)} />
        <StatCard
          label="Gross monthly value"
          value={`$${formatNumber(mrr)}`}
          hint="List price × active subscriptions, before Paddle fees and tax"
        />
        <StatCard
          label="Paddle mode"
          value={paddle.configured ? paddle.environment : 'not configured'}
          hint={paddle.configured ? undefined : 'Set the PADDLE_* variables to enable checkout'}
        />
        <StatCard
          label="Webhook failures"
          value={formatNumber(failedEvents)}
          accentClassName={failedEvents > 0 ? 'text-score-avoid' : undefined}
          hint={failedEvents > 0 ? 'Deliveries that could not be applied' : 'All deliveries applied'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions by plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PLAN_ORDER.map((plan) => (
              <div key={plan} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-fg-muted">{PLANS[plan].name}</span>
                <span className="text-sm font-medium tabular-nums">{byPlan[plan] ?? 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriptions by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusCounts.map((row) => (
              <div key={row.status} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-fg-muted">{row.status}</span>
                <span className="text-sm font-medium tabular-nums">{row._count._all}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Complimentary grants</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">
            Plans given by an administrator. These are not payments and are never counted as revenue.
          </p>
        </CardHeader>
        <CardContent>
          {grants.length === 0 ? (
            <p className="text-sm text-fg-muted">No active complimentary grants.</p>
          ) : (
            <div className="overflow-hidden rounded-lg hairline">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Granted by</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grants.map((grant) => (
                    <TableRow key={grant.id}>
                      <TableCell>{grant.user.email}</TableCell>
                      <TableCell>
                        <Badge variant="brand">{PLANS[grant.plan].name}</Badge>
                      </TableCell>
                      <TableCell className="max-w-72 text-fg-muted">{grant.reason}</TableCell>
                      <TableCell className="text-fg-muted">{grant.grantedBy.email}</TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">
                        {grant.expiresAt ? formatDateTime(grant.expiresAt) : 'Until revoked'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Paddle webhooks</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">
            Every verified delivery is recorded. A repeated delivery is ignored rather than applied twice.
          </p>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-fg-muted">
              No webhook deliveries yet. Once Paddle is configured and a checkout completes, events appear here.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg hairline">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Event ID</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.eventType}</TableCell>
                      <TableCell className="font-mono text-[11px] text-fg-muted">{event.eventId}</TableCell>
                      <TableCell>
                        <Badge variant={event.processed ? 'strong' : event.error ? 'avoid' : 'neutral'}>
                          {event.processed ? 'Applied' : event.error ? 'Failed' : 'Ignored'}
                        </Badge>
                        {event.error && (
                          <p className="mt-1 max-w-72 text-xs text-score-avoid">{event.error}</p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">
                        {formatDateTime(event.createdAt)}
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
