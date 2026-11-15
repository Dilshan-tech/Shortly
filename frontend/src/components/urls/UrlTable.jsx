import React from 'react';
import { Link } from 'react-router-dom';
import {
  QrCode,
  BarChart2,
  Edit2,
  Trash2,
  ExternalLink,
  Lock,
  Zap,
  Power
} from 'lucide-react';
import { Badge } from '../common/Badge.jsx';
import { Button } from '../common/Button.jsx';
import { CopyButton } from '../common/CopyButton.jsx';
import { truncate, formatDate, getShortUrl } from '../../utils/formatters.js';

export function UrlTable({
  urls = [],
  selectedIds = [],
  onSelectToggle,
  onSelectAll,
  onOpenQr,
  onOpenEdit,
  onDelete,
  onToggleActive
}) {
  const getStatusBadge = (url) => {
    const now = new Date();
    const isExpiredTime = url.expiresAt && new Date(url.expiresAt) < now;
    const isLimitReached = url.clickLimit && url.clicks >= url.clickLimit;

    if (isExpiredTime) {
      return <Badge variant="expired">Time Expired</Badge>;
    }
    if (isLimitReached) {
      return <Badge variant="expired">Limit Reached</Badge>;
    }
    if (!url.isActive) {
      return <Badge variant="disabled">Disabled</Badge>;
    }
    return <Badge variant="active">Active</Badge>;
  };

  const allSelected = urls.length > 0 && selectedIds.length === urls.length;

  return (
    <div className="saas-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50/90 dark:bg-black/40 border-b border-slate-200/80 dark:border-white/[0.06] text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
            <tr>
              <th className="py-3.5 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="rounded border-slate-300 dark:border-white/[0.15] bg-white dark:bg-black/60 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  aria-label="Select all links"
                />
              </th>
              <th className="py-3.5 px-4">Short URL & Title</th>
              <th className="py-3.5 px-4">Destination URL</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-center">Clicks</th>
              <th className="py-3.5 px-4">Created</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {urls.map((url) => {
              const isSelected = selectedIds.includes(url.id);
              const shortUrl = getShortUrl(url);

              return (
                <tr
                  key={url.id}
                  className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.02] ${
                    isSelected ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="py-3.5 px-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectToggle(url.id)}
                      className="rounded border-slate-300 dark:border-white/[0.15] bg-white dark:bg-black/60 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      aria-label={`Select link ${url.code}`}
                    />
                  </td>

                  {/* Complete Short URL & Title */}
                  <td className="py-3.5 px-4 min-w-[240px] max-w-[340px]">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 break-all select-all hover:underline leading-relaxed"
                          title={`Open ${shortUrl} in a new tab`}
                        >
                          {shortUrl}
                        </a>
                        <div className="flex items-center gap-1 shrink-0">
                          {url.isPasswordProtected && (
                            <span title="Password Protected" className="text-amber-500 dark:text-amber-400">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {url.isOneTimeUse && (
                            <span title="One-time use link" className="text-purple-500 dark:text-purple-400">
                              <Zap className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <CopyButton
                            text={shortUrl}
                            size="xs"
                            variant="secondary"
                            showLabel={true}
                          />
                        </div>
                      </div>
                      {url.title ? (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                          {url.title}
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          /{url.code}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Destination URL */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 max-w-[280px]">
                      <a
                        href={url.longUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-300 transition-colors font-mono"
                        title={url.longUrl}
                      >
                        {truncate(url.longUrl, 38)}
                      </a>
                      <a
                        href={url.longUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                        title="Open destination in new tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">{getStatusBadge(url)}</td>

                  {/* Clicks */}
                  <td className="py-3.5 px-4 text-center">
                    <Link
                      to={`/analytics/${url.id}`}
                      className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-300 bg-slate-100 dark:bg-white/[0.06] px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-white/[0.08] transition-colors"
                      title="View Analytics"
                    >
                      <BarChart2 className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                      <span>{url.clicks || 0}</span>
                    </Link>
                  </td>

                  {/* Created Date */}
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap font-medium">
                    {formatDate(url.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onOpenQr(url)}
                        title="View & Download QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </Button>

                      <Link to={`/analytics/${url.id}`}>
                        <Button size="xs" variant="ghost" title="Detailed Analytics">
                          <BarChart2 className="w-3.5 h-3.5" />
                        </Button>
                      </Link>

                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onToggleActive(url)}
                        title={url.isActive ? 'Disable Link' : 'Enable Link'}
                        className={url.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onOpenEdit(url)}
                        title="Edit Link Settings"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onDelete(url.id)}
                        className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Delete Link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
