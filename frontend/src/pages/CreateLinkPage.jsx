import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Link2,
  ExternalLink,
  QrCode,
  Shield,
  Clock,
  Zap,
  BarChart2,
  CheckCircle2,
  Lock,
  Download,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Globe,
  ArrowRight
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Card, CardHeader } from '../components/common/Card.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { CopyButton } from '../components/common/CopyButton.jsx';
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

  // Preview computation
  const previewSlug = customAlias.trim() || 'demo-link';
  const previewDomain = typeof window !== 'undefined' ? window.location.host : 'sho.rt';
  const previewFullUrl = `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//${previewDomain}/${previewSlug}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Create Short Link
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Generate an unpredictable or customized short URL with QR code and live analytics
        </p>
      </div>

      {createdUrl ? (
        /* SUCCESS RESULT CARD */
        <Card className="border-brand-500/30 bg-white dark:bg-[#0c0e16] shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Your Short Link is Ready!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Created with dynamic QR code and real-time click tracking
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Cols: Link Details & Actions */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Short URL
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mt-1.5 p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-white/[0.08]">
                  <a
                    href={createdUrl.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm sm:text-base font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 break-all select-all flex-1 hover:underline leading-relaxed"
                    title="Open short URL in a new browser tab"
                  >
                    {createdUrl.shortUrl}
                  </a>
                  <CopyButton
                    text={createdUrl.shortUrl}
                    size="sm"
                    variant="primary"
                    showLabel={true}
                    className="w-full sm:w-auto"
                  />
                </div>
                {createdUrl.shortUrl &&
                  (createdUrl.shortUrl.includes('localhost') || createdUrl.shortUrl.includes('127.0.0.1')) &&
                  typeof window !== 'undefined' &&
                  window.location.hostname !== 'localhost' &&
                  window.location.hostname !== '127.0.0.1' && (
                    <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-200 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">Mobile Warning: </span>
                        This short link uses <code className="bg-slate-100 dark:bg-black/50 px-1 py-0.5 rounded text-amber-600 dark:text-amber-300 font-mono">localhost</code> and will not open on your phone.
                        For VS Code port forwarding, set <code className="text-brand-600 dark:text-brand-300 font-mono">$env:PUBLIC_URL="https://&lt;id&gt;-5000.app.github.dev"</code> on the backend (port 5000).
                      </div>
                    </div>
                  )}
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Original Destination
                </label>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-mono mt-1 break-all bg-slate-50 dark:bg-[#080a0f] p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08]">
                  {createdUrl.longUrl}
                </p>
              </div>

              {createdUrl.title && (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Title
                  </label>
                  <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 font-medium">{createdUrl.title}</p>
                </div>
              )}

              {/* Status pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {createdUrl.isPasswordProtected && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    <Lock className="w-3.5 h-3.5" /> Password Protected
                  </span>
                )}
                {createdUrl.clickLimit && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                    <Shield className="w-3.5 h-3.5" /> Max {createdUrl.clickLimit} clicks
                  </span>
                )}
                {createdUrl.expiresAt && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                    <Clock className="w-3.5 h-3.5" /> Expires {new Date(createdUrl.expiresAt).toLocaleDateString()}
                  </span>
                )}
                {createdUrl.isOneTimeUse && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
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
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-white/[0.08] text-center">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100 mb-3">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 font-medium">Scan with camera</p>
              <Button size="xs" variant="secondary" onClick={handleDownloadPng} icon={Download}>
                Download QR (PNG)
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* CREATE FORM WITH LIVE INTERACTIVE PREVIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Left Column */}
          <div className="lg:col-span-7">
            <Card className="shadow-lg">
              <form onSubmit={handleSubmit} className="space-y-5">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300">
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

                {/* Advanced Options Toggle Accordion */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 flex items-center gap-1.5 focus:outline-none transition-colors"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                    <span>{showAdvanced ? 'Hide Advanced Controls' : 'Show Advanced Controls (Expiry, Limit, Password)'}</span>
                  </button>
                </div>

                {/* Advanced Controls Section */}
                {showAdvanced && (
                  <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-white/[0.08] animate-in fade-in duration-200">
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

                      <div className="flex flex-col justify-center pt-2 sm:pt-4">
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isOneTimeUse}
                            onChange={(e) => setIsOneTimeUse(e.target.checked)}
                            className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">One-Time Use Only</span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Deactivates permanently after 1 visit</p>
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
          </div>

          {/* Live Interactive Preview Right Column */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" /> Live Link Preview
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Real-Time
              </span>
            </div>

            {/* Simulated Dub / Linear Link Card */}
            <div className="saas-card p-5 space-y-4 border border-brand-500/20 dark:border-brand-500/20 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {title.trim() || 'My Shortly Link'}
                    </h4>
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-mono font-semibold truncate">
                      /{previewSlug}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                  Active
                </span>
              </div>

              {/* Destination preview */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200/80 dark:border-white/[0.06] text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                <span className="text-slate-400 dark:text-slate-500 mr-1.5">&rarr;</span>
                {longUrl.trim() || 'https://example.com/your-destination-page'}
              </div>

              {/* Dynamic QR preview */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Dynamic QR
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Ready instantly upon creation
                  </p>
                </div>
                <div className="p-1.5 bg-white rounded-xl shadow-xs border border-slate-200/80">
                  <QRCodeSVG
                    value={longUrl.trim() || previewFullUrl}
                    size={48}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Applied security features live pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {password && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20">
                    <Lock className="w-3 h-3" /> Protected
                  </span>
                )}
                {clickLimit && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20">
                    <Shield className="w-3 h-3" /> Max {clickLimit}
                  </span>
                )}
                {expiresAt && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20">
                    <Clock className="w-3 h-3" /> Expiring
                  </span>
                )}
                {isOneTimeUse && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20">
                    <Zap className="w-3 h-3" /> One-Time
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
