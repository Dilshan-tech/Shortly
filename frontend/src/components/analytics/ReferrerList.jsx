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
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <Compass className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs">No referral traffic recorded yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80 my-auto">
          {referrers.slice(0, 5).map((ref) => {
            const pct = total > 0 ? Math.round((ref.count / total) * 100) : 0;
            return (
              <div key={ref.name} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>{ref.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{ref.count} clicks</span>
                  <span className="text-xs font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
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
