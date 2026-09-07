'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import { cn, formatCurrency } from '@/lib/utils';

export function PricingTable({
  currentPlan,
  onSelect,
  busyPlan,
  disabled,
}: {
  currentPlan?: string;
  /** When omitted the table is marketing-only and links to signup. */
  onSelect?: (plan: 'FREE' | 'PRO' | 'BUSINESS') => void;
  busyPlan?: string | null;
  disabled?: boolean;
}) {

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const price = plan.monthlyPrice;
          const isCurrent = currentPlan === id;

          return (
            <div
              key={id}
              className={cn(
                'relative flex flex-col rounded-card bg-surface p-6 shadow-subtle hairline',
                plan.highlighted && 'border-2 border-accent shadow-raised',
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-accent-fg">
                  Most popular
                </span>
              )}

              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold">{plan.name}</h3>
                {isCurrent && <Badge variant="brand">Current plan</Badge>}
              </div>
              <p className="mt-1.5 text-sm text-fg-muted">{plan.tagline}</p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">
                  {price === 0 ? 'Free' : formatCurrency(price, 'USD', price % 1 === 0 ? 0 : 2)}
                </span>
                {price > 0 && <span className="text-sm text-fg-muted">/ month</span>}
              </div>
              <p className="mt-1.5 h-5 text-xs text-fg-subtle">
                {plan.monthlyPrice > 0 ? 'Billed monthly, cancel any time' : 'No card required'}
              </p>

              {onSelect ? (
                <Button
                  className="mt-6 w-full"
                  variant={plan.highlighted ? 'primary' : 'secondary'}
                  // The current plan and Free are never checkout targets.
                  disabled={isCurrent || id === 'FREE' || disabled}
                  loading={busyPlan === id}
                  onClick={() => onSelect(id)}
                >
                  {isCurrent ? 'Current Plan' : id === 'FREE' ? 'Included' : plan.cta}
                </Button>
              ) : (
                <Button asChild className="mt-6 w-full" variant={plan.highlighted ? 'primary' : 'secondary'}>
                  <Link href="/signup">{plan.cta}</Link>
                </Button>
              )}

              <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-sm text-fg-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-score-strong" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
                {plan.limitations?.map((limitation) => (
                  <li key={limitation} className="flex gap-2.5 text-sm text-fg-subtle">
                    <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
