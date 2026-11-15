import React from 'react';
import { Smartphone, Monitor, Tablet, Bot, Activity } from 'lucide-react';
import { Card, CardHeader } from '../common/Card.jsx';
import { formatTimeAgo } from '../../utils/formatters.js';

export function RecentClicksList({ clicks = [] }) {
  const getDeviceIcon = (deviceCategory = '') => {
    switch (deviceCategory.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 text-emerald-500" />;
      case 'desktop':
        return <Monitor className="w-3.5 h-3.5 text-brand-500" />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5 text-amber-500" />;
      case 'bot':
        return <Bot className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Monitor className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Live Click Activity"
        subtitle="Recent visitor events across your links"
      />

      {clicks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400 dark:text-zinc-500">
          <Activity className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2 animate-pulse" />
          <p className="text-xs font-semibold">No click events recorded yet</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Visits will appear here in real-time</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.06] overflow-x-auto">
          {clicks.map((event) => (
            <div
              key={event.id}
              className="py-3 flex items-center justify-between gap-4 text-xs first:pt-1 last:pb-1"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-center shrink-0">
                  {getDeviceIcon(event.deviceCategory)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {event.browser} {event.browserVersion || ''}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                      on {event.os || 'Unknown OS'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span>via {event.referrer || 'Direct'}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(event.timestamp)}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-brand-600 dark:text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/25">
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
