import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Link2,
  MousePointerClick,
  Calendar,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  QrCode,
  Plus
} from 'lucide-react';
import { StatsCard } from '../components/analytics/StatsCard.jsx';
import { ClicksChart } from '../components/analytics/ClicksChart.jsx';
import { DeviceChart } from '../components/analytics/DeviceChart.jsx';
import { BrowserChart } from '../components/analytics/BrowserChart.jsx';
import { ReferrerList } from '../components/analytics/ReferrerList.jsx';
import { RecentClicksList } from '../components/analytics/RecentClicksList.jsx';
import { QrCodeModal } from '../components/urls/QrCodeModal.jsx';
import { Button } from '../components/common/Button.jsx';
import { Card, CardHeader } from '../components/common/Card.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { useToast } from '../components/common/ToastContext.jsx';
import {
  getSummary,
  getTimeseries,
  getDevices,
  getBrowsers,
  getReferrers
} from '../api/analytics.js';
import { extractErrorMessage } from '../api/client.js';
import { truncate } from '../utils/formatters.js';

export function OverviewPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoPoll, setAutoPoll] = useState(false);
  const [days, setDays] = useState(7);

  // Analytics data states
  const [summary, setSummary] = useState({
    totalLinks: 0,
    activeLinks: 0,
    totalClicks: 0,
    clicksToday: 0,
    uniqueVisitors: 0,
    topUrls: [],
    recentClicks: []
  });
  const [timeseries, setTimeseries] = useState([]);
  const [devices, setDevices] = useState([]);
  const [browsers, setBrowsers] = useState([]);
  const [referrers, setReferrers] = useState([]);

  // QR Modal state
  const [selectedQrUrl, setSelectedQrUrl] = useState(null);

  // Prevent overlapping poll requests
  const isFetchingRef = useRef(false);

  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!isSilent) setRefreshing(true);

    try {
      const [sumRes, timeRes, devRes, browRes, refRes] = await Promise.all([
        getSummary(),
        getTimeseries(days),
        getDevices(),
        getBrowsers(),
        getReferrers()
      ]);

      setSummary(sumRes.data);
      setTimeseries(timeRes.data);
      setDevices(devRes.data);
      setBrowsers(browRes.data);
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
  }, [days, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Safe auto-polling without request overlap
  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 7000); // 7-second gentle poll

    return () => clearInterval(interval);
  }, [autoPoll, fetchAnalytics]);

  if (loading) {
    return <LoadingSpinner text="Aggregating live analytics..." />;
  }

  const isFreshInstall = summary.totalLinks === 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Dashboard Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time link activity, device distribution, and traffic patterns
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoPoll(!autoPoll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoPoll
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoPoll ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span>Auto-poll (7s)</span>
          </button>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Short Links"
              value={summary.totalLinks}
              icon={Link2}
              subtext="Created in system"
            />
            <StatsCard
              title="Total Clicks"
              value={summary.totalClicks}
              icon={MousePointerClick}
              subtext="Across all tracked URLs"
              iconColor="text-violet-400"
              iconBg="bg-violet-500/10 border-violet-500/20"
            />
            <StatsCard
              title="Clicks Today"
              value={summary.clicksToday}
              icon={Calendar}
              subtext="Past 24-hour activity"
              iconColor="text-emerald-400"
              iconBg="bg-emerald-500/10 border-emerald-500/20"
            />
            <StatsCard
              title="Active Links"
              value={summary.activeLinks}
              icon={CheckCircle2}
              subtext="Ready for redirects"
              iconColor="text-sky-400"
              iconBg="bg-sky-500/10 border-sky-500/20"
            />
          </div>

          {/* Timeseries Chart & Device Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ClicksChart
                data={timeseries}
                days={days}
                onDaysChange={(d) => setDays(d)}
                title="Overall Traffic"
              />
            </div>
            <div>
              <DeviceChart devices={devices} />
            </div>
          </div>

          {/* Browser Distribution, Referrers, and Live Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <BrowserChart browsers={browsers} />
            <ReferrerList referrers={referrers} />
            <RecentClicksList clicks={summary.recentClicks || []} />
          </div>

          {/* Top-Performing Links Section */}
          <Card>
            <CardHeader
              title="Top Performing Links"
              subtitle="Most visited destination links ranked by cumulative click events"
              action={
                <Link to="/links" className="text-xs font-medium text-brand-400 hover:text-brand-300">
                  View all links →
                </Link>
              }
            />

            {summary.topUrls?.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No links with visits yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Link Title & Alias</th>
                      <th className="py-2.5 px-3">Destination</th>
                      <th className="py-2.5 px-3 text-center">Total Clicks</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {summary.topUrls.map((url) => (
                      <tr key={url.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-100">{url.title}</div>
                          <span className="font-mono text-xs text-brand-300">/{url.code}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-400 font-mono" title={url.longUrl}>
                            {truncate(url.longUrl, 36)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                            <TrendingUp className="w-3 h-3 text-brand-400" />
                            {url.clicks}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setSelectedQrUrl(url)}
                              title="QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </Button>
                            <Link to={`/analytics/${url.id}`}>
                              <Button size="xs" variant="ghost" title="Detailed Analytics">
                                Analytics
                              </Button>
                            </Link>
                            <a href={url.shortUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="xs" variant="ghost" title="Test Link">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* QR Code Modal */}
      {selectedQrUrl && (
        <QrCodeModal
          isOpen={Boolean(selectedQrUrl)}
          onClose={() => setSelectedQrUrl(null)}
          urlItem={selectedQrUrl}
        />
      )}
    </div>
  );
}
