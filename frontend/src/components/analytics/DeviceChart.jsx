import React from 'react';
import { Smartphone, Monitor, Tablet, Bot, HelpCircle } from 'lucide-react';
import { Card, CardHeader } from '../common/Card.jsx';

export function DeviceChart({ devices = [] }) {
  const getDeviceIcon = (name = '') => {
    switch (name.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-emerald-500" />;
      case 'desktop':
        return <Monitor className="w-4 h-4 text-brand-500" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-amber-500" />;
      case 'bot':
        return <Bot className="w-4 h-4 text-rose-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getDeviceBarColor = (name = '') => {
    switch (name.toLowerCase()) {
      case 'mobile':
        return 'bg-emerald-500';
      case 'desktop':
        return 'bg-brand-500';
      case 'tablet':
        return 'bg-amber-500';
      case 'bot':
        return 'bg-rose-500';
      default:
        return 'bg-zinc-500';
    }
  };

  const total = devices.reduce((sum, d) => sum + (d.count || 0), 0);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Device Breakdown"
        subtitle={total > 0 ? `${total} real visits classified` : 'Awaiting first visit'}
      />

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 dark:text-zinc-500">
          <Monitor className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-xs font-semibold">No device visits recorded yet</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Test visiting from phone or desktop to track real devices</p>
        </div>
      ) : (
        <div className="space-y-4 my-auto pt-2">
          {devices.map((device) => {
            const pct = total > 0 ? Math.round((device.count / total) * 100) : 0;
            return (
              <div key={device.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                    {getDeviceIcon(device.name)}
                    <span>{device.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 dark:text-zinc-500 font-medium">{device.count}</span>
                    <span className="font-bold text-zinc-900 dark:text-white w-9 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getDeviceBarColor(device.name)}`}
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
