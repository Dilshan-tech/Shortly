import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card } from '../common/Card.jsx';
import { formatNumber } from '../../utils/formatters.js';

export function StatsCard({
  title,
  value,
  icon: Icon,
  subtext,
  changePct = null,
  trendLabel = 'vs prev period',
  trend = null,
  iconColor = 'text-brand-600 dark:text-brand-400',
  iconBg = 'bg-brand-50 border-brand-200/80 dark:bg-brand-500/10 dark:border-brand-500/20'
}) {
  const renderTrend = () => {
    if (changePct !== null && changePct !== undefined) {
      const isPositive = changePct > 0;
      const isNegative = changePct < 0;
      const isNeutral = changePct === 0;

      return (
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              isPositive
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/25'
                : isNegative
                ? 'text-rose-700 bg-rose-50 border-rose-200/80 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/25'
                : 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            {isPositive && <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />}
            {isNegative && <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />}
            {isNeutral && <Minus className="w-3 h-3" />}
            {isPositive ? `+${changePct}%` : `${changePct}%`}
          </span>
          {trendLabel && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
              {trendLabel}
            </span>
          )}
        </div>
      );
    }

    if (trend) {
      return (
        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20 px-2 py-0.5 rounded-full mt-2">
          {trend}
        </span>
      );
    }

    return null;
  };

  return (
    <Card className="relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/[0.14] transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {typeof value === 'number' ? formatNumber(value) : value}
            </h4>
          </div>
          {renderTrend()}
          {subtext && <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">{subtext}</p>}
        </div>

        {Icon && (
          <div
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${iconBg} ${iconColor} shadow-xs ml-3 group-hover:scale-105 transition-transform duration-200`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
