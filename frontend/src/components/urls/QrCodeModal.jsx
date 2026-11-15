import React, { useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Download, ExternalLink } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { CopyButton } from '../common/CopyButton.jsx';
import { useToast } from '../common/ToastContext.jsx';
import { copyToClipboard, getShortUrl } from '../../utils/formatters.js';

export function QrCodeModal({ isOpen, onClose, urlItem }) {
  const toast = useToast();
  const canvasRef = useRef(null);

  if (!urlItem) return null;

  const shortUrl = getShortUrl(urlItem);

  const handleCopy = async () => {
    const ok = await copyToClipboard(shortUrl);
    if (ok) {
      toast.success('Short URL copied to clipboard');
    }
  };

  const handleDownloadPng = () => {
    try {
      const canvas = document.getElementById('qr-canvas-download');
      if (!canvas) return;
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `shortly-${urlItem.code}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success('QR Code downloaded as PNG');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PNG QR code');
    }
  };

  const handleDownloadSvg = () => {
    try {
      const svg = document.getElementById('qr-svg-preview');
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `shortly-${urlItem.code}-qr.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
      toast.success('QR Code downloaded as SVG');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download SVG QR code');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="QR Code Preview">
      <div className="flex flex-col items-center space-y-6 pt-2">
        {/* QR Code Container with High Contrast & Sleek Border */}
        <div className="p-4 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center">
          <QRCodeSVG
            id="qr-svg-preview"
            value={shortUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
          {/* Hidden Canvas for High-Res PNG Download */}
          <div className="hidden">
            <QRCodeCanvas
              id="qr-canvas-download"
              value={shortUrl}
              size={1024}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>

        {/* Short URL Display & Copy */}
        <div className="w-full">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-brand-600 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 hover:underline break-all select-all flex-1 leading-relaxed"
              title={`Open ${shortUrl} in a new tab`}
            >
              {shortUrl}
            </a>
            <div className="flex items-center gap-1.5 shrink-0 justify-end">
              <CopyButton text={shortUrl} size="xs" variant="secondary" showLabel={true} />
              <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                <Button size="xs" variant="ghost" title="Open in new tab">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-2">
            Target: <span className="truncate max-w-[260px] inline-block align-bottom font-mono">{urlItem.longUrl}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button variant="secondary" onClick={handleDownloadPng} icon={Download}>
            Download PNG
          </Button>
          <Button variant="outline" onClick={handleDownloadSvg} icon={Download}>
            Download SVG
          </Button>
        </div>
      </div>
    </Modal>
  );
}
