'use client';

import * as React from 'react';
import { Megaphone } from 'lucide-react';
import { ToolForm, type ProductOption } from '@/components/dashboard/tool-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { AdGeneration } from '@/lib/ai/schemas';

const PLATFORMS = [
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'GOOGLE', label: 'Google' },
] as const;

const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  PLATFORMS.map((platform) => [platform.value, platform.label]),
);

function variationText(variation: AdGeneration['platforms'][number]['variations'][number]) {
  return [
    `Angle: ${variation.angle}`,
    `Hook: ${variation.hook}`,
    '',
    variation.primaryText,
    '',
    `Headline: ${variation.headline}`,
    `CTA: ${variation.cta}`,
    '',
    `Short: ${variation.shortVersion}`,
    '',
    `Long: ${variation.longVersion}`,
  ].join('\n');
}

function AdResult({ ads }: { ads: AdGeneration }) {
  const first = ads.platforms[0]?.platform ?? 'FACEBOOK';

  return (
    <Tabs defaultValue={first}>
      <TabsList>
        {ads.platforms.map((platform) => (
          <TabsTrigger key={platform.platform} value={platform.platform}>
            {PLATFORM_LABEL[platform.platform] ?? platform.platform}
          </TabsTrigger>
        ))}
      </TabsList>

      {ads.platforms.map((platform) => (
        <TabsContent key={platform.platform} value={platform.platform} className="space-y-4">
          <p className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-fg-muted">{platform.guidance}</p>

          {platform.variations.map((variation, index) => (
            <Card key={`${platform.platform}-${index}`}>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Variation {index + 1}</CardTitle>
                  <Badge variant="brand" className="mt-2">
                    {variation.angle}
                  </Badge>
                </div>
                <CopyButton value={variationText(variation)} label="Copy variation" />
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    { label: 'Hook', value: variation.hook },
                    { label: 'Primary text', value: variation.primaryText },
                    { label: 'Headline', value: variation.headline },
                    { label: 'Call to action', value: variation.cta },
                    { label: 'Short version', value: variation.shortVersion },
                    { label: 'Long version', value: variation.longVersion },
                  ] as const
                ).map((field) => (
                  <div key={field.label} className="rounded-lg bg-surface-muted p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs uppercase tracking-wide text-fg-subtle">{field.label}</p>
                      <CopyButton value={field.value} showLabel={false} variant="ghost" size="icon" />
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-fg">{field.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function AdTool({
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
  const [platforms, setPlatforms] = React.useState<string[]>(['FACEBOOK', 'TIKTOK']);

  function toggle(value: string) {
    setPlatforms((current) =>
      current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value],
    );
  }

  return (
    <ToolForm<AdGeneration>
      endpoint="/api/ads/generate"
      submitLabel="Generate ad copy"
      creditCost={2}
      products={products}
      defaultProductId={defaultProductId}
      defaultName={defaultName}
      locked={locked}
      buildBody={(form) => ({
        productId: String(form.get('productId') ?? '') || undefined,
        productName: String(form.get('productName') ?? ''),
        platforms,
        audience: String(form.get('audience') ?? '') || undefined,
        angle: String(form.get('angle') ?? '') || undefined,
        notes: String(form.get('notes') ?? '') || undefined,
      })}
      renderResult={(ads) => <AdResult ads={ads} />}
      emptyState={
        <EmptyState
          icon={Megaphone}
          title="No ad copy generated yet"
          description="Pick your platforms and generate multiple angles per platform, each with a hook, primary text, headline and CTA."
        />
      }
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-fg">Platforms *</legend>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map((platform) => {
            const checked = platforms.includes(platform.value);
            return (
              <label
                key={platform.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hairline ${
                  checked ? 'bg-accent text-accent-fg' : 'bg-surface text-fg-muted hover:bg-surface-muted'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggle(platform.value)}
                />
                {platform.label}
              </label>
            );
          })}
        </div>
        {platforms.length === 0 && (
          <p className="text-xs text-score-avoid" role="alert">
            Choose at least one platform.
          </p>
        )}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="audience">Target audience</Label>
        <Input id="audience" name="audience" maxLength={200} placeholder="e.g. Parents of toddlers" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="angle">Preferred angle</Label>
        <Input id="angle" name="angle" maxLength={200} placeholder="e.g. Time saved on a daily chore" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Product details</Label>
        <Textarea id="notes" name="notes" rows={4} maxLength={4000} placeholder="Offer, guarantee, price point, anything the copy should mention." />
      </div>
    </ToolForm>
  );
}
