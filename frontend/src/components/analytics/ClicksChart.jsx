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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-xl text-xs space-y-1 backdrop-blur-md">
        <p className="font-semibold text-slate-200">{label}</p>
        <div className="flex items-center gap-2 text-brand-400 font-bold text-sm">
          <span>{data.clicks} total clicks</span>
        </div>
        {data.uniques !== undefined && (
          <p className="text-slate-400">{data.uniques} unique visitors</p>
        )}
      </div>
    );
  }
  return null;
};

export function ClicksChart({ data = [], days = 7, onDaysChange, title = 'Clicks Over Time' }) {
  // Format dates for XAxis (e.g., "Oct 24")
  const formattedData = (data || []).map((item) => {
    let displayDate = item.date;
    try {
      const parts = item.date.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch {
      displayDate = item.date;
    }
    return {
      ...item,
      displayDate
    };
  });

  const totalPeriodClicks = formattedData.reduce((acc, curr) => acc + (curr.clicks || 0), 0);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        subtitle={`${totalPeriodClicks} recorded in selected period`}
        action={
          onDaysChange && (
            <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => onDaysChange(d)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    days === d
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          )
        }
      />

      <div className="h-64 w-full mt-2">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No clicks recorded in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="displayDate"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#6366f1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#clicksGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
