import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Link2,
  Copy,
  ExternalLink,
  QrCode,
  Shield,
  Clock,
  Zap,
  BarChart2,
  ArrowRight,
  CheckCircle2,
  Lock,
  Download
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Card, CardHeader } from '../components/common/Card.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { useToast } from '../components/common/ToastContext.jsx';
import { createUrl } from '../api/urls.js';
import { extractErrorMessage } from '../api/client.js';
import { copyToClipboard } from '../utils/formatters.js';

export function CreateLinkPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState(null);

  // Form inputs
  const [longUrl, setLongUrl] = useState('');
  const [title, setTitle] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [clickLimit, setClickLimit] = useState('');
  const [password, setPassword] = useState('');
  const [isOneTimeUse, setIsOneTimeUse] = useState(false);

  // Advanced options toggle accordion
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form error
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!longUrl.trim()) {
      setFormError('Please provide a destination URL');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        longUrl: longUrl.trim(),
        title: title.trim() || undefined,
        customAlias: customAlias.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        clickLimit: clickLimit ? parseInt(clickLimit, 10) : undefined,
        password: password.trim() || undefined,
        isOneTimeUse
      };

      const res = await createUrl(payload);
      setCreatedUrl(res.data);
      toast.success('Short link generated successfully!');
    } catch (err) {
      const msg = extractErrorMessage(err);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdUrl) return;
    const ok = await copyToClipboard(createdUrl.shortUrl);
    if (ok) {
      toast.success('Short URL copied to clipboard!');
    }
  };

  const handleDownloadPng = () => {
    try {
      const canvas = document.getElementById('created-qr-canvas');
      if (!canvas) return;
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `shortly-${createdUrl.code}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success('QR Code downloaded as PNG');
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const handleReset = () => {
    setCreatedUrl(null);
    setLongUrl('');
    setTitle('');
    setCustomAlias('');
    setExpiresAt('');
    setClickLimit('');
    setPassword('');
    setIsOneTimeUse(false);
    setFormError('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Create Short Link
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Generate an unpredictable or customized short URL with QR code and analytics tracking
        </p>
      </div>

      {createdUrl ? (
        /* SUCCESS RESULT CARD */
        <Card className="border-brand-500/30 bg-slate-900/90 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Your Short Link is Ready!</h3>
              <p className="text-xs text-slate-400">
                Created with dynamic QR code and real-time click tracking
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Cols: Link Details & Actions */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Short URL
                </label>
                <div className="flex items-center gap-2 mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="font-mono text-sm sm:text-base font-bold text-brand-400 truncate flex-1 select-all">
                    {createdUrl.shortUrl}
                  </span>
                  <Button variant="primary" size="sm" onClick={handleCopy} icon={Copy}>
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Original Destination
                </label>
                <p className="text-xs text-slate-300 font-mono mt-1 break-all bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                  {createdUrl.longUrl}
                </p>
              </div>

              {createdUrl.title && (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Title
                  </label>
                  <p className="text-xs text-slate-200 mt-0.5">{createdUrl.title}</p>
                </div>
              )}

              {/* Status pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {createdUrl.isPasswordProtected && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    <Lock className="w-3.5 h-3.5" /> Password Protected
                  </span>
                )}
                {createdUrl.clickLimit && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                    <Shield className="w-3.5 h-3.5" /> Max {createdUrl.clickLimit} clicks
                  </span>
                )}
                {createdUrl.expiresAt && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                    <Clock className="w-3.5 h-3.5" /> Expires {new Date(createdUrl.expiresAt).toLocaleDateString()}
                  </span>
                )}
                {createdUrl.isOneTimeUse && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                    <Zap className="w-3.5 h-3.5" /> One-Time Use
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <a href={createdUrl.shortUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm" icon={ExternalLink}>
                    Test Short URL
                  </Button>
                </a>
                <Link to={`/analytics/${createdUrl.id}`}>
                  <Button variant="outline" size="sm" icon={BarChart2}>
                    Link Analytics
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Create Another
                </Button>
              </div>
            </div>

            {/* Right 1 Col: Dynamic QR Code */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <div className="p-3 bg-white rounded-xl shadow-lg mb-3">
                <QRCodeSVG
                  value={createdUrl.shortUrl}
                  size={140}
                  level="H"
                  includeMargin={true}
                />
                <div className="hidden">
                  <QRCodeCanvas
                    id="created-qr-canvas"
                    value={createdUrl.shortUrl}
                    size={800}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Scan with any mobile camera</p>
              <Button size="xs" variant="secondary" onClick={handleDownloadPng} icon={Download}>
                Download QR (PNG)
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* CREATE FORM */
        <Card className="shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {formError}
              </div>
            )}

            {/* Destination URL */}
            <Input
              label="Destination URL"
              required
              icon={Link2}
              type="url"
              placeholder="https://example.com/long-page-address"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              helperText="Must be a valid HTTP or HTTPS address"
              autoFocus
            />

            {/* Title & Custom Alias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Link Title (Optional)"
                placeholder="e.g. Documentation, Summer Promo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                helperText="Internal title for library reference"
              />

              <Input
                label="Custom Alias (Optional)"
                placeholder="e.g. spring-sale-2026"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                helperText="3-30 letters, numbers, hyphens"
              />
            </div>

            {/* Advanced Options Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1.5 focus:outline-none"
              >
                <span>{showAdvanced ? '− Hide Advanced Controls' : '+ Show Advanced Controls (Expiry, Limit, Password)'}</span>
              </button>
            </div>

            {/* Advanced Controls Section */}
            {showAdvanced && (
              <div className="space-y-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Click Limit"
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={clickLimit}
                    onChange={(e) => setClickLimit(e.target.value)}
                    helperText="Automatically deactivates after N clicks"
                  />

                  <Input
                    label="Expiration Date & Time"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    helperText="Link becomes inactive after this timestamp"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <Input
                    label="Password Protection"
                    type="password"
                    placeholder="Enter password (min 4 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    helperText="Requires password entry before redirecting"
                  />

                  <div className="flex flex-col justify-center pt-5">
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isOneTimeUse}
                        onChange={(e) => setIsOneTimeUse(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold text-white">One-Time Use Only</span>
                        <p className="text-[11px] text-slate-400">Deactivates permanently immediately after 1 visit</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={loading}
              >
                Shorten URL
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
