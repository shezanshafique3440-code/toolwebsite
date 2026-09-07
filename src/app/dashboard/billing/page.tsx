import type { Metadata } from 'next';
import { PageHeader } from '@/components/dashboard/topbar';
import { BillingPanel } from '@/components/dashboard/billing-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { paymentsConfigured } from '@/lib/billing/service';
import { PLANS } from '@/lib/plans';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Billing' };

export default async function BillingPage() {
  const user = await requireUser();

  const [subscription, history] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true, status: true, interval: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    }),
    prisma.usage.findMany({
      where: { userId: user.id },
      orderBy: { periodStart: 'desc' },
      take: 6,
      select: { periodStart: true, periodEnd: true, analysisCount: true, generationCount: true, creditsUsed: true },
    }),
  ]);

  const plan = PLANS[user.plan];

  return (
    <>
      <PageHeader
        title="Billing"
        description="Your plan, what it includes, and how much of it you have used this period."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {plan.name} plan
              <Badge variant={subscription?.status === 'ACTIVE' ? 'strong' : 'neutral'}>
                {subscription?.status ?? 'ACTIVE'}
              </Badge>
            </CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              {subscription?.interval === 'YEARLY' ? 'Billed yearly' : 'Billed monthly'} · renews{' '}
              {subscription ? formatDate(subscription.currentPeriodEnd) : '—'}
            </p>
          </CardHeader>
          <CardContent>
            {subscription?.cancelAtPeriodEnd && (
              <p className="rounded-lg bg-surface-muted px-3.5 py-3 text-sm text-fg-muted">
                Scheduled to move to the Free plan on {formatDate(subscription.currentPeriodEnd)}.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analyses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {user.entitlements.analysesUsed}
              <span className="text-base text-fg-subtle"> / {user.entitlements.analysesLimit}</span>
            </p>
            <Progress
              className="mt-3"
              value={
                user.entitlements.analysesLimit > 0
                  ? (user.entitlements.analysesUsed / user.entitlements.analysesLimit) * 100
                  : 0
              }
            />
            <p className="mt-2 text-xs text-fg-muted">
              {user.entitlements.analysesRemaining} remaining this period.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI credits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {user.entitlements.creditsUsed}
              <span className="text-base text-fg-subtle"> / {user.entitlements.creditsGranted}</span>
            </p>
            <Progress
              className="mt-3"
              value={
                user.entitlements.creditsGranted > 0
                  ? (user.entitlements.creditsUsed / user.entitlements.creditsGranted) * 100
                  : 0
              }
            />
            <p className="mt-2 text-xs text-fg-muted">
              {user.entitlements.bonusCredits > 0
                ? `Includes ${user.entitlements.bonusCredits} bonus credits.`
                : 'Analyses cost 1 credit; generators cost 1–2.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <BillingPanel
        currentPlan={user.plan}
        cancelAtPeriodEnd={Boolean(subscription?.cancelAtPeriodEnd)}
        paymentsEnabled={paymentsConfigured()}
      />

      <Card>
        <CardHeader>
          <CardTitle>Usage history</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">The last six billing periods.</p>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-fg-muted">No usage recorded yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg hairline">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Analyses</TableHead>
                    <TableHead>Generations</TableHead>
                    <TableHead>Credits used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((period) => (
                    <TableRow key={period.periodStart.toISOString()}>
                      <TableCell>
                        {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
                      </TableCell>
                      <TableCell className="tabular-nums">{period.analysisCount}</TableCell>
                      <TableCell className="tabular-nums">{period.generationCount}</TableCell>
                      <TableCell className="tabular-nums">{period.creditsUsed}</TableCell>
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
