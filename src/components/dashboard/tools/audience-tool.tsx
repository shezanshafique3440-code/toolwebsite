'use client';

import { Users } from 'lucide-react';
import { ToolForm, type ProductOption } from '@/components/dashboard/tool-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EstimateBadge } from '@/components/ui/estimate-label';
import type { AudienceAnalysis } from '@/lib/ai/schemas';

function List({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{title}</p>
      <ul className="mt-2.5 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-fg-muted">
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${tone}`} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AudienceResult({ audience }: { audience: AudienceAnalysis }) {
  const personaText = [
    `${audience.persona.name}, ${audience.persona.age} — ${audience.persona.occupation}, ${audience.persona.location}`,
    '',
    audience.persona.quote,
    '',
    audience.persona.bio,
    '',
    `Goals: ${audience.persona.goals.join('; ')}`,
    `Frustrations: ${audience.persona.frustrations.join('; ')}`,
    `Shopping behaviour: ${audience.persona.shoppingBehaviour}`,
    `Channels: ${audience.persona.preferredChannels.join(', ')}`,
  ].join('\n');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Customer persona</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">A specific person to write copy against.</p>
          </div>
          <CopyButton value={personaText} label="Copy persona" />
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-surface-muted p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-fg">
                {audience.persona.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="text-lg font-semibold tracking-tight">{audience.persona.name}</p>
                <p className="text-sm text-fg-muted">
                  {audience.persona.age} · {audience.persona.occupation} · {audience.persona.location}
                </p>
              </div>
            </div>

            <blockquote className="mt-5 border-l-2 border-line-strong pl-4 text-sm italic leading-relaxed text-fg">
              {audience.persona.quote}
            </blockquote>

            <p className="mt-4 text-sm leading-relaxed text-fg-muted">{audience.persona.bio}</p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <List title="Goals" items={audience.persona.goals} tone="bg-score-strong" />
              <List title="Frustrations" items={audience.persona.frustrations} tone="bg-score-risky" />
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Shopping behaviour</p>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{audience.persona.shoppingBehaviour}</p>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Preferred channels</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {audience.persona.preferredChannels.map((channel) => (
                  <Badge key={channel} variant="neutral">
                    {channel}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <CardTitle>Audience profile</CardTitle>
          <EstimateBadge />
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              { term: 'Age range', description: audience.ageRange },
              { term: 'Gender', description: audience.gender },
              { term: 'Location', description: audience.location },
            ].map((item) => (
              <div key={item.term}>
                <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{item.term}</dt>
                <dd className="mt-1 text-sm text-fg">{item.description}</dd>
              </div>
            ))}
          </dl>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Interests</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {audience.interests.map((interest) => (
                <Badge key={interest} variant="neutral">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <List title="Problems" items={audience.problems} tone="bg-score-risky" />
            <List title="Buying motivations" items={audience.buyingMotivations} tone="bg-score-strong" />
            <List title="Objections" items={audience.objections} tone="bg-score-avoid" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Desired outcome</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{audience.desiredOutcome}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AudienceTool({
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
    <ToolForm<AudienceAnalysis>
      endpoint="/api/audience/generate"
      submitLabel="Build audience"
      creditCost={1}
      products={products}
      defaultProductId={defaultProductId}
      defaultName={defaultName}
      locked={locked}
      buildBody={(form) => ({
        productId: String(form.get('productId') ?? '') || undefined,
        productName: String(form.get('productName') ?? ''),
        category: String(form.get('category') ?? '') || undefined,
        notes: String(form.get('notes') ?? '') || undefined,
      })}
      renderResult={(audience) => <AudienceResult audience={audience} />}
      emptyState={
        <EmptyState
          icon={Users}
          title="No audience profile yet"
          description="Generate the demographics, motivations and objections behind the purchase, plus a persona card you can write ads against."
        />
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" maxLength={80} placeholder="e.g. Pet supplies" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Product details</Label>
        <Textarea id="notes" name="notes" rows={5} maxLength={4000} placeholder="Who you think buys this, and anything you already know about them." />
      </div>
    </ToolForm>
  );
}
