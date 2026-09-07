import { cn } from '@/lib/utils';

export function ReportSection({
  id,
  title,
  description,
  aside,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn('scroll-mt-24 rounded-card bg-surface p-5 hairline shadow-subtle sm:p-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function DefinitionList({ items }: { items: Array<{ term: string; description: React.ReactNode }> }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.term}>
          <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{item.term}</dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-fg">{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BulletList({
  items,
  tone = 'neutral',
}: {
  items: string[];
  tone?: 'neutral' | 'positive' | 'negative' | 'opportunity' | 'risk';
}) {
  const dot = {
    neutral: 'bg-line-strong',
    positive: 'bg-score-strong',
    negative: 'bg-score-risky',
    opportunity: 'bg-brand-500',
    risk: 'bg-score-avoid',
  }[tone];

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-fg-muted">
          <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', dot)} aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
