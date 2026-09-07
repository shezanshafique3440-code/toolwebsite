import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { InfoHint } from '@/components/ui/tooltip';
import { AI_ESTIMATE_LABEL, AI_ESTIMATE_TOOLTIP } from '@/lib/constants';
import { cn } from '@/lib/utils';

/**
 * Marks every model-produced figure. The product deliberately never presents an
 * AI estimate as a measured market statistic.
 */
export function EstimateBadge({ className, hint = true }: { className?: string; hint?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Badge variant="brand">
        <Sparkles className="size-3" aria-hidden />
        {AI_ESTIMATE_LABEL}
      </Badge>
      {hint && <InfoHint label={AI_ESTIMATE_TOOLTIP} />}
    </span>
  );
}

export function DataSourceNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-xs leading-relaxed text-fg-subtle', className)}>{children}</p>
  );
}
