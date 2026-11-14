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

export function UrlCard({
  url,
  isSelected,
  onSelectToggle,
  onOpenQr,
  onOpenEdit,
  onDelete,
  onToggleActive
}) {
  const shortUrl = getShortUrl(url);

  const getStatusBadge = () => {
    const now = new Date();
    const isExpiredTime = url.expiresAt && new Date(url.expiresAt) < now;
    const isLimitReached = url.clickLimit && url.clicks >= url.clickLimit;

    if (isExpiredTime) return <Badge variant="expired">Time Expired</Badge>;
    if (isLimitReached) return <Badge variant="expired">Limit Reached</Badge>;
    if (!url.isActive) return <Badge variant="disabled">Disabled</Badge>;
    return <Badge variant="active">Active</Badge>;
  };

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
        isSelected
          ? 'bg-brand-950/20 border-brand-500/40 shadow-sm'
          : 'bg-slate-900/60 border-slate-800'
      }`}
    >
      {/* Top Header: Checkbox, Title/Alias & Status Badge */}
      <div className="flex items-start justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelectToggle(url.id)}
            className="rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500 cursor-pointer shrink-0"
            aria-label={`Select link ${url.code}`}
          />
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {url.title ? (
              <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                {url.title}
              </span>
            ) : (
              <span className="text-xs font-mono text-slate-400">
                /{url.code}
              </span>
            )}
            {url.isPasswordProtected && (
              <span title="Password Protected" className="text-amber-400 shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </span>
            )}
            {url.isOneTimeUse && (
              <span title="One-time use" className="text-brand-400 shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">{getStatusBadge()}</div>
      </div>

      {/* Complete Short URL Display Box with prominent Copy button */}
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800/90 my-2.5">
        <a
          href={shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs sm:text-sm font-bold text-brand-400 hover:text-brand-300 break-all select-all flex-1 min-w-0 hover:underline leading-relaxed"
          title={`Open ${shortUrl} in a new tab`}
        >
          {shortUrl}
        </a>
        <CopyButton
          text={shortUrl}
          size="xs"
          variant="primary"
          showLabel={true}
          className="shrink-0"
        />
      </div>

      {/* Destination URL */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-3 break-all">
        <a
          href={url.longUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate hover:text-brand-300"
          title={url.longUrl}
        >
          {truncate(url.longUrl, 42)}
        </a>
        <ExternalLink className="w-3 h-3 shrink-0 text-slate-500" />
      </div>

      {/* Metadata Row: Date & Clicks */}
      <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-800/80 text-slate-400">
        <div>
          <span>{formatDate(url.createdAt)}</span>
        </div>
        <Link
          to={`/analytics/${url.id}`}
          className="flex items-center gap-1 font-semibold text-brand-400 hover:text-brand-300"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>{url.clicks || 0} clicks</span>
        </Link>
      </div>

      {/* Bottom Actions: QR Code, Test Link, Active Toggle, Edit, Delete */}
      <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-slate-800/80">
        <div className="flex items-center gap-1">
          <Button size="xs" variant="secondary" onClick={() => onOpenQr(url)} icon={QrCode}>
            QR Code
          </Button>
          <a href={shortUrl} target="_blank" rel="noopener noreferrer">
            <Button size="xs" variant="ghost" title="Open short URL in a new tab">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => onToggleActive(url)}
            title={url.isActive ? 'Disable Link' : 'Enable Link'}
            className={url.isActive ? 'text-emerald-400' : 'text-amber-400'}
          >
            <Power className="w-3.5 h-3.5" />
          </Button>
          <Button size="xs" variant="ghost" onClick={() => onOpenEdit(url)} title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => onDelete(url.id)}
            className="text-rose-400 hover:text-rose-300"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
