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
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 select-none active:scale-[0.98] shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-slate-950';

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
      return 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/50 shadow-sm';
    }
    switch (variant) {
      case 'primary':
        return 'bg-brand-600 hover:bg-brand-500 text-white shadow-sm hover:shadow shadow-brand-500/20 border border-brand-500/30';
      case 'ghost':
        return 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white';
      case 'outline':
        return 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
      case 'secondary':
      default:
        return 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-800 shadow-sm';
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
          <Check className={`${iconSizes[size] || 'w-3.5 h-3.5'} text-emerald-600 dark:text-emerald-400 shrink-0`} />
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
