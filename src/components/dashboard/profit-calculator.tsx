'use client';

import * as React from 'react';
import { AlertTriangle, RotateCcw, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { InfoHint } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { calculateProfit, DEFAULT_PROFIT_INPUT, type ProfitInput } from '@/lib/profit';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';

const FIELDS: Array<{
  key: keyof ProfitInput;
  label: string;
  hint: string;
  prefix?: string;
  suffix?: string;
  step?: string;
}> = [
  { key: 'productCost', label: 'Product cost', hint: 'What you pay your supplier per unit.', prefix: '$', step: '0.01' },
  { key: 'shippingCost', label: 'Shipping cost', hint: 'Inbound plus outbound shipping per order.', prefix: '$', step: '0.01' },
  { key: 'sellingPrice', label: 'Selling price', hint: 'What the customer pays, before tax.', prefix: '$', step: '0.01' },
  {
    key: 'paymentFeePercent',
    label: 'Payment fee',
    hint: 'Processor percentage, e.g. 2.9 for 2.9%.',
    suffix: '%',
    step: '0.1',
  },
  { key: 'paymentFeeFixed', label: 'Fixed transaction fee', hint: 'Flat fee per transaction, e.g. $0.30.', prefix: '$', step: '0.01' },
  {
    key: 'adCostPerOrder',
    label: 'Advertising cost per order',
    hint: 'Your blended cost to acquire one order (CPA).',
    prefix: '$',
    step: '0.01',
  },
  {
    key: 'platformFeePercent',
    label: 'Platform fee',
    hint: 'Marketplace commission, e.g. 15 for Amazon. Use 0 for your own store.',
    suffix: '%',
    step: '0.1',
  },
  {
    key: 'otherExpenses',
    label: 'Other expenses per order',
    hint: 'Packaging, support, returns provision — anything else per order.',
    prefix: '$',
    step: '0.01',
  },
  { key: 'expectedOrders', label: 'Expected orders', hint: 'Orders in the period you are modelling.', step: '1' },
];

export function ProfitCalculator({ initial }: { initial?: Partial<ProfitInput> }) {
  const [input, setInput] = React.useState<ProfitInput>({ ...DEFAULT_PROFIT_INPUT, ...initial });

  // Pure arithmetic — recalculated on every keystroke, no request required.
  const result = React.useMemo(() => calculateProfit(input), [input]);

  function update(key: keyof ProfitInput, value: string) {
    const parsed = value === '' ? 0 : Number(value);
    setInput((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-start">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Your numbers</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">Everything updates as you type.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInput({ ...DEFAULT_PROFIT_INPUT, ...initial })}
            aria-label="Reset to defaults"
          >
            <RotateCcw aria-hidden />
            Reset
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key} className="flex items-center gap-1.5">
                  {field.label}
                  <InfoHint label={field.hint} />
                </Label>
                <div className="relative">
                  {field.prefix && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">
                      {field.prefix}
                    </span>
                  )}
                  <Input
                    id={field.key}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={field.step}
                    value={String(input[field.key])}
                    onChange={(event) => update(field.key, event.target.value)}
                    className={cn(field.prefix && 'pl-7', field.suffix && 'pr-8')}
                  />
                  {field.suffix && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">
                      {field.suffix}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Results</CardTitle>
            <Badge variant={result.isProfitable ? 'strong' : 'avoid'}>
              {result.isProfitable ? 'Profitable' : 'Loss-making'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Revenue', value: formatCurrency(result.revenue), primary: true },
                { label: 'Total costs', value: formatCurrency(result.totalCosts) },
                {
                  label: 'Profit per order',
                  value: formatCurrency(result.profitPerOrder),
                  tone: result.profitPerOrder >= 0 ? 'positive' : 'negative',
                },
                {
                  label: 'Total profit',
                  value: formatCurrency(result.totalProfit),
                  primary: true,
                  tone: result.totalProfit >= 0 ? 'positive' : 'negative',
                },
                {
                  label: 'Profit margin',
                  value: formatPercent(result.profitMarginPercent),
                  tone: result.profitMarginPercent >= 0 ? 'positive' : 'negative',
                },
                { label: 'Ad spend', value: formatCurrency(result.adSpend) },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-surface-muted p-4">
                  <p className="text-xs uppercase tracking-wide text-fg-subtle">{item.label}</p>
                  <p
                    className={cn(
                      'mt-1.5 font-semibold tabular-nums',
                      item.primary ? 'text-2xl' : 'text-xl',
                      item.tone === 'positive' && 'text-score-strong',
                      item.tone === 'negative' && 'text-score-avoid',
                    )}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-fg-subtle" aria-hidden />
              Break-even
            </CardTitle>
            <p className="mt-1 text-sm text-fg-muted">The thresholds your campaigns have to clear.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-sm text-fg-muted">
                  ROAS
                  <InfoHint label="Revenue divided by advertising spend at your current inputs." />
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {result.roas === null ? '—' : result.roas.toFixed(2)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-sm text-fg-muted">
                  Break-even ROAS
                  <InfoHint label="The minimum return on ad spend at which this order stops losing money. Below this you pay to acquire customers." />
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {result.breakEvenRoas === null ? '—' : result.breakEvenRoas.toFixed(2)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-sm text-fg-muted">
                  Break-even selling price
                  <InfoHint label="The price at which profit per order is exactly zero, holding every other input constant." />
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {result.breakEvenSellingPrice === null ? '—' : formatCurrency(result.breakEvenSellingPrice)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-sm text-fg-muted">
                  Contribution before ads
                  <InfoHint label="What is left from each order after product, shipping, fees and other costs — this is what has to cover advertising." />
                </dt>
                <dd className="text-lg font-semibold tabular-nums">{formatCurrency(result.contributionPerOrder)}</dd>
              </div>
            </dl>

            {result.contributionPerOrder <= 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-score-avoid/25 bg-score-avoid/[0.05] px-3.5 py-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-score-avoid" aria-hidden />
                <p className="text-sm text-fg-muted">
                  At this price the order does not cover its own product, shipping and fee costs, so no amount of ad
                  efficiency makes it profitable. Raise the price or reduce landed cost.
                </p>
              </div>
            )}

            <p className="text-xs leading-relaxed text-fg-subtle">
              These are arithmetic results from the numbers you entered — no AI is involved and nothing is estimated.
              Taxes, refunds and chargebacks are not modelled; include them in “other expenses” if they are material.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
