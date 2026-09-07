import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUpRight,
  Lightbulb,
  Sparkles,
  ShieldAlert,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/dashboard/topbar';
import { ReportActions } from '@/components/dashboard/report-actions';
import { BulletList, DefinitionList, ReportSection } from '@/components/dashboard/report-section';
import { VerdictBadge } from '@/components/dashboard/verdict-badge';
import { ScoreRing, ScoreBar } from '@/components/ui/score-ring';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EstimateBadge } from '@/components/ui/estimate-label';
import { InfoHint } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireUser } from '@/lib/auth/current-user';
import { getProductDetail } from '@/lib/services/products';
import { AppError } from '@/lib/errors';
import { planFeatureAllowed } from '@/lib/plans';
import { SCORE_DEFINITIONS, VERDICT_LABELS, type Verdict } from '@/lib/scoring';
import type { AudienceAnalysis, ProductAnalysis } from '@/lib/ai/schemas';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Product report' };

export default async function ProductReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const product = await getProductDetail(user.id, id).catch((error) => {
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound();
    throw error;
  });

  const analysis = product.analyses[0];

  if (!analysis) {
    return (
      <>
        <PageHeader
          title={product.name}
          description="This product has not been analysed yet."
          actions={
            <Button asChild>
              <Link href={`/dashboard/research?productId=${product.id}`}>
                <Sparkles aria-hidden />
                Analyse now
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  const detail = analysis.data as unknown as ProductAnalysis;
  const verdict = analysis.verdict as Verdict;
  const competitorAnalysis = product.competitorAnalyses[0] ?? null;
  const audience = (product.audiences[0]?.data as unknown as AudienceAnalysis | undefined) ?? null;
  const canExport = planFeatureAllowed(user.plan, 'export');
  const currency = detail.pricing.currency || 'USD';

  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.category ?? 'Uncategorised'} · analysed ${formatDateTime(analysis.createdAt)}`}
        actions={<ReportActions productId={product.id} analysisId={analysis.id} canExport={canExport} />}
      />

      {analysis.isDemo && (
        <div className="rounded-card border border-score-potential/30 bg-score-potential/[0.06] px-4 py-3 text-sm">
          <span className="font-medium text-fg">Sample report.</span>{' '}
          <span className="text-fg-muted">
            This analysis was generated in demo mode without a connected AI provider. Treat it as a layout preview,
            not as an assessment of this product.
          </span>
        </div>
      )}

      {/* Header card */}
      <section className="rounded-card bg-surface p-5 hairline shadow-subtle sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied product image URL
            <img
              src={product.imageUrl}
              alt=""
              className="size-24 shrink-0 rounded-xl object-cover hairline"
              loading="lazy"
            />
          ) : null}

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <VerdictBadge verdict={verdict} />
              <EstimateBadge />
              {product.isDemo && <Badge variant="potential">Demo product</Badge>}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">{detail.overview}</p>
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-sm text-brand-600 underline underline-offset-4"
              >
                Open product page
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            )}
          </div>

          <div className="flex justify-center sm:justify-end">
            <ScoreRing score={analysis.overallScore} />
          </div>
        </div>
      </section>

      {/* Market opportunity */}
      <ReportSection
        id="market-opportunity"
        title="Market opportunity"
        description="Four weighted dimensions. The overall score is recomputed from these, so it can never contradict them."
        aside={<EstimateBadge />}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <ScoreBar
            label="Demand"
            score={analysis.demandScore}
            hint={<InfoHint label={SCORE_DEFINITIONS.demand} />}
          />
          <ScoreBar
            label="Competition"
            score={analysis.competitionScore}
            hint={<InfoHint label={SCORE_DEFINITIONS.competition} />}
          />
          <ScoreBar
            label="Profit potential"
            score={analysis.profitScore}
            hint={<InfoHint label={SCORE_DEFINITIONS.profit} />}
          />
          <ScoreBar
            label="Viral potential"
            score={analysis.viralScore}
            hint={<InfoHint label={SCORE_DEFINITIONS.viral} />}
          />
        </div>

        <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          {(
            [
              ['Demand', detail.scoreReasoning.demand],
              ['Competition', detail.scoreReasoning.competition],
              ['Profit potential', detail.scoreReasoning.profit],
              ['Viral potential', detail.scoreReasoning.viral],
            ] as const
          ).map(([term, description]) => (
            <div key={term}>
              <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{term}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-fg-muted">{description}</dd>
            </div>
          ))}
        </dl>
      </ReportSection>

      {/* Overview */}
      <ReportSection id="overview" title="Product overview">
        <DefinitionList
          items={[
            { term: 'Category', description: detail.category },
            { term: 'Target audience', description: detail.targetAudience },
            { term: 'Problem solved', description: detail.painPoint },
            {
              term: 'Market saturation',
              description: (
                <>
                  <span className="font-medium">{detail.marketSaturation.level}</span> — {detail.marketSaturation.explanation}
                </>
              ),
            },
            {
              term: 'Seasonality',
              description: (
                <>
                  <span className="font-medium">{detail.seasonality.dependency}</span> — {detail.seasonality.explanation}
                  {detail.seasonality.peakPeriods.length > 0 && (
                    <span className="mt-1 block text-fg-subtle">Peaks: {detail.seasonality.peakPeriods.join(', ')}</span>
                  )}
                </>
              ),
            },
            {
              term: 'Confidence',
              description: `${detail.confidence} — based on the information supplied.`,
            },
          ]}
        />
      </ReportSection>

      {/* Trend */}
      <ReportSection
        id="trend"
        title="Trend analysis"
        description="Directional reasoning about where interest is heading."
        aside={<EstimateBadge />}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5 rounded-lg bg-surface-muted px-4 py-3">
            <TrendingUp className="size-4 text-fg-subtle" aria-hidden />
            <span className="text-sm font-medium">{detail.trend.direction}</span>
            <span className="text-sm text-fg-muted">·</span>
            <span className="text-sm tabular-nums text-fg-muted">{detail.trend.score}/100</span>
          </div>
          <Badge variant="outline">Live data unavailable</Badge>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">{detail.trend.explanation}</p>
        <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
          No search-trend or marketplace integration is connected, so this is a reasoned estimate rather than measured
          interest over time. The application exposes a <code className="rounded bg-surface-muted px-1">TrendDataProvider</code>{' '}
          interface for adding one.
        </p>
      </ReportSection>

      {/* Customer */}
      <ReportSection
        id="customer"
        title="Customer"
        description="Who this product is for."
        aside={
          !audience ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/dashboard/audience?productId=${product.id}&name=${encodeURIComponent(product.name)}`}>
                Build full persona
              </Link>
            </Button>
          ) : undefined
        }
      >
        {audience ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-xl bg-surface-muted p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Persona</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">{audience.persona.name}</p>
              <p className="text-sm text-fg-muted">
                {audience.persona.age} · {audience.persona.occupation}
              </p>
              <p className="text-sm text-fg-muted">{audience.persona.location}</p>
              <blockquote className="mt-4 border-l-2 border-line-strong pl-3 text-sm italic leading-relaxed text-fg">
                {audience.persona.quote}
              </blockquote>
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">{audience.persona.bio}</p>
            </div>

            <div className="space-y-5">
              <DefinitionList
                items={[
                  { term: 'Age range', description: audience.ageRange },
                  { term: 'Gender', description: audience.gender },
                  { term: 'Location', description: audience.location },
                  { term: 'Desired outcome', description: audience.desiredOutcome },
                ]}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Buying motivations</p>
                  <div className="mt-2">
                    <BulletList items={audience.buyingMotivations} tone="positive" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Objections</p>
                  <div className="mt-2">
                    <BulletList items={audience.objections} tone="negative" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <DefinitionList
              items={[
                { term: 'Age range', description: detail.audienceSnapshot.ageRange },
                { term: 'Gender', description: detail.audienceSnapshot.gender },
              ]}
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Interests</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {detail.audienceSnapshot.interests.map((interest) => (
                  <Badge key={interest} variant="neutral">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </ReportSection>

      {/* Pricing */}
      <ReportSection id="pricing" title="Pricing and profitability" aside={<EstimateBadge />}>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Estimated sourcing price',
              value: `${formatCurrency(detail.pricing.sourcingPriceMin, currency)} – ${formatCurrency(detail.pricing.sourcingPriceMax, currency)}`,
            },
            {
              label: 'Recommended selling price',
              value: `${formatCurrency(detail.pricing.recommendedPriceMin, currency)} – ${formatCurrency(detail.pricing.recommendedPriceMax, currency)}`,
            },
            {
              label: 'Estimated gross margin',
              value: `${detail.pricing.estimatedMarginPercent.toFixed(1)}%`,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-wide text-fg-subtle">{item.label}</p>
              <p className="mt-1.5 text-lg font-semibold tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">{detail.pricing.rationale}</p>
        <Button asChild variant="secondary" size="sm" className="mt-5">
          <Link
            href={`/dashboard/calculator?cost=${detail.pricing.sourcingPriceMax}&price=${detail.pricing.recommendedPriceMin}`}
          >
            Model this in the profit calculator
          </Link>
        </Button>
      </ReportSection>

      {/* Competition */}
      <ReportSection
        id="competition"
        title="Competition"
        description={
          competitorAnalysis
            ? 'Competitor positioning as inferred from the URLs and context you supplied.'
            : undefined
        }
        aside={
          <Button asChild variant="secondary" size="sm">
            <Link href={`/dashboard/competitors?productId=${product.id}&name=${encodeURIComponent(product.name)}`}>
              {competitorAnalysis ? 'Re-run analysis' : 'Analyse competitors'}
            </Link>
          </Button>
        }
      >
        {competitorAnalysis && competitorAnalysis.competitors.length > 0 ? (
          <>
            <p className="text-sm leading-relaxed text-fg-muted">{competitorAnalysis.summary}</p>
            <div className="mt-5 overflow-hidden rounded-lg hairline">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Est. price</TableHead>
                    <TableHead>Positioning</TableHead>
                    <TableHead>Marketing angle</TableHead>
                    <TableHead>CTA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitorAnalysis.competitors.map((competitor) => (
                    <TableRow key={competitor.id}>
                      <TableCell className="font-medium">{competitor.name}</TableCell>
                      <TableCell className="tabular-nums">
                        {competitor.price === null ? '—' : formatCurrency(competitor.price, competitor.currency)}
                      </TableCell>
                      <TableCell>{competitor.estimatedPositioning}</TableCell>
                      <TableCell className="max-w-56">{competitor.marketingAngle}</TableCell>
                      <TableCell>{competitor.cta}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-3 text-xs text-fg-subtle">
              Competitor pages are not fetched. Prices and positioning are AI estimates from the context you supplied.
            </p>
          </>
        ) : (
          <p className="text-sm text-fg-muted">
            No competitor analysis yet. Add competitor URLs to see positioning, offers and angles side by side.
          </p>
        )}
      </ReportSection>

      {/* SWOT */}
      <ReportSection id="swot" title="SWOT" aside={<EstimateBadge />}>
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              { title: 'Strengths', items: detail.swot.strengths, tone: 'positive', icon: ThumbsUp },
              { title: 'Weaknesses', items: detail.swot.weaknesses, tone: 'negative', icon: AlertTriangle },
              { title: 'Opportunities', items: detail.swot.opportunities, tone: 'opportunity', icon: Lightbulb },
              { title: 'Threats', items: detail.swot.risks, tone: 'risk', icon: ShieldAlert },
            ] as const
          ).map((group) => (
            <div key={group.title} className="rounded-lg bg-surface-muted p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <group.icon className="size-4 text-fg-subtle" aria-hidden />
                {group.title}
              </p>
              <div className="mt-3">
                <BulletList items={group.items} tone={group.tone} />
              </div>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Marketing */}
      <ReportSection id="marketing" title="Marketing" description="Where to test this product first.">
        <ul className="space-y-4">
          {detail.marketingChannels.map((channel) => (
            <li key={channel.channel} className="rounded-lg bg-surface-muted p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{channel.channel}</p>
                <Badge
                  variant={channel.priority === 'HIGH' ? 'strong' : channel.priority === 'MEDIUM' ? 'potential' : 'neutral'}
                >
                  {channel.priority} priority
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{channel.why}</p>
              <p className="mt-2 text-sm leading-relaxed text-fg">
                <span className="font-medium">First step:</span> {channel.firstStep}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/dashboard/ads?productId=${product.id}&name=${encodeURIComponent(product.name)}`}>
              Generate ad copy
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/dashboard/keywords?productId=${product.id}&name=${encodeURIComponent(product.name)}`}>
              Generate keywords
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/dashboard/listings?productId=${product.id}&name=${encodeURIComponent(product.name)}`}>
              Generate listing
            </Link>
          </Button>
        </div>
      </ReportSection>

      {/* Verdict */}
      <ReportSection id="verdict" title="Final verdict">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <ScoreRing score={analysis.overallScore} size={128} strokeWidth={10} showVerdict={false} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold tracking-tight">{VERDICT_LABELS[verdict]}</p>
              <VerdictBadge verdict={verdict} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{detail.verdictReasoning}</p>

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Assumptions made</p>
              <div className="mt-2">
                <BulletList items={detail.assumptions} />
              </div>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-fg-subtle">
              Generated {formatDateTime(analysis.createdAt)} · {analysis.provider}/{analysis.model} · every figure in
              this report is an AI estimate, not measured market data.
            </p>
          </div>
        </div>
      </ReportSection>
    </>
  );
}
