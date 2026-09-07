'use client';

import * as React from 'react';
import { Plus, Users2, X } from 'lucide-react';
import { ToolForm, type ProductOption } from '@/components/dashboard/tool-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EstimateBadge } from '@/components/ui/estimate-label';
import type { CompetitorAnalysisResult } from '@/lib/ai/schemas';
import { formatCurrency, safeHostname } from '@/lib/utils';

function CompetitorResult({ analysis }: { analysis: CompetitorAnalysisResult }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <CardTitle>Summary</CardTitle>
          <EstimateBadge />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-fg-muted">{analysis.summary}</p>
          <div className="rounded-lg bg-surface-muted p-4">
            <p className="text-xs uppercase tracking-wide text-fg-subtle">Recommended positioning</p>
            <p className="mt-1.5 text-sm leading-relaxed text-fg">{analysis.recommendedPositioning}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparison table</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">
            Price range {formatCurrency(analysis.comparison.priceRangeMin)} –{' '}
            {formatCurrency(analysis.comparison.priceRangeMax)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg hairline">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competitor</TableHead>
                  <TableHead>Est. price</TableHead>
                  <TableHead>Positioning</TableHead>
                  <TableHead>Target customer</TableHead>
                  <TableHead>Angle</TableHead>
                  <TableHead>Offer</TableHead>
                  <TableHead>CTA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.competitors.map((competitor) => (
                  <TableRow key={competitor.name}>
                    <TableCell className="font-medium">
                      {competitor.url ? (
                        <a
                          href={competitor.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-brand-600 underline underline-offset-4"
                        >
                          {competitor.name || safeHostname(competitor.url)}
                        </a>
                      ) : (
                        competitor.name
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatCurrency(competitor.estimatedPrice, competitor.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{competitor.estimatedPositioning}</Badge>
                    </TableCell>
                    <TableCell className="max-w-48 text-fg-muted">{competitor.targetCustomer}</TableCell>
                    <TableCell className="max-w-48 text-fg-muted">{competitor.marketingAngle}</TableCell>
                    <TableCell className="max-w-48 text-fg-muted">{competitor.offerStructure}</TableCell>
                    <TableCell className="text-fg-muted">{competitor.cta}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-fg-subtle">
            Competitor pages are not fetched. Prices, positioning and offers are inferred from the URLs and context you
            supplied — verify anything you plan to act on.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {analysis.competitors.map((competitor) => (
          <Card key={`detail-${competitor.name}`}>
            <CardHeader>
              <CardTitle>{competitor.name}</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">{competitor.positioning}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Selling points</p>
                <ul className="mt-2 space-y-1.5">
                  {competitor.sellingPoints.map((point) => (
                    <li key={point} className="text-sm leading-relaxed text-fg-muted">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-score-strong">Strengths</p>
                  <ul className="mt-2 space-y-1.5">
                    {competitor.strengths.map((item) => (
                      <li key={item} className="text-sm leading-relaxed text-fg-muted">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-score-risky">Weaknesses</p>
                  <ul className="mt-2 space-y-1.5">
                    {competitor.weaknesses.map((item) => (
                      <li key={item} className="text-sm leading-relaxed text-fg-muted">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where the gaps are</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          {[
            { title: 'Common angles', items: analysis.comparison.commonAngles },
            { title: 'Market gaps', items: analysis.comparison.marketGaps },
            { title: 'Differentiation', items: analysis.comparison.differentiationOpportunities },
          ].map((group) => (
            <div key={group.title}>
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{group.title}</p>
              <ul className="mt-2.5 space-y-2">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-fg-muted">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function CompetitorTool({
  products,
  defaultProductId,
  defaultName,
  locked,
}: {
  products: ProductOption[];
  defaultProductId?: string;
  defaultName?: string;
  locked?: { reason: string };
}) {
  const [urls, setUrls] = React.useState<string[]>(['']);

  function updateUrl(index: number, value: string) {
    setUrls((current) => current.map((entry, position) => (position === index ? value : entry)));
  }

  return (
    <ToolForm<CompetitorAnalysisResult>
      endpoint="/api/competitors/analyze"
      submitLabel="Analyse competitors"
      creditCost={2}
      products={products}
      defaultProductId={defaultProductId}
      defaultName={defaultName}
      locked={locked}
      buildBody={(form) => ({
        productId: String(form.get('productId') ?? '') || undefined,
        productName: String(form.get('productName') ?? ''),
        competitorUrls: urls.map((url) => url.trim()).filter(Boolean),
        notes: String(form.get('notes') ?? '') || undefined,
      })}
      renderResult={(analysis) => <CompetitorResult analysis={analysis} />}
      emptyState={
        <EmptyState
          icon={Users2}
          title="No competitor analysis yet"
          description="Add up to six competitor URLs, or run it without any to see the competitor archetypes you would meet in this category."
        />
      }
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-fg">Competitor URLs</legend>
        {urls.map((url, index) => (
          <div key={index} className="flex gap-2">
            <Input
              type="url"
              value={url}
              onChange={(event) => updateUrl(index, event.target.value)}
              placeholder="https://competitor.com/product"
              aria-label={`Competitor URL ${index + 1}`}
            />
            {urls.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setUrls((current) => current.filter((_, position) => position !== index))}
                aria-label={`Remove competitor URL ${index + 1}`}
              >
                <X />
              </Button>
            )}
          </div>
        ))}
        {urls.length < 6 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setUrls((current) => [...current, ''])}>
            <Plus aria-hidden />
            Add another
          </Button>
        )}
        <p className="text-xs text-fg-subtle">
          Optional. Pages are not fetched — URLs are used as context only.
        </p>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="notes">What you already know</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={4000}
          placeholder="Prices you have seen, offers they run, anything that should inform the comparison."
        />
      </div>
    </ToolForm>
  );
}
