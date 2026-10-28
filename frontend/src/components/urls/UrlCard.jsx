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
  Zap,
  Power
} from 'lucide-react';
import { Badge } from '../common/Badge.jsx';
import { Button } from '../common/Button.jsx';
import { copyToClipboard, truncate, formatDate } from '../../utils/formatters.js';
import { useToast } from '../common/ToastContext.jsx';

export function UrlCard({
  url,
  isSelected,
  onSelectToggle,
  onOpenQr,
  onOpenEdit,
  onDelete,
  onToggleActive
}) {
  const toast = useToast();

  const handleCopy = async () => {
    const ok = await copyToClipboard(url.shortUrl);
    if (ok) {
      toast.success('Short link copied to clipboard');
    }
  };

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
      className={`p-4 rounded-xl border transition-all ${
        isSelected
          ? 'bg-brand-950/20 border-brand-500/40 shadow-sm'
          : 'bg-slate-900/60 border-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelectToggle(url.id)}
            className="rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500 cursor-pointer"
          />
          <span className="font-mono font-bold text-white tracking-wide text-sm">
            /{url.code}
          </span>
          {url.isPasswordProtected && (
            <span title="Password Protected" className="text-amber-400">
              <Lock className="w-3.5 h-3.5" />
            </span>
          )}
          {url.isOneTimeUse && (
            <span title="One-time use" className="text-brand-400">
              <Zap className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {url.title && (
        <p className="text-xs font-semibold text-slate-200 mb-1">{url.title}</p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-3 break-all">
        <a
          href={url.longUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate hover:text-brand-300"
        >
          {truncate(url.longUrl, 42)}
        </a>
        <ExternalLink className="w-3 h-3 shrink-0 text-slate-500" />
      </div>

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

      <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-slate-800/80">
        <div className="flex items-center gap-1">
          <Button size="xs" variant="secondary" onClick={handleCopy} icon={Copy}>
            Copy
          </Button>
          <Button size="xs" variant="secondary" onClick={() => onOpenQr(url)} icon={QrCode}>
            QR
          </Button>
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
