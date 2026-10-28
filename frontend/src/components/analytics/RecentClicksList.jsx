import React from 'react';
import { Smartphone, Monitor, Tablet, Bot, Activity, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader } from '../common/Card.jsx';
import { formatTimeAgo } from '../../utils/formatters.js';

export function RecentClicksList({ clicks = [] }) {
  const getDeviceIcon = (deviceCategory = '') => {
    switch (deviceCategory.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
      case 'desktop':
        return <Monitor className="w-3.5 h-3.5 text-brand-400" />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5 text-amber-400" />;
      case 'bot':
        return <Bot className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Monitor className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Live Click Activity"
        subtitle="Recent visitor events across your links"
      />

      {clicks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <Activity className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
          <p className="text-xs">No click events recorded yet</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Visits will appear here in real-time</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80 overflow-x-auto">
          {clicks.map((event) => (
            <div
              key={event.id}
              className="py-3 flex items-center justify-between gap-4 text-xs first:pt-1 last:pb-1"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0">
                  {getDeviceIcon(event.deviceCategory)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">
                      {event.browser} {event.browserVersion || ''}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      on {event.os || 'Unknown OS'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>via {event.referrer || 'Direct'}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(event.timestamp)}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="inline-flex items-center gap-1 font-mono text-xs text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                  /{event.code}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
