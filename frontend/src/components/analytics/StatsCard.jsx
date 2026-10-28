import React from 'react';
import { Card } from '../common/Card.jsx';
import { formatNumber } from '../../utils/formatters.js';

export function StatsCard({ title, value, icon: Icon, subtext, trend, iconColor = 'text-brand-400', iconBg = 'bg-brand-500/10 border-brand-500/20' }) {
  return (
    <Card hover className="relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">{title}</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {typeof value === 'number' ? formatNumber(value) : value}
            </h4>
            {trend && (
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {trend}
              </span>
            )}
          </div>
          {subtext && <p className="text-xs text-slate-400 pt-0.5">{subtext}</p>}
        </div>

        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${iconBg} ${iconColor} shadow-inner`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}
