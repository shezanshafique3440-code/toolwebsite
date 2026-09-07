'use client';

import { FileText } from 'lucide-react';
import { ToolForm, type ProductOption } from '@/components/dashboard/tool-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { ListingGeneration } from '@/lib/ai/schemas';

function Section({
  title,
  copyValue,
  hint,
  children,
}: {
  title: string;
  copyValue: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {hint && <p className="mt-1 text-sm text-fg-muted">{hint}</p>}
        </div>
        <CopyButton value={copyValue} />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ListingResult({ listing }: { listing: ListingGeneration }) {
  const everything = [
    listing.title,
    '',
    listing.shortDescription,
    '',
    listing.longDescription,
    '',
    ...listing.bulletPoints.map((point) => `• ${point}`),
    '',
    `Meta title: ${listing.metaTitle}`,
    `Meta description: ${listing.metaDescription}`,
  ].join('\n');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CopyButton value={everything} label="Copy everything" />
      </div>

      <Section title="Product title" copyValue={listing.title}>
        <p className="text-sm font-medium leading-relaxed">{listing.title}</p>
        <p className="mt-2 text-xs text-fg-subtle">{listing.title.length} characters</p>
      </Section>

      <Section title="Short description" copyValue={listing.shortDescription}>
        <p className="text-sm leading-relaxed text-fg-muted">{listing.shortDescription}</p>
      </Section>

      <Section title="Long description" copyValue={listing.longDescription}>
        <div className="space-y-3">
          {listing.longDescription.split('\n').filter(Boolean).map((paragraph, index) => (
            <p key={index} className="text-sm leading-relaxed text-fg-muted">
              {paragraph}
            </p>
          ))}
        </div>
      </Section>

      <Section title="Bullet points" copyValue={listing.bulletPoints.map((point) => `• ${point}`).join('\n')}>
        <ul className="space-y-2">
          {listing.bulletPoints.map((point) => (
            <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-fg-muted">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Benefits" copyValue={listing.benefits.join('\n')}>
          <ul className="space-y-2">
            {listing.benefits.map((benefit) => (
              <li key={benefit} className="text-sm leading-relaxed text-fg-muted">
                {benefit}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Features" copyValue={listing.features.join('\n')}>
          <ul className="space-y-2">
            {listing.features.map((feature) => (
              <li key={feature} className="text-sm leading-relaxed text-fg-muted">
                {feature}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section
        title="FAQ"
        copyValue={listing.faq.map((item) => `${item.question}\n${item.answer}`).join('\n\n')}
      >
        <dl className="space-y-4">
          {listing.faq.map((item) => (
            <div key={item.question}>
              <dt className="text-sm font-medium">{item.question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-fg-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section
        title="Meta tags"
        hint="Search-result snippet."
        copyValue={`${listing.metaTitle}\n${listing.metaDescription}`}
      >
        <div className="space-y-4">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-fg-subtle">
              Meta title
              <Badge variant={listing.metaTitle.length <= 60 ? 'strong' : 'potential'}>
                {listing.metaTitle.length} / 60
              </Badge>
            </p>
            <p className="mt-1.5 text-sm">{listing.metaTitle}</p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-fg-subtle">
              Meta description
              <Badge variant={listing.metaDescription.length <= 155 ? 'strong' : 'potential'}>
                {listing.metaDescription.length} / 155
              </Badge>
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{listing.metaDescription}</p>
          </div>
        </div>
      </Section>

      <Section title="Image alt text" copyValue={listing.imageAltTexts.join('\n')}>
        <ol className="space-y-2">
          {listing.imageAltTexts.map((alt, index) => (
            <li key={alt} className="flex gap-3 text-sm leading-relaxed text-fg-muted">
              <span className="text-fg-subtle">{index + 1}.</span>
              {alt}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

export function ListingTool({
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
  return (
    <ToolForm<ListingGeneration>
      endpoint="/api/listing/generate"
      submitLabel="Generate listing"
      creditCost={2}
      products={products}
      defaultProductId={defaultProductId}
      defaultName={defaultName}
      locked={locked}
      buildBody={(form) => ({
        productId: String(form.get('productId') ?? '') || undefined,
        productName: String(form.get('productName') ?? ''),
        category: String(form.get('category') ?? '') || undefined,
        audience: String(form.get('audience') ?? '') || undefined,
        tone: String(form.get('tone') ?? 'Professional'),
        notes: String(form.get('notes') ?? '') || undefined,
      })}
      renderResult={(listing) => <ListingResult listing={listing} />}
      emptyState={
        <EmptyState
          icon={FileText}
          title="No listing generated yet"
          description="Generate a full product listing: title, descriptions, bullets, benefits, features, FAQ, meta tags and image alt text."
        />
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="tone">Tone</Label>
        <Select id="tone" name="tone" defaultValue="Professional">
          {['Professional', 'Friendly', 'Premium', 'Playful', 'Technical'].map((tone) => (
            <option key={tone} value={tone}>
              {tone}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" maxLength={80} placeholder="e.g. Kitchen appliances" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="audience">Target audience</Label>
        <Input id="audience" name="audience" maxLength={200} placeholder="e.g. Busy parents in small apartments" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Product details</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={5}
          maxLength={4000}
          placeholder="Specifications, materials, what is in the box — anything the copy should reflect."
        />
      </div>
    </ToolForm>
  );
}
