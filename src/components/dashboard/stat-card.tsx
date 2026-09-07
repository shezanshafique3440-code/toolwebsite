import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  accentClassName,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  accentClassName?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
        {Icon ? <Icon className="size-4 text-fg-subtle" /> : href ? <ArrowUpRight className="size-4 text-fg-subtle" /> : null}
      </div>
      <p className={cn('mt-3 text-2xl font-semibold tracking-tight tabular-nums', accentClassName)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>}
    </>
  );

  const className = 'rounded-card bg-surface p-5 hairline shadow-subtle';

  if (href) {
    return (
      <Link href={href} className={cn(className, 'block transition-colors hover:border-line-strong')}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
