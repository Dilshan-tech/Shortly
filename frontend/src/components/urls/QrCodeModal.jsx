import React, { useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Download, Copy, ExternalLink, Check } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { useToast } from '../common/ToastContext.jsx';
import { copyToClipboard } from '../../utils/formatters.js';

export function QrCodeModal({ isOpen, onClose, urlItem }) {
  const toast = useToast();
  const canvasRef = useRef(null);

  if (!urlItem) return null;

  const shortUrl = urlItem.shortUrl;

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
        {/* QR Code Container with High Contrast & Sleek White Border */}
        <div className="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center">
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
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className="font-mono text-brand-300 truncate select-all">{shortUrl}</span>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="xs" variant="ghost" onClick={handleCopy} title="Copy Short URL">
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                <Button size="xs" variant="ghost" title="Open in new tab">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Target: <span className="truncate max-w-[260px] inline-block align-bottom">{urlItem.longUrl}</span>
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
