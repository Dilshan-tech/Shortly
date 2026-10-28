import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  QrCode,
  Edit2,
  RefreshCw,
  MousePointerClick,
  Users,
  Calendar,
  Lock,
  Zap,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { StatsCard } from '../components/analytics/StatsCard.jsx';
import { ClicksChart } from '../components/analytics/ClicksChart.jsx';
import { DeviceChart } from '../components/analytics/DeviceChart.jsx';
import { BrowserChart } from '../components/analytics/BrowserChart.jsx';
import { ReferrerList } from '../components/analytics/ReferrerList.jsx';
import { QrCodeModal } from '../components/urls/QrCodeModal.jsx';
import { EditUrlModal } from '../components/urls/EditUrlModal.jsx';
import { Button } from '../components/common/Button.jsx';
import { Card, CardHeader } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { useToast } from '../components/common/ToastContext.jsx';
import { getUrlAnalytics } from '../api/analytics.js';
import { extractErrorMessage } from '../api/client.js';
import { copyToClipboard, formatDate, formatTimeAgo } from '../utils/formatters.js';

export function LinkAnalyticsPage() {
  const { id } = useParams();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);

  const [analytics, setAnalytics] = useState(null);

  // Modals
  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const fetchLinkAnalytics = useCallback(async (isSilent = false) => {
    if (!id) return;
    if (!isSilent) setRefreshing(true);

    try {
      const res = await getUrlAnalytics(id, days);
      setAnalytics(res.data);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, days, toast]);

  useEffect(() => {
    fetchLinkAnalytics();
  }, [fetchLinkAnalytics]);

  const handleCopy = async () => {
    if (!analytics?.url?.shortUrl) return;
    const ok = await copyToClipboard(analytics.url.shortUrl);
    if (ok) {
      toast.success('Short link copied to clipboard');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading link performance metrics..." />;
  }

  if (!analytics || !analytics.url) {
    return (
      <div className="space-y-4">
        <Link to="/links">
          <Button variant="ghost" size="sm" icon={ArrowLeft}>
            Back to Library
          </Button>
        </Link>
        <Card className="p-8 text-center text-slate-400">
          <p className="text-sm">Link not found or has been deleted.</p>
        </Card>
      </div>
    );
  }

  const { url, summary, timeseries, devices, browsers, referrers, recentClicks } = analytics;

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
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>/{url.code}</span>
              {url.title && (
                <span className="text-sm font-normal text-slate-400">({url.title})</span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Created {formatDate(url.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
      <Card className="bg-slate-900/90 border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase text-slate-400">
                Destination Target:
              </span>
              <a
                href={url.longUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-300 hover:underline font-mono truncate"
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
                  <Lock className="w-3 h-3 text-amber-400" /> Password Protected
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

          <div className="shrink-0 flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="font-mono text-xs text-brand-400 font-semibold select-all">
              {url.shortUrl}
            </span>
            <Button size="xs" variant="ghost" onClick={handleCopy} title="Copy short link">
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Lifetime Clicks"
          value={summary.totalClicks}
          icon={MousePointerClick}
          subtext="Actual redirects served"
        />
        <StatsCard
          title="Past 24-Hour Clicks"
          value={summary.clicksToday}
          icon={Calendar}
          subtext="Clicks recorded today"
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
        />
        <StatsCard
          title="Unique Visitors"
          value={summary.uniqueVisitors}
          icon={Users}
          subtext="Estimated unique devices"
          iconColor="text-sky-400"
          iconBg="bg-sky-500/10 border-sky-500/20"
        />
      </div>

      {/* Timeseries & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClicksChart
            data={timeseries}
            days={days}
            onDaysChange={(d) => setDays(d)}
            title="Link Click Trend"
          />
        </div>
        <div>
          <DeviceChart devices={devices} />
        </div>
      </div>

      {/* Browser and Referrer Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BrowserChart browsers={browsers} />
        <ReferrerList referrers={referrers} />
      </div>

      {/* Recent Click Event Stream */}
      <Card>
        <CardHeader
          title="Recent Click Events Log"
          subtitle="Detailed audit trail of real visitors to this short link"
        />

        {recentClicks.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No click events recorded for this link yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Device & Browser</th>
                  <th className="py-2.5 px-3">Operating System</th>
                  <th className="py-2.5 px-3">Referrer</th>
                  <th className="py-2.5 px-3 text-right">Visitor ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {recentClicks.map((click) => (
                  <tr key={click.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                      {formatDate(click.timestamp)} ({formatTimeAgo(click.timestamp)})
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-200">
                        {click.browser} {click.browserVersion || ''}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5 capitalize">
                        ({click.deviceCategory})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {click.os} {click.osVersion || ''}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {click.referrer || 'Direct'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-500">
                      {click.visitorId || 'anonymous'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* QR Modal */}
      {qrOpen && (
        <QrCodeModal
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          urlItem={url}
        />
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
