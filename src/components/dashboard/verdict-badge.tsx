import { Badge } from '@/components/ui/badge';
import { VERDICT_BADGE, VERDICT_LABELS, type Verdict } from '@/lib/scoring';

export function VerdictBadge({ verdict }: { verdict: Verdict | string }) {
  const key = (VERDICTS_SET.has(verdict as Verdict) ? verdict : 'POTENTIAL') as Verdict;
  return <Badge variant={VERDICT_BADGE[key]}>{VERDICT_LABELS[key]}</Badge>;
}

const VERDICTS_SET = new Set<Verdict>(['STRONG', 'POTENTIAL', 'RISKY', 'AVOID']);
