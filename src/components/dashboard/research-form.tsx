'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const STEPS = [
  'Understanding your product',
  'Analyzing market opportunity',
  'Evaluating competition',
  'Calculating profitability',
  'Generating recommendations',
];

const CATEGORIES = [
  'Home & kitchen',
  'Consumer electronics',
  'Beauty & personal care',
  'Health & wellness',
  'Pet supplies',
  'Car accessories',
  'Fitness & outdoors',
  'Baby & kids',
  'Fashion & accessories',
  'Office & stationery',
  'Tools & DIY',
];

type AnalyzeResponse = {
  productId: string;
  analysisId: string;
  overallScore: number;
  verdict: string;
  isDemo: boolean;
};

export function ResearchForm({
  analysesRemaining,
  defaults,
}: {
  analysesRemaining: number;
  defaults?: { name?: string; url?: string; category?: string; notes?: string; productId?: string };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  // The stepper reflects the phases of the request, not a fake countdown: it
  // pauses on the final step until the server actually responds. The step is
  // reset where a run starts, so the effect only owns the interval.
  React.useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {
      setStep((current) => (current >= STEPS.length - 1 ? current : current + 1));
    }, 2600);
    return () => window.clearInterval(timer);
  }, [pending]);

  const outOfAnalyses = analysesRemaining <= 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStep(0);
    setPending(true);
    setError(null);
    setFields({});

    try {
      const result = await apiFetch<AnalyzeResponse>('/api/products/analyze', {
        body: {
          name: String(form.get('name') ?? ''),
          url: String(form.get('url') ?? '') || undefined,
          imageUrl: String(form.get('imageUrl') ?? '') || undefined,
          category: String(form.get('category') ?? '') || undefined,
          notes: String(form.get('notes') ?? '') || undefined,
          productId: defaults?.productId,
        },
      });

      toast({
        title: 'Analysis complete',
        description: `Overall score ${result.overallScore}/100.`,
        variant: 'success',
      });
      router.push(`/dashboard/products/${result.productId}`);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
      setPending(false);
    }
  }

  if (pending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analysing your product</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">
            This usually takes 20-60 seconds. You can leave this tab open — we&apos;ll take you to the report when
            it&apos;s ready.
          </p>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3.5">
            {STEPS.map((label, index) => {
              const done = index < step;
              const active = index === step;
              return (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors',
                      done && 'bg-score-strong/15 text-score-strong',
                      active && 'bg-brand-50 text-brand-700',
                      !done && !active && 'bg-surface-muted text-fg-subtle',
                    )}
                  >
                    {done ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : active ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className={cn('text-sm', done || active ? 'text-fg' : 'text-fg-subtle')}>
                    {label}
                    {active && '…'}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <ErrorState title="We could not complete the analysis" description={error} />}

      {outOfAnalyses && (
        <div
          role="status"
          className="rounded-card border border-score-potential/30 bg-score-potential/[0.06] px-4 py-3.5 text-sm"
        >
          <p className="font-medium text-fg">You&apos;ve used every analysis in this billing period.</p>
          <p className="mt-0.5 text-fg-muted">Upgrade your plan to keep researching, or wait for the period to reset.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Product details</CardTitle>
          <p className="mt-1 text-sm text-fg-muted">
            The more context you give, the more specific the assessment. A name alone is enough to start.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Product name *</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={120}
              defaultValue={defaults?.name}
              placeholder="e.g. Portable Blender"
              aria-invalid={fields.name ? true : undefined}
              aria-describedby={fields.name ? 'name-error' : undefined}
            />
            {fields.name && (
              <p id="name-error" className="text-xs text-score-avoid" role="alert">
                {fields.name}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="url">Product page URL</Label>
              <Input
                id="url"
                name="url"
                type="url"
                defaultValue={defaults?.url}
                placeholder="https://www.aliexpress.com/item/…"
                aria-invalid={fields.url ? true : undefined}
              />
              {fields.url ? (
                <p className="text-xs text-score-avoid" role="alert">
                  {fields.url}
                </p>
              ) : (
                <p className="text-xs text-fg-subtle">Used as context. The page itself is not fetched.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select id="category" name="category" defaultValue={defaults?.category ?? ''}>
                <option value="">Let the analysis decide</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imageUrl">Product image URL</Label>
            <Input id="imageUrl" name="imageUrl" type="url" placeholder="https://…/product.jpg" />
            <p className="text-xs text-fg-subtle">Optional. Shown on the report header and in your library.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Product details</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={6}
              maxLength={4000}
              defaultValue={defaults?.notes}
              placeholder="Paste the product description, specifications, supplier price, or anything else you know. The more you paste, the more grounded the analysis."
            />
            <p className="text-xs text-fg-subtle">Up to 4,000 characters.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={outOfAnalyses}>
          <Sparkles aria-hidden />
          Analyze product
        </Button>
        <p className="text-sm text-fg-muted">
          {analysesRemaining} analys{analysesRemaining === 1 ? 'is' : 'es'} left this period · costs 1 AI credit
        </p>
      </div>
    </form>
  );
}
