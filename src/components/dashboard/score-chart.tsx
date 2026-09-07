'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type ScorePoint = { label: string; score: number };

/**
 * Compact trend of recent product scores. Purely a view of the user's own
 * analysis history — it is not market data.
 */
export function ScoreChart({ data }: { data: ScorePoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-surface-muted text-sm text-fg-muted">
        Analyse at least two products to see your scoring trend.
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3663f6" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#3663f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-line" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-fg-subtle"
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-fg-subtle"
            width={34}
          />
          <Tooltip
            cursor={{ stroke: '#3663f6', strokeWidth: 1, strokeDasharray: '4 4' }}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              fontSize: 12,
              color: 'var(--fg)',
            }}
            formatter={(value) => [`${value}/100`, 'Score']}
          />
          <Area type="monotone" dataKey="score" stroke="#3663f6" strokeWidth={2} fill="url(#scoreFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
