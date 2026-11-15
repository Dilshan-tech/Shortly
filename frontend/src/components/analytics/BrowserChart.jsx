import React from 'react';
import { Compass, Globe } from 'lucide-react';
import { Card, CardHeader } from '../common/Card.jsx';

export function BrowserChart({ browsers = [] }) {
  const total = browsers.reduce((sum, b) => sum + (b.count || 0), 0);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Top Browsers"
        subtitle={total > 0 ? `${browsers.length} browser clients identified` : 'Awaiting visits'}
      />

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 dark:text-zinc-500">
          <Compass className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-xs font-semibold">No browser data available</p>
        </div>
      ) : (
        <div className="space-y-3.5 my-auto pt-2">
          {browsers.slice(0, 5).map((browser) => {
            const pct = total > 0 ? Math.round((browser.count / total) * 100) : 0;
            return (
              <div key={browser.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                    <Globe className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <span>{browser.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 font-medium">{browser.count}</span>
                    <span className="font-bold text-zinc-900 dark:text-white w-9 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
