import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  QrCode,
  Edit2,
  ExternalLink,
  MousePointerClick,
  Users,
  Calendar,
  Lock,
  Zap,
  Clock,
  ShieldAlert,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Bot
} from 'lucide-react';
import { StatsCard } from '../components/analytics/StatsCard.jsx';
import { ClicksChart } from '../components/analytics/ClicksChart.jsx';
import { DeviceChart } from '../components/analytics/DeviceChart.jsx';
import { BrowserChart } from '../components/analytics/BrowserChart.jsx';
import { OsChart } from '../components/analytics/OsChart.jsx';
import { CountryChart } from '../components/analytics/CountryChart.jsx';
import { ReferrerList } from '../components/analytics/ReferrerList.jsx';
import { QrCodeModal } from '../components/urls/QrCodeModal.jsx';
import { EditUrlModal } from '../components/urls/EditUrlModal.jsx';
import { Button } from '../components/common/Button.jsx';
import { CopyButton } from '../components/common/CopyButton.jsx';
import { Card, CardHeader } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { useToast } from '../components/common/ToastContext.jsx';
import { getUrlAnalytics, getClicks, downloadCsvExport } from '../api/analytics.js';
import { extractErrorMessage } from '../api/client.js';
import { formatDate, formatTimeAgo, getShortUrl } from '../utils/formatters.js';

export function LinkAnalyticsPage() {
  const { id } = useParams();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Date and filter controls
  const [range, setRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [includeBots, setIncludeBots] = useState(false);

  // Paginated click table state
  const [clickSearch, setClickSearch] = useState('');
  const [clickDevice, setClickDevice] = useState('');
  const [clickPage, setClickPage] = useState(1);
  const [clickList, setClickList] = useState([]);
  const [clickPagination, setClickPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [clickTableLoading, setClickTableLoading] = useState(false);

  const [analytics, setAnalytics] = useState(null);

  // Modals
  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const fetchLinkAnalytics = useCallback(
    async (isSilent = false) => {
      if (!id) return;
      if (!isSilent) setRefreshing(true);

      try {
        const params = {
          range,
          includeBots,
          ...(range === 'custom' && customStart && customEnd
            ? { startDate: customStart, endDate: customEnd }
            : {})
        };
        const res = await getUrlAnalytics(id, params);
        setAnalytics(res.data);
        if (res.data?.recentClicks) {
          setClickList(res.data.recentClicks);
          if (res.data.pagination) setClickPagination(res.data.pagination);
        }
      } catch (err) {
        toast.error(extractErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, range, customStart, customEnd, includeBots, toast]
  );

  useEffect(() => {
    fetchLinkAnalytics();
  }, [fetchLinkAnalytics]);

  // Fetch paginated click table when search/filter/page changes
  const fetchClickTable = useCallback(async () => {
    if (!id || !analytics) return;
    setClickTableLoading(true);
    try {
      const res = await getClicks({
        urlId: id,
        search: clickSearch,
        device: clickDevice,
        page: clickPage,
        limit: 20,
        range,
        includeBots,
        ...(range === 'custom' && customStart && customEnd
          ? { startDate: customStart, endDate: customEnd }
          : {})
      });
      setClickList(res.data || []);
      if (res.pagination) setClickPagination(res.pagination);
    } catch (err) {
      console.error('Error fetching click events:', err);
    } finally {
      setClickTableLoading(false);
    }
  }, [id, analytics, clickSearch, clickDevice, clickPage, range, customStart, customEnd, includeBots]);

  useEffect(() => {
    if (!loading && analytics) {
      fetchClickTable();
    }
  }, [clickPage, clickDevice, fetchClickTable]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setClickPage(1);
    fetchClickTable();
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsvExport(id, {
        range,
        includeBots,
        ...(range === 'custom' && customStart && customEnd
          ? { startDate: customStart, endDate: customEnd }
          : {})
      });
      toast.success('Click analytics exported to CSV successfully');
    } catch (err) {
      toast.error('Failed to export CSV: ' + extractErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Aggregating link performance analytics..." />;
  }

  if (!analytics || !analytics.url) {
    return (
      <div className="space-y-4">
        <Link to="/links">
          <Button variant="ghost" size="sm" icon={ArrowLeft}>
            Back to Library
          </Button>
        </Link>
        <div className="saas-card p-8 text-center text-slate-500 dark:text-slate-400">
          <p className="text-sm">Link not found or has been deleted.</p>
        </div>
      </div>
    );
  }

  const { url, summary, timeseries, devices, browsers, os, countries, referrers } = analytics;
  const shortUrl = getShortUrl(url);

  return (
    <div className="space-y-6">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/links">
            <Button variant="ghost" size="sm" icon={ArrowLeft}>
              Library
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 break-all hover:underline"
                title={`Open ${shortUrl} in a new tab`}
              >
                {shortUrl}
              </a>
              <CopyButton text={shortUrl} size="xs" variant="secondary" showLabel={true} />
            </div>
            {url.title && (
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 font-semibold">{url.title}</p>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Created {formatDate(url.createdAt)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchLinkAnalytics(false)}
            isLoading={refreshing}
            icon={RefreshCw}
          >
            Refresh
          </Button>
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
            onClick={() => setQrOpen(true)}
            icon={QrCode}
          >
            QR Code
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditOpen(true)}
            icon={Edit2}
          >
            Edit
          </Button>
          <a href={url.shortUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" size="sm" icon={ExternalLink}>
              Test Link
            </Button>
          </a>
        </div>
      </div>

      {/* Target URL Info Banner */}
      <div className="saas-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Destination Target:
              </span>
              <a
                href={url.longUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-mono truncate max-w-md font-medium"
              >
                {url.longUrl}
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {url.isActive ? (
                <Badge variant="active">Active</Badge>
              ) : (
                <Badge variant="disabled">Disabled</Badge>
              )}
              {url.isPasswordProtected && (
                <Badge variant="neutral">
                  <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400" /> Password Protected
                </Badge>
              )}
              {url.clickLimit && (
                <Badge variant="blue">
                  <ShieldAlert className="w-3 h-3" /> Limit: {url.clickLimit} clicks
                </Badge>
              )}
              {url.expiresAt && (
                <Badge variant="purple">
                  <Clock className="w-3 h-3" /> Expires: {formatDate(url.expiresAt)}
                </Badge>
              )}
              {url.isOneTimeUse && (
                <Badge variant="brand">
                  <Zap className="w-3 h-3" /> One-Time Use
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 dark:bg-[#07090e] p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08]">
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs sm:text-sm text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 font-bold select-all break-all hover:underline leading-relaxed flex-1"
              title={`Open ${shortUrl} in a new tab`}
            >
              {shortUrl}
            </a>
            <CopyButton text={shortUrl} size="xs" variant="primary" showLabel={true} />
          </div>
        </div>
      </div>

      {/* Date Filters & Traffic Toggle Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/80 dark:bg-[#0c0e16]/80 p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-card dark:shadow-card-dark backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 ml-2 mr-1">
            <Calendar className="w-3.5 h-3.5 text-brand-500" /> Date Window:
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-[#07090f] p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.06] shadow-inner">
            {[
              { id: '24h', label: 'Past 24 Hours' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'custom', label: 'Custom' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setRange(item.id);
                  setClickPage(1);
                }}
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

        {/* Custom Date Inputs if 'custom' is active */}
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
              onClick={() => fetchLinkAnalytics(false)}
              disabled={!customStart || !customEnd}
            >
              Apply
            </Button>
          </div>
        )}

        {/* Traffic Filter Toggle */}
        <div className="flex items-center gap-2 md:ml-auto pr-1">
          <button
            onClick={() => setIncludeBots(!includeBots)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              includeBots
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
            title="Toggle between human visitors and bot crawlers"
          >
            {includeBots ? <Bot className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
            <span>{includeBots ? 'Bots Included' : 'Human Traffic Only'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards with Previous-Period Comparisons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Period Clicks"
          value={summary.periodClicks}
          changePct={summary.clicksChangePct}
          trendLabel="vs prior period"
          icon={MousePointerClick}
          subtext="Actual redirects in window"
          iconColor="text-brand-600 dark:text-brand-400"
          iconBg="bg-brand-50 border-brand-200/80 dark:bg-brand-500/10 dark:border-brand-500/20"
        />
        <StatsCard
          title="Unique Visitors"
          value={summary.uniqueVisitors}
          changePct={summary.uniquesChangePct}
          trendLabel="vs prior period"
          icon={Users}
          subtext="Privacy-hashed devices"
          iconColor="text-sky-600 dark:text-sky-400"
          iconBg="bg-sky-50 border-sky-200/80 dark:bg-sky-500/10 dark:border-sky-500/20"
        />
        <StatsCard
          title="Past 24-Hour Clicks"
          value={summary.clicksToday}
          icon={Calendar}
          subtext="Clicks recorded today"
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 border-emerald-200/80 dark:bg-emerald-500/10 dark:border-emerald-500/20"
        />
        <StatsCard
          title="Lifetime Total"
          value={summary.totalClicks}
          icon={MousePointerClick}
          subtext="All-time verified visits"
          iconColor="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-50 border-violet-200/80 dark:bg-violet-500/10 dark:border-violet-500/20"
        />
      </div>

      {/* Timeseries Area Chart & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClicksChart
            data={timeseries}
            range={range}
            onRangeChange={(r) => {
              setRange(r);
              setClickPage(1);
            }}
            title="Traffic Volume & Unique Visitors"
          />
        </div>
        <div>
          <DeviceChart devices={devices} />
        </div>
      </div>

      {/* Browser, Operating System, Country, and Referrer Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BrowserChart browsers={browsers} />
        <OsChart osList={os} />
        <CountryChart countries={countries} />
        <ReferrerList referrers={referrers} />
      </div>

      {/* Paginated Real Click Events Audit Trail */}
      <Card>
        <CardHeader
          title="Live Click Events Audit Trail"
          subtitle={`Showing ${clickList.length} of ${clickPagination.total} recorded events in selected window`}
          action={
            <Button
              size="xs"
              variant="secondary"
              onClick={handleExportCsv}
              isLoading={exporting}
              icon={Download}
            >
              Export Log
            </Button>
          }
        />

        {/* Table Search & Device Filter */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#080a0f] flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search browser, OS, referrer, country..."
              value={clickSearch}
              onChange={(e) => setClickSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#0c0e16] border border-slate-200 dark:border-white/[0.09] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-500 font-medium"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={clickDevice}
              onChange={(e) => {
                setClickDevice(e.target.value);
                setClickPage(1);
              }}
              className="bg-white dark:bg-[#0c0e16] border border-slate-200 dark:border-white/[0.09] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer font-medium"
            >
              <option value="">All Devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
              {includeBots && <option value="bot">Bot</option>}
            </select>
          </div>
        </div>

        {clickTableLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="sm" text="Updating event audit stream..." />
          </div>
        ) : clickList.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-10 text-center">
            No click events match your selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50/90 dark:bg-black/40 border-b border-slate-200/80 dark:border-white/[0.06] text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Device & Browser</th>
                  <th className="py-3 px-3">Platform</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Referrer</th>
                  <th className="py-3 px-3 text-right">Visitor ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {clickList.map((click) => (
                  <tr key={click.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                      {formatDate(click.timestamp)} ({formatTimeAgo(click.timestamp)})
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {click.browser} {click.browserVersion || ''}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5 capitalize font-medium">
                        ({click.deviceCategory})
                      </span>
                      {click.isBot && (
                        <span className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-1 py-0.2 rounded ml-1.5 font-bold">
                          BOT
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                      {click.os} {click.osVersion || ''}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      <span className="font-mono text-xs">{click.country || 'Unknown'}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {click.referrer || 'Direct'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      {click.visitorId || 'anonymous'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {clickPagination.pages > 1 && (
          <div className="p-3.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-black/30 font-medium">
            <span>
              Page {clickPagination.page} of {clickPagination.pages} ({clickPagination.total} total)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setClickPage((p) => Math.max(1, p - 1))}
                disabled={clickPagination.page <= 1}
                icon={ChevronLeft}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setClickPage((p) => Math.min(clickPagination.pages, p + 1))}
                disabled={clickPagination.page >= clickPagination.pages}
                icon={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* QR Modal */}
      {qrOpen && (
        <QrCodeModal isOpen={qrOpen} onClose={() => setQrOpen(false)} urlItem={url} />
      )}

      {/* Edit Modal */}
      {editOpen && (
        <EditUrlModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          urlItem={url}
          onSaved={() => fetchLinkAnalytics(true)}
        />
      )}
    </div>
  );
}
