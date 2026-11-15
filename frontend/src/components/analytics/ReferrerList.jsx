import React from 'react';
import { ExternalLink, Compass } from 'lucide-react';
import { Card, CardHeader } from '../common/Card.jsx';

export function ReferrerList({ referrers = [] }) {
  const total = referrers.reduce((sum, r) => sum + (r.count || 0), 0);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Referrer Traffic"
        subtitle={total > 0 ? `${referrers.length} referral sources detected` : 'Awaiting clicks'}
      />

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 dark:text-zinc-500">
          <Compass className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-xs font-semibold">No referral traffic recorded yet</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.06] my-auto">
          {referrers.slice(0, 5).map((ref) => {
            const pct = total > 0 ? Math.round((ref.count / total) * 100) : 0;
            return (
              <div key={ref.name} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-semibold">
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span>{ref.name}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-zinc-400 dark:text-zinc-500 font-medium">{ref.count} clicks</span>
                  <span className="text-[11px] font-bold text-brand-600 dark:text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/25">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
