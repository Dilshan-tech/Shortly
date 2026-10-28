import React from 'react';
import { Link } from 'react-router-dom';
import {
  Copy,
  QrCode,
  BarChart2,
  Edit2,
  Trash2,
  ExternalLink,
  Lock,
  Clock,
  Zap,
  Power
} from 'lucide-react';
import { Badge } from '../common/Badge.jsx';
import { Button } from '../common/Button.jsx';
import { copyToClipboard, truncate, formatDate } from '../../utils/formatters.js';
import { useToast } from '../common/ToastContext.jsx';

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
  const toast = useToast();

  const handleCopy = async (shortUrl) => {
    const ok = await copyToClipboard(shortUrl);
    if (ok) {
      toast.success('Short link copied to clipboard');
    }
  };

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
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
          <tr>
            <th className="py-3 px-4 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </th>
            <th className="py-3 px-4">Short Code & Alias</th>
            <th className="py-3 px-4">Destination URL</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-center">Clicks</th>
            <th className="py-3 px-4">Created</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800/80">
          {urls.map((url) => {
            const isSelected = selectedIds.includes(url.id);
            return (
              <tr
                key={url.id}
                className={`transition-colors hover:bg-slate-800/40 ${
                  isSelected ? 'bg-brand-950/20' : ''
                }`}
              >
                {/* Select Checkbox */}
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelectToggle(url.id)}
                    className="rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </td>

                {/* Short Code & Title */}
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-white tracking-wide">
                        /{url.code}
                      </span>
                      {url.isPasswordProtected && (
                        <span title="Password Protected" className="text-amber-400">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {url.isOneTimeUse && (
                        <span title="One-time use link" className="text-brand-400">
                          <Zap className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <button
                        onClick={() => handleCopy(url.shortUrl)}
                        className="text-slate-500 hover:text-slate-200 p-0.5 transition-colors"
                        title="Copy short URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {url.title ? (
                      <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {url.title}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Standard link</span>
                    )}
                  </div>
                </td>

                {/* Destination URL */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5 max-w-[280px]">
                    <a
                      href={url.longUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-slate-300 hover:text-brand-300 transition-colors font-mono"
                      title={url.longUrl}
                    >
                      {truncate(url.longUrl, 38)}
                    </a>
                    <a
                      href={url.longUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-slate-300 shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </td>

                {/* Status Badge */}
                <td className="py-3 px-4">{getStatusBadge(url)}</td>

                {/* Clicks */}
                <td className="py-3 px-4 text-center">
                  <Link
                    to={`/analytics/${url.id}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-slate-200 hover:text-brand-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 transition-colors"
                    title="View Analytics"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-brand-400" />
                    <span>{url.clicks || 0}</span>
                  </Link>
                </td>

                {/* Created Date */}
                <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                  {formatDate(url.createdAt)}
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
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
                      className={url.isActive ? 'text-emerald-400' : 'text-amber-400'}
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
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
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
  );
}
