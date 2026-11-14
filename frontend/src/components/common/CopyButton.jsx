import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../../utils/formatters.js';
import { useToast } from './ToastContext.jsx';

export function CopyButton({
  text,
  className = '',
  size = 'xs', // 'xs' | 'sm' | 'md'
  variant = 'secondary', // 'primary' | 'secondary' | 'ghost' | 'outline'
  showLabel = true,
  label = 'Copy',
  copiedLabel = 'Copied!',
  toastMessage = 'Short link copied to clipboard',
  iconOnly = false,
  onCopySuccess
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => {
      setCopied(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!text) return;

    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      if (toast && typeof toast.success === 'function' && toastMessage) {
        toast.success(toastMessage);
      }
      if (onCopySuccess) {
        onCopySuccess();
      }
    } else {
      if (toast && typeof toast.error === 'function') {
        toast.error('Failed to copy to clipboard');
      }
    }
  };

  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 select-none active:scale-[0.98] shrink-0 cursor-pointer';

  const sizeStyles = {
    xs: iconOnly || !showLabel ? 'p-1.5' : 'text-xs px-2.5 py-1 gap-1.5',
    sm: iconOnly || !showLabel ? 'p-2' : 'text-xs px-3 py-1.5 gap-1.5',
    md: iconOnly || !showLabel ? 'p-2.5' : 'text-sm px-4 py-2 gap-2'
  };

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4 h-4'
  };

  const getVariantStyles = () => {
    if (copied) {
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm';
    }
    switch (variant) {
      case 'primary':
        return 'bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/20 focus:ring-brand-500 border border-brand-500/30';
      case 'ghost':
        return 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white focus:ring-slate-600';
      case 'outline':
        return 'bg-transparent hover:bg-slate-800/80 text-slate-300 border border-slate-700 focus:ring-brand-500';
      case 'secondary':
      default:
        return 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 focus:ring-slate-500';
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${baseStyles} ${getVariantStyles()} ${sizeStyles[size] || sizeStyles.xs} ${className}`}
      title={copied ? 'Copied to clipboard!' : 'Copy short URL'}
      aria-label={copied ? 'Copied to clipboard' : 'Copy short URL'}
    >
      {copied ? (
        <>
          <Check className={`${iconSizes[size] || 'w-3.5 h-3.5'} text-emerald-400 shrink-0`} />
          {!iconOnly && showLabel && <span className="font-semibold">{copiedLabel}</span>}
        </>
      ) : (
        <>
          <Copy className={`${iconSizes[size] || 'w-3.5 h-3.5'} text-current shrink-0`} />
          {!iconOnly && showLabel && <span>{label}</span>}
        </>
      )}
    </button>
  );
}
