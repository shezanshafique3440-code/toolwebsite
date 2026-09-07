import type { Metadata } from 'next';
import { BillingPanel } from '@/components/dashboard/billing-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/dashboard/topbar';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { PLANS } from '@/lib/plans';
import { paddlePublicConfig } from '@/lib/billing/paddle/config';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Billing' };

type StatusVariant = 'strong' | 'brand' | 'potential' | 'risky' | 'neutral';

const STATUS_COPY: Record<string, { label: string; variant: StatusVariant }> = {
  ACTIVE: { label: 'Active', variant: 'strong' },
  TRIALING: { label: 'Trialing', variant: 'brand' },
  PAST_DUE: { label: 'Payment overdue', variant: 'risky' },
  PAUSED: { label: 'Paused', variant: 'potential' },
  CANCELED: { label: 'Canceled', variant: 'neutral' },
};

export default async function BillingPage() {
  const user = await requireUser();

  const [subscription, history] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: user.id },
      select: {
        plan: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        provider: true,
        pausedAt: true,
      },
    }),
    prisma.usage.findMany({
      where: { userId: user.id },
      orderBy: { periodStart: 'desc' },
      take: 6,
      select: { periodStart: true, periodEnd: true, analysisCount: true, generationCount: true, creditsUsed: true },
    }),
  ]);

  // The effective plan, not what the subscription record claims: an expired or
  // paused subscription reads as Free everywhere in the product.
  const plan = PLANS[user.entitlements.plan];
  const paddle = paddlePublicConfig();
  const status = STATUS_COPY[subscription?.status ?? 'ACTIVE'] ?? STATUS_COPY.ACTIVE;
  const overdue = subscription?.status === 'PAST_DUE';
  const paused = subscription?.status === 'PAUSED';

  return (
    <>
      <PageHeader
        title="Billing"
        description="Your plan, payment status and how much of your allowance you have used."
      />

      {overdue && (
        <div className="rounded-card border border-score-risky/30 bg-score-risky/[0.06] px-4 py-3.5 text-sm">
          <p className="font-medium text-fg">We could not take your latest payment.</p>
          <p className="mt-0.5 leading-relaxed text-fg-muted">
            Paddle will retry automatically. Your access continues for now — update your payment method from
            &ldquo;Manage subscription&rdquo; below to avoid interruption. Nothing has been deleted.
          </p>
        </div>
      )}

      {paused && (
        <div className="rounded-card border border-score-potential/30 bg-score-potential/[0.06] px-4 py-3.5 text-sm">
          <p className="font-medium text-fg">Your subscription is paused.</p>
          <p className="mt-0.5 leading-relaxed text-fg-muted">
            Paid features are unavailable while the subscription is paused. Resume it from &ldquo;Manage
            subscription&rdquo; to restore access. Your data is untouched.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {plan.name}
              {plan.monthlyPrice > 0 && (
                <span className="text-fg-muted">— {formatCurrency(plan.monthlyPrice, 'USD', 0)}/month</span>
              )}
              <Badge variant={status.variant}>{status.label}</Badge>
            </CardTitle>
            <p className="mt-1 text-sm text-fg-muted">{plan.tagline}</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-fg-muted">{subscription?.cancelAtPeriodEnd ? 'Access ends' : 'Renews'}</span>
              <span className="font-medium">
                {subscription ? formatDate(subscription.currentPeriodEnd) : '—'}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-fg-muted">Monthly price</span>
              <span className="font-medium tabular-nums">
                {plan.monthlyPrice === 0 ? 'Free' : `${formatCurrency(plan.monthlyPrice, 'USD', 0)}/month`}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-fg-muted">Billing</span>
              <span className="font-medium">
                {subscription?.provider === 'paddle'
                  ? 'Paddle'
                  : subscription?.provider === 'manual'
                    ? 'Complimentary (admin grant)'
                    : 'No paid subscription'}
              </span>
            </div>
            {subscription?.cancelAtPeriodEnd && (
              <p className="rounded-lg bg-surface-muted px-3.5 py-3 text-sm text-fg-muted">
                Scheduled to move to the Free plan on {formatDate(subscription.currentPeriodEnd)}. You keep full
                access until then.
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
              {user.entitlements.creditsRemaining}
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
        snapshot={{
          plan: user.entitlements.plan,
          active: user.entitlements.active,
          cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
          managedExternally: subscription?.provider === 'paddle',
          manualGrant: subscription?.provider === 'manual',
          paddleConfigured: paddle.configured,
          paddleEnvironment: paddle.environment,
          clientToken: paddle.configured ? paddle.clientToken : null,
        }}
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

      <p className="text-xs leading-relaxed text-fg-subtle">
        Payments are processed by Paddle, which acts as the merchant of record. This application never sees or stores
        your card details, and a plan becomes active only after Paddle confirms the payment.
      </p>
    </>
  );
}
