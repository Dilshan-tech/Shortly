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
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <Compass className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs">No browser data available</p>
        </div>
      ) : (
        <div className="space-y-3.5 my-auto pt-2">
          {browsers.slice(0, 5).map((browser) => {
            const pct = total > 0 ? Math.round((browser.count / total) * 100) : 0;
            return (
              <div key={browser.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Globe className="w-3.5 h-3.5 text-brand-400" />
                    <span>{browser.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{browser.count}</span>
                    <span className="font-semibold text-slate-200 w-9 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-600 to-violet-500 transition-all duration-500"
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
