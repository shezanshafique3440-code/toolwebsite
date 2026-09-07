'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { ScorePoint } from '@/components/dashboard/score-chart';

/**
 * Recharts is the heaviest dependency in the dashboard bundle, and the chart is
 * below the fold — load it only once the page is interactive.
 */
const ScoreChart = dynamic(() => import('@/components/dashboard/score-chart').then((mod) => mod.ScoreChart), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full rounded-lg" />,
});

export function LazyScoreChart({ data }: { data: ScorePoint[] }) {
  return <ScoreChart data={data} />;
}
