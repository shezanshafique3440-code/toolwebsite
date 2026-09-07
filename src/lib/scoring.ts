export const VERDICTS = ['STRONG', 'POTENTIAL', 'RISKY', 'AVOID'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const VERDICT_LABELS: Record<Verdict, string> = {
  STRONG: 'Strong Product',
  POTENTIAL: 'Potential Product',
  RISKY: 'Risky Product',
  AVOID: 'Avoid',
};

export const VERDICT_BADGE: Record<Verdict, 'strong' | 'potential' | 'risky' | 'avoid'> = {
  STRONG: 'strong',
  POTENTIAL: 'potential',
  RISKY: 'risky',
  AVOID: 'avoid',
};

export const VERDICT_HEX: Record<Verdict, string> = {
  STRONG: '#0f9d58',
  POTENTIAL: '#c98a00',
  RISKY: '#e2620f',
  AVOID: '#d33b3b',
};

/** Score band → colour, used by rings, bars, charts and the PDF export alike. */
export function scoreBand(score: number): Verdict {
  if (score >= 75) return 'STRONG';
  if (score >= 60) return 'POTENTIAL';
  if (score >= 45) return 'RISKY';
  return 'AVOID';
}

export function scoreColor(score: number) {
  return VERDICT_HEX[scoreBand(score)];
}

export function scoreTextClass(score: number) {
  const band = scoreBand(score);
  return {
    STRONG: 'text-score-strong',
    POTENTIAL: 'text-score-potential',
    RISKY: 'text-score-risky',
    AVOID: 'text-score-avoid',
  }[band];
}

export function scoreBgClass(score: number) {
  const band = scoreBand(score);
  return {
    STRONG: 'bg-score-strong',
    POTENTIAL: 'bg-score-potential',
    RISKY: 'bg-score-risky',
    AVOID: 'bg-score-avoid',
  }[band];
}

export const SCORE_DEFINITIONS = {
  demand: 'How much evident buyer interest the product concept appears to attract.',
  competition:
    'How favourable the competitive landscape looks. Higher is better: a high score means less crowding.',
  profit: 'Headroom between a realistic sourcing cost and a realistic retail price.',
  viral: 'How well the product lends itself to short-form video and social sharing.',
} as const;

/**
 * Weighted overall score. Kept server-side and recomputed from the sub-scores so
 * a model cannot report an overall figure that contradicts its own breakdown.
 */
export function computeOverallScore(input: {
  demandScore: number;
  competitionScore: number;
  profitScore: number;
  viralScore: number;
}) {
  const weighted =
    input.demandScore * 0.32 +
    input.competitionScore * 0.22 +
    input.profitScore * 0.28 +
    input.viralScore * 0.18;
  return Math.round(Math.min(100, Math.max(0, weighted)));
}
