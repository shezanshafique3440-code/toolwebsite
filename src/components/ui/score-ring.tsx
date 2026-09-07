import { cn } from '@/lib/utils';
import { scoreBand, scoreColor, VERDICT_LABELS } from '@/lib/scoring';

/**
 * Circular score visualisation. Pure SVG (no chart library) so it renders on the
 * server and costs nothing on first paint.
 */
export function ScoreRing({
  score,
  size = 168,
  strokeWidth = 12,
  label = 'Product score',
  showVerdict = true,
  className,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showVerdict?: boolean;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  const color = scoreColor(clamped);
  const band = scoreBand(clamped);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${clamped} out of 100 — ${VERDICT_LABELS[band]}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-line"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[2.1rem] font-semibold leading-none tabular-nums tracking-tight" style={{ color }}>
          {clamped}
        </span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">/ 100</span>
        {showVerdict && (
          <span className="mt-1.5 max-w-[7rem] text-center text-[11px] font-medium leading-tight text-fg-muted">
            {VERDICT_LABELS[band]}
          </span>
        )}
      </div>
    </div>
  );
}

/** Horizontal score bar for the four sub-metrics. */
export function ScoreBar({
  label,
  score,
  hint,
  className,
}: {
  label: string;
  score: number;
  hint?: React.ReactNode;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm text-fg-muted">
          {label}
          {hint}
        </span>
        <span className="text-sm font-semibold tabular-nums text-fg">{clamped}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: scoreColor(clamped) }}
        />
      </div>
    </div>
  );
}
