import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Link2,
  MousePointerClick,
  Calendar,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  QrCode,
  Plus,
  Download,
  Users,
  Shield,
  Bot,
  Activity,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { StatsCard } from '../components/analytics/StatsCard.jsx';
import { ClicksChart } from '../components/analytics/ClicksChart.jsx';
import { DeviceChart } from '../components/analytics/DeviceChart.jsx';
import { BrowserChart } from '../components/analytics/BrowserChart.jsx';
import { OsChart } from '../components/analytics/OsChart.jsx';
import { CountryChart } from '../components/analytics/CountryChart.jsx';
import { ReferrerList } from '../components/analytics/ReferrerList.jsx';
import { RecentClicksList } from '../components/analytics/RecentClicksList.jsx';
import { QrCodeModal } from '../components/urls/QrCodeModal.jsx';
import { Button } from '../components/common/Button.jsx';
import { CopyButton } from '../components/common/CopyButton.jsx';
import { Card, CardHeader } from '../components/common/Card.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { useToast } from '../components/common/ToastContext.jsx';
import {
  getSummary,
  getTimeseries,
  getDevices,
  getBrowsers,
  getOs,
  getCountries,
  getReferrers,
  downloadCsvExport
} from '../api/analytics.js';
import { extractErrorMessage } from '../api/client.js';
import { truncate, getShortUrl } from '../utils/formatters.js';

export function OverviewPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [autoPoll, setAutoPoll] = useState(false);

  // Filters
  const [range, setRange] = useState('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [includeBots, setIncludeBots] = useState(false);

  // Analytics data states
  const [summary, setSummary] = useState({
    totalLinks: 0,
    activeLinks: 0,
    totalClicks: 0,
    periodClicks: 0,
    previousClicks: 0,
    clicksToday: 0,
    uniqueVisitors: 0,
    previousUniques: 0,
    clicksChangePct: 0,
    uniquesChangePct: 0,
    topUrls: [],
    recentClicks: []
  });
  const [timeseries, setTimeseries] = useState([]);
  const [devices, setDevices] = useState([]);
  const [browsers, setBrowsers] = useState([]);
  const [osList, setOsList] = useState([]);
  const [countries, setCountries] = useState([]);
  const [referrers, setReferrers] = useState([]);

  // QR Modal state
  const [selectedQrUrl, setSelectedQrUrl] = useState(null);

  // Prevent overlapping poll requests
  const isFetchingRef = useRef(false);

  const fetchAnalytics = useCallback(
    async (isSilent = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (!isSilent) setRefreshing(true);

      const queryParams = {
        range,
        includeBots,
        ...(range === 'custom' && customStart && customEnd
          ? { startDate: customStart, endDate: customEnd }
          : {})
      };

      try {
        const [sumRes, timeRes, devRes, browRes, osRes, countryRes, refRes] = await Promise.all([
          getSummary(queryParams),
          getTimeseries(queryParams),
          getDevices(null, queryParams),
          getBrowsers(null, queryParams),
          getOs(null, queryParams),
          getCountries(null, queryParams),
          getReferrers(null, queryParams)
        ]);

        setSummary(sumRes.data);
        setTimeseries(timeRes.data);
        setDevices(devRes.data);
        setBrowsers(browRes.data);
        setOsList(osRes.data);
        setCountries(countryRes.data);
        setReferrers(refRes.data);
      } catch (err) {
        if (!isSilent) {
          toast.error(extractErrorMessage(err));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    [range, customStart, customEnd, includeBots, toast]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Safe auto-polling without request overlap
  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 8000); // 8-second gentle poll

    return () => clearInterval(interval);
  }, [autoPoll, fetchAnalytics]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsvExport(null, {
        range,
        includeBots,
        ...(range === 'custom' && customStart && customEnd
          ? { startDate: customStart, endDate: customEnd }
          : {})
      });
      toast.success('Global click analytics exported to CSV');
    } catch (err) {
      toast.error('Failed to export CSV: ' + extractErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Aggregating live analytics from MongoDB Atlas..." />;
  }

  const isFreshInstall = summary.totalLinks === 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Dashboard Overview
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time link activity, device distribution, and traffic patterns
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoPoll(!autoPoll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              autoPoll
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'bg-white dark:bg-[#0c0e16] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-xs'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoPoll ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            <span>Auto-poll (8s)</span>
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            isLoading={exporting}
            icon={Download}
          >
            Export CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchAnalytics(false)}
            isLoading={refreshing}
            icon={RefreshCw}
          >
            Refresh
          </Button>

          <Link to="/create">
            <Button variant="primary" size="sm" icon={Plus}>
              New Link
            </Button>
          </Link>
        </div>
      </div>

      {/* Date Filter & Traffic Scope Segmented Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/80 dark:bg-[#0c0e16]/80 p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-card dark:shadow-card-dark backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 ml-2 mr-1">
            <Calendar className="w-3.5 h-3.5 text-brand-500" /> Range:
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-[#07090f] p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.06] shadow-inner">
            {[
              { id: '24h', label: '24 Hours' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'custom', label: 'Custom' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setRange(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  range === item.id
                    ? 'bg-white dark:bg-[#151924] text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs */}
        {range === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-white dark:bg-[#07090f] border border-slate-200 dark:border-white/[0.09] rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-white dark:bg-[#07090f] border border-slate-200 dark:border-white/[0.09] rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
            />
            <Button
              size="xs"
              variant="secondary"
              onClick={() => fetchAnalytics(false)}
              disabled={!customStart || !customEnd}
            >
              Apply
            </Button>
          </div>
        )}

        {/* Bot Traffic Toggle */}
        <div className="flex items-center gap-2 md:ml-auto pr-1">
          <button
            onClick={() => setIncludeBots(!includeBots)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              includeBots
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
          >
            {includeBots ? <Bot className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
            <span>{includeBots ? 'Bots Included' : 'Human Traffic Only'}</span>
          </button>
        </div>
      </div>

      {/* Fresh Install Empty State */}
      {isFreshInstall ? (
        <EmptyState
          title="Welcome to Shortly"
          description="You don't have any shortened links yet. Create your first link with optional custom alias, expiry, or password protection to start seeing live analytics."
          actionLabel="Create Short Link"
          actionLink="/create"
        />
      ) : (
        <>
          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatsCard
              title="Period Clicks"
              value={summary.periodClicks}
              changePct={summary.clicksChangePct}
              trendLabel="vs prior period"
              icon={MousePointerClick}
              subtext="Redirects in period"
              iconColor="text-brand-600 dark:text-brand-400"
              iconBg="bg-brand-50 border-brand-200/80 dark:bg-brand-500/10 dark:border-brand-500/20"
            />
            <StatsCard
              title="Unique Visitors"
              value={summary.uniqueVisitors}
              changePct={summary.uniquesChangePct}
              trendLabel="vs prior period"
              icon={Users}
              subtext="Unique device visits"
              iconColor="text-sky-600 dark:text-sky-400"
              iconBg="bg-sky-50 border-sky-200/80 dark:bg-sky-500/10 dark:border-sky-500/20"
            />
            <StatsCard
              title="Clicks Today"
              value={summary.clicksToday}
              icon={Calendar}
              subtext="Past 24-hour activity"
              iconColor="text-emerald-600 dark:text-emerald-400"
              iconBg="bg-emerald-50 border-emerald-200/80 dark:bg-emerald-500/10 dark:border-emerald-500/20"
            />
            <StatsCard
              title="Active Links"
              value={summary.activeLinks}
              icon={CheckCircle2}
              subtext="Ready for redirects"
              iconColor="text-indigo-600 dark:text-indigo-400"
              iconBg="bg-indigo-50 border-indigo-200/80 dark:bg-indigo-500/10 dark:border-indigo-500/20"
            />
            <StatsCard
              title="Total Links"
              value={summary.totalLinks}
              icon={Link2}
              subtext="All links in database"
              iconColor="text-violet-600 dark:text-violet-400"
              iconBg="bg-violet-50 border-violet-200/80 dark:bg-violet-500/10 dark:border-violet-500/20"
            />
          </div>

          {/* Timeseries Chart & Device Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ClicksChart
                data={timeseries}
                range={range}
                onRangeChange={(r) => setRange(r)}
                title="Traffic Volume & Unique Visitors"
              />
            </div>
            <div>
              <DeviceChart devices={devices} />
            </div>
          </div>

          {/* Browser, Operating System, Country, and Referrer Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <BrowserChart browsers={browsers} />
            <OsChart osList={osList} />
            <CountryChart countries={countries} />
            <ReferrerList referrers={referrers} />
          </div>

          {/* Live Recent Click Events Activity Stream & Top Performing Links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader
                  title="Top Performing Links"
                  subtitle="Link Title & Short URL ranked by cumulative click events"
                  action={
                    <Link
                      to="/links"
                      className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 transition-colors"
                    >
                      View all links &rarr;
                    </Link>
                  }
                />

                {summary.topUrls.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">
                    No link activity recorded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                    {summary.topUrls.map((url, idx) => {
                      const displayShort = getShortUrl(url);
                      return (
                        <div
                          key={url.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs first:pt-1 last:pb-1 group hover:bg-slate-50/60 dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`font-mono font-bold text-xs w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                              idx === 0
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : idx === 1
                                ? 'bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-white/[0.08]'
                                : idx === 2
                                ? 'bg-amber-700/15 text-amber-700 dark:text-amber-500 border border-amber-700/25'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  to={`/links/${url.id}`}
                                  className="font-mono font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors break-all"
                                >
                                  {displayShort}
                                </Link>
                                <CopyButton text={displayShort} size="xs" variant="ghost" />
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm mt-0.5">
                                {truncate(url.longUrl, 50)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/[0.06] px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/[0.06]">
                                {url.clicks} clicks
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedQrUrl(url)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                              title="Show QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <a
                              href={displayShort}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                              title="Open link in new tab"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            <div>
              <RecentClicksList clicks={summary.recentClicks || []} />
            </div>
          </div>

          {/* QR Modal */}
          {selectedQrUrl && (
            <QrCodeModal
              isOpen={Boolean(selectedQrUrl)}
              onClose={() => setSelectedQrUrl(null)}
              urlItem={selectedQrUrl}
            />
          )}
        </>
      )}
    </div>
  );
}
