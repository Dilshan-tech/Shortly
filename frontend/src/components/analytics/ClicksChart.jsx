import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Card, CardHeader } from '../common/Card.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#111115]/95 border border-white/10 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-xl">
        <p className="font-bold text-zinc-200">{data.label || label || data.date}</p>
        <div className="flex items-center gap-2 text-brand-400 font-extrabold text-sm">
          <span className="w-2 h-2 rounded-full bg-brand-500 inline-block shadow-sm shadow-brand-500/60" />
          <span>{data.clicks} total clicks</span>
        </div>
        {data.uniques !== undefined && (
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            <span>{data.uniques} unique visitors</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function ClicksChart({
  data = [],
  range = '7d',
  days = 7,
  onRangeChange,
  onDaysChange,
  title = 'Clicks & Visitors Trend'
}) {
  const { isDark } = useTheme();
  const currentRange = range || (days ? `${days}d` : '7d');

  const formattedData = (data || []).map((item) => {
    let displayDate = item.label || item.date;
    if (!item.label && item.date) {
      if (item.date.includes('T')) {
        try {
          const d = new Date(item.date);
          displayDate = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        } catch {
          displayDate = item.date;
        }
      } else {
        try {
          const parts = item.date.split('-');
          if (parts.length === 3) {
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
        } catch {
          displayDate = item.date;
        }
      }
    }
    return {
      ...item,
      displayDate
    };
  });

  const totalPeriodClicks = formattedData.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
  const totalPeriodUniques = formattedData.reduce((acc, curr) => acc + (curr.uniques || 0), 0);

  const handleSelect = (r) => {
    if (onRangeChange) {
      onRangeChange(r);
    } else if (onDaysChange) {
      const num = parseInt(r, 10);
      onDaysChange(num || 7);
    }
  };

  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const axisColor = isDark ? '#71717a' : '#a1a1aa';

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        subtitle={`${totalPeriodClicks} clicks (${totalPeriodUniques} uniques) in period`}
        action={
          (onRangeChange || onDaysChange) && (
            <div className="flex items-center bg-zinc-100 dark:bg-black/50 p-0.5 rounded-xl border border-zinc-200/80 dark:border-white/[0.06] text-xs gap-0.5 shadow-inner">
              {[
                { key: '24h', label: '24h' },
                { key: '7d', label: '7d' },
                { key: '30d', label: '30d' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                    currentRange === key
                      ? 'bg-white dark:bg-[#18181f] text-zinc-900 dark:text-white font-bold shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-semibold'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )
        }
      />

      <div className="h-64 sm:h-72 w-full mt-2">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-xs sm:text-sm font-medium">
            No clicks recorded in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#635bff" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#635bff" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="uniquesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="clicks"
                name="Total Clicks"
                stroke="#635bff"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#clicksGrad)"
              />
              <Area
                type="monotone"
                dataKey="uniques"
                name="Unique Visitors"
                stroke="#06b6d4"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#uniquesGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
