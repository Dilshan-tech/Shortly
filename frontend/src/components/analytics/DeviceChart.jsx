import React from 'react';
import { Smartphone, Monitor, Tablet, Bot, HelpCircle } from 'lucide-react';
import { Card, CardHeader } from '../common/Card.jsx';

export function DeviceChart({ devices = [] }) {
  const getDeviceIcon = (name = '') => {
    switch (name.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'desktop':
        return <Monitor className="w-4 h-4 text-brand-400" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-amber-400" />;
      case 'bot':
        return <Bot className="w-4 h-4 text-rose-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400" />;
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
        return 'bg-slate-500';
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
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <Monitor className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs">No device visits recorded yet</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Test visiting from phone or desktop to track real devices</p>
        </div>
      ) : (
        <div className="space-y-4 my-auto pt-2">
          {devices.map((device) => {
            const pct = total > 0 ? Math.round((device.count / total) * 100) : 0;
            return (
              <div key={device.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    {getDeviceIcon(device.name)}
                    <span>{device.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{device.count}</span>
                    <span className="font-semibold text-slate-200 w-9 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
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
