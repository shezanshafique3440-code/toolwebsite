import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-surface-muted text-fg-muted hairline',
        brand: 'bg-brand-50 text-brand-700 border border-brand-100',
        strong: 'bg-score-strong/10 text-score-strong border border-score-strong/25',
        potential:
          'bg-score-potential/10 text-score-potential border border-score-potential/25',
        risky: 'bg-score-risky/10 text-score-risky border border-score-risky/25',
        avoid: 'bg-score-avoid/10 text-score-avoid border border-score-avoid/25',
        outline: 'hairline text-fg-muted',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
