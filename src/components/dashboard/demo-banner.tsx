import { FlaskConical } from 'lucide-react';

/**
 * Shown whenever the app is running without an AI provider key. Generated
 * content is real output from the offline demo provider, and it is never
 * presented as though a model produced it.
 */
export function DemoModeBanner() {
  return (
    <div className="flex items-start gap-3 rounded-card border border-score-potential/30 bg-score-potential/[0.06] px-4 py-3.5">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-score-potential" aria-hidden />
      <div className="text-sm">
        <p className="font-medium text-fg">Demo mode</p>
        <p className="mt-0.5 leading-relaxed text-fg-muted">
          No AI provider key is configured, so analyses return clearly-labelled sample output rather than model
          results. Set <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">ANTHROPIC_API_KEY</code> or{' '}
          <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">OPENAI_API_KEY</code> on the server to enable
          real analysis.
        </p>
      </div>
    </div>
  );
}

export function SampleDataNotice({ className }: { className?: string }) {
  return (
    <p className={className}>
      <span className="font-medium text-score-potential">Sample output</span>
      <span className="text-fg-muted">
        {' '}
        — generated in demo mode without a connected AI provider.
      </span>
    </p>
  );
}
