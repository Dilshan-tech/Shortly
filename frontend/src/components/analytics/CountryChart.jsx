import React from 'react';
import { Globe, MapPin } from 'lucide-react';
import { Card, CardHeader } from '../common/Card.jsx';

const COUNTRY_NAMES = {
  US: 'United States',
  IN: 'India',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  CA: 'Canada',
  DE: 'Germany',
  FR: 'France',
  AU: 'Australia',
  JP: 'Japan',
  BR: 'Brazil',
  NL: 'Netherlands',
  SG: 'Singapore',
  Unknown: 'Unknown / Direct'
};

export function CountryChart({ countries = [] }) {
  const total = countries.reduce((sum, c) => sum + (c.count || 0), 0);

  const getCountryName = (code = '') => {
    return COUNTRY_NAMES[code] || code || 'Unknown';
  };

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Geographic Traffic"
        subtitle={total > 0 ? `${countries.length} locations detected` : 'Awaiting visits'}
      />

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 dark:text-zinc-500">
          <Globe className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-xs font-semibold">No geographic data recorded yet</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Visits through proxy/CDN headers will appear here</p>
        </div>
      ) : (
        <div className="space-y-3.5 my-auto pt-2">
          {countries.slice(0, 6).map((item) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{getCountryName(item.name)}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({item.name})</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-zinc-400 dark:text-zinc-500 font-medium">{item.count}</span>
                    <span className="font-bold text-zinc-900 dark:text-white w-9 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500"
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
