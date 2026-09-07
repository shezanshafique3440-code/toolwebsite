import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Coins,
  FileText,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/dashboard/topbar';
import { StatCard } from '@/components/dashboard/stat-card';
import { VerdictBadge } from '@/components/dashboard/verdict-badge';
import { LazyScoreChart } from '@/components/dashboard/score-chart-lazy';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { requireUser } from '@/lib/auth/current-user';
import { getDashboardSummary } from '@/lib/services/products';
import { PLANS } from '@/lib/plans';
import { formatRelativeTime } from '@/lib/utils';
import { scoreTextClass } from '@/lib/scoring';

export default async function DashboardPage() {
  const user = await requireUser();
  const summary = await getDashboardSummary(user.id);
  const plan = PLANS[user.plan];

  const chartData = [...summary.recent]
    .reverse()
    .map((analysis) => ({ label: analysis.product.name.slice(0, 12), score: analysis.overallScore }));

  const analysesUsedPercent =
    user.entitlements.analysesLimit > 0
      ? (user.entitlements.analysesUsed / user.entitlements.analysesLimit) * 100
      : 0;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        description="Your research at a glance. Start with a new product, or pick up where you left off."
        actions={
          <Button asChild>
            <Link href="/dashboard/research">
              <Sparkles aria-hidden />
              Analyze New Product
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Products analysed"
          value={summary.analysisCount}
          hint={`${summary.productCount} product${summary.productCount === 1 ? '' : 's'} in your library`}
          icon={Gauge}
          href="/dashboard/products"
        />
        <StatCard
          label="Average score"
          value={summary.averageScore === null ? '—' : `${summary.averageScore}`}
          hint={summary.averageScore === null ? 'No analyses yet' : 'Across all your analyses'}
          icon={BarChart3}
          accentClassName={summary.averageScore === null ? undefined : scoreTextClass(summary.averageScore)}
        />
        <StatCard
          label="Saved products"
          value={summary.productCount}
          hint="Searchable, sortable and filterable"
          icon={Bookmark}
          href="/dashboard/products"
        />
        <StatCard
          label="Reports generated"
          value={summary.reportCount}
          hint="Snapshots you can export as PDF"
          icon={FileText}
          href="/dashboard/reports"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent analyses</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">Your six most recent product assessments.</p>
            </div>
            {summary.recent.length > 0 && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/products">
                  View all
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {summary.recent.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No analyses yet"
                description="Run your first product analysis to see scores, market opportunity and a verdict here."
                action={
                  <Button asChild>
                    <Link href="/dashboard/research">Analyze a product</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {summary.recent.map((analysis) => (
                  <li key={analysis.id}>
                    <Link
                      href={`/dashboard/products/${analysis.product.id}`}
                      className="flex items-center gap-4 py-3 transition-colors hover:bg-surface-muted/60"
                    >
                      <span
                        className={`w-10 shrink-0 text-lg font-semibold tabular-nums ${scoreTextClass(analysis.overallScore)}`}
                      >
                        {analysis.overallScore}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-fg">{analysis.product.name}</span>
                          {analysis.isDemo && <Badge variant="potential">Demo</Badge>}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-fg-muted">
                          {analysis.product.category ?? 'Uncategorised'} · {formatRelativeTime(analysis.createdAt)}
                        </span>
                      </span>
                      <VerdictBadge verdict={analysis.verdict} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Plan usage</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">
                {plan.name} plan · resets {new Date(user.entitlements.period.end).toLocaleDateString('en-US', { dateStyle: 'medium' })}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-fg-muted">Analyses</span>
                  <span className="font-medium tabular-nums">
                    {user.entitlements.analysesUsed} / {user.entitlements.analysesLimit}
                  </span>
                </div>
                <Progress className="mt-2" value={analysesUsedPercent} />
              </div>

              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-fg-muted">
                    <Coins className="size-3.5" aria-hidden />
                    AI credits
                  </span>
                  <span className="font-medium tabular-nums">
                    {user.entitlements.creditsRemaining} left
                  </span>
                </div>
                <Progress
                  className="mt-2"
                  value={
                    user.entitlements.creditsGranted > 0
                      ? (user.entitlements.creditsUsed / user.entitlements.creditsGranted) * 100
                      : 0
                  }
                />
                <p className="mt-2 text-xs text-fg-subtle">
                  Analyses cost 1 credit; generators cost 1-2 depending on length.
                </p>
              </div>

              {user.plan !== 'BUSINESS' && (
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/dashboard/billing">Upgrade plan</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Score trend</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">Overall score of your recent analyses.</p>
            </CardHeader>
            <CardContent>
              <LazyScoreChart data={chartData} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verdict mix</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">How your analysed products break down.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {(['STRONG', 'POTENTIAL', 'RISKY', 'AVOID'] as const).map((verdict) => (
              <Link
                key={verdict}
                href={`/dashboard/products?filter=${verdict}`}
                className="rounded-lg bg-surface-muted p-4 transition-colors hover:bg-line/60"
              >
                <VerdictBadge verdict={verdict} />
                <p className="mt-3 text-2xl font-semibold tabular-nums">{summary.verdictCounts[verdict] ?? 0}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
