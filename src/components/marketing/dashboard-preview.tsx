import { ArrowUpRight, Sparkles } from 'lucide-react';
import { ScoreRing, ScoreBar } from '@/components/ui/score-ring';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const SAMPLE_ROWS = [
  { name: 'Portable Blender', score: 84, verdict: 'Strong' as const },
  { name: 'Mini Projector', score: 71, verdict: 'Potential' as const },
  { name: 'LED Car Vacuum', score: 58, verdict: 'Risky' as const },
];

const VERDICT_VARIANT = {
  Strong: 'strong',
  Potential: 'potential',
  Risky: 'risky',
} as const;

/**
 * Illustrative preview of the report screen used on the landing page. The
 * numbers are labelled as an example so nobody reads them as market data.
 */
export function DashboardPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-surface shadow-raised hairline',
        className,
      )}
      role="img"
      aria-label="Example ProductPilot AI report showing an overall score of 84 out of 100 with demand, competition, profit and viral sub-scores"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
        </div>
        <span className="rounded-md bg-surface-muted px-2.5 py-1 text-[11px] text-fg-subtle">
          Example report — illustration only
        </span>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
        <div className="flex flex-col items-center gap-3">
          <ScoreRing score={84} size={132} strokeWidth={10} showVerdict={false} label="Example product score" />
          <Badge variant="strong">Strong Product</Badge>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">Portable Blender</h3>
            <Badge variant="brand">
              <Sparkles className="size-3" aria-hidden />
              AI estimate
            </Badge>
          </div>
          <p className="mt-1 text-sm text-fg-muted">Kitchen appliances · analysed in 38 seconds</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ScoreBar label="Demand" score={91} />
            <ScoreBar label="Competition" score={63} />
            <ScoreBar label="Profit potential" score={88} />
            <ScoreBar label="Viral potential" score={94} />
          </div>
        </div>
      </div>

      <div className="border-t border-line px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Recent analyses</p>
          <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
            View all <ArrowUpRight className="size-3" aria-hidden />
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {SAMPLE_ROWS.map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2.5">
              <span className="truncate text-sm text-fg">{row.name}</span>
              <span className="flex shrink-0 items-center gap-3">
                <Badge variant={VERDICT_VARIANT[row.verdict]}>{row.verdict}</Badge>
                <span className="w-8 text-right text-sm font-semibold tabular-nums">{row.score}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
