'use client';

import * as React from 'react';
import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/ui/empty-state';
import { SkeletonText } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api-client';

export type ProductOption = { id: string; name: string };

export type ToolFormProps<T> = {
  /** API endpoint that performs the generation. */
  endpoint: string;
  submitLabel: string;
  creditCost: number;
  products: ProductOption[];
  defaultProductId?: string;
  defaultName?: string;
  /** Set when the current plan does not include this tool. */
  locked?: { reason: string };
  /** Extra tool-specific inputs, rendered under the product fields. */
  children?: React.ReactNode;
  /** Builds the request body from the submitted form. */
  buildBody: (form: FormData) => Record<string, unknown>;
  /** Renders a successful result. */
  renderResult: (result: T, meta: { isDemo: boolean }) => React.ReactNode;
  /** Optional previously-generated result to show before the first submit. */
  initialResult?: { result: T; isDemo: boolean } | null;
  emptyState: React.ReactNode;
};

export function ToolForm<T>({
  endpoint,
  submitLabel,
  creditCost,
  products,
  defaultProductId,
  defaultName,
  locked,
  children,
  buildBody,
  renderResult,
  initialResult,
  emptyState,
}: ToolFormProps<T>) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [output, setOutput] = React.useState<{ result: T; isDemo: boolean } | null>(initialResult ?? null);
  const [productId, setProductId] = React.useState(defaultProductId ?? '');
  const [name, setName] = React.useState(defaultName ?? '');

  // Selecting a saved product fills the name so the two never disagree.
  function onProductChange(value: string) {
    setProductId(value);
    const selected = products.find((product) => product.id === value);
    if (selected) setName(selected.name);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFields({});

    try {
      const response = await apiFetch<Record<string, unknown>>(endpoint, { body: buildBody(form) });
      const { isDemo, id, ids, ...rest } = response as Record<string, unknown> & { isDemo?: boolean };
      void id;
      void ids;
      // Each endpoint returns its payload under a single tool-specific key.
      const payload = Object.values(rest)[0] as T;
      setOutput({ result: payload, isDemo: Boolean(isDemo) });
      toast({ title: 'Generated', variant: 'success' });
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  if (locked) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-14 text-center">
          <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-surface-muted">
            <Lock className="size-5 text-fg-subtle" aria-hidden />
          </div>
          <p className="text-sm font-medium">This tool is on the Pro and Business plans</p>
          <p className="mt-1.5 max-w-md text-sm text-fg-muted">{locked.reason}</p>
          <Button asChild className="mt-5">
            <Link href="/dashboard/billing">See plans</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <form onSubmit={onSubmit} className="space-y-4 lg:sticky lg:top-24" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {products.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="tool-product">Saved product</Label>
                <Select
                  id="tool-product"
                  name="productId"
                  value={productId}
                  onChange={(event) => onProductChange(event.target.value)}
                >
                  <option value="">Not linked to a saved product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-fg-subtle">Linking keeps the output on the product&apos;s report.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tool-name">Product name *</Label>
              <Input
                id="tool-name"
                name="productName"
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Portable Blender"
                aria-invalid={fields.productName ? true : undefined}
              />
              {fields.productName && (
                <p className="text-xs text-score-avoid" role="alert">
                  {fields.productName}
                </p>
              )}
            </div>

            {children}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending}>
            <Sparkles aria-hidden />
            {submitLabel}
          </Button>
          <p className="text-xs text-fg-muted">
            Costs {creditCost} AI credit{creditCost === 1 ? '' : 's'}
          </p>
        </div>
      </form>

      <div className="min-w-0 space-y-4">
        {error && <ErrorState title="We could not generate that" description={error} />}

        {pending && (
          <Card>
            <CardContent className="space-y-4 py-6">
              <SkeletonText lines={2} />
              <SkeletonText lines={4} />
              <SkeletonText lines={3} />
            </CardContent>
          </Card>
        )}

        {!pending && output && (
          <>
            {output.isDemo && (
              <div className="rounded-card border border-score-potential/30 bg-score-potential/[0.06] px-4 py-3 text-sm">
                <span className="font-medium text-fg">Sample output.</span>{' '}
                <span className="text-fg-muted">
                  Generated in demo mode without a connected AI provider — use it to preview the format, not the content.
                </span>
              </div>
            )}
            {renderResult(output.result, { isDemo: output.isDemo })}
          </>
        )}

        {!pending && !output && emptyState}
      </div>
    </div>
  );
}
