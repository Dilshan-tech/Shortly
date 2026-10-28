import React from 'react';

export function Badge({ children, variant = 'neutral', size = 'sm', className = '' }) {
  const variants = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    disabled: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    expired: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    brand: 'bg-brand-500/10 text-brand-300 border-brand-500/20',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700/60',
    blue: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px] font-medium',
    sm: 'px-2.5 py-0.5 text-xs font-medium',
    md: 'px-3 py-1 text-xs font-semibold'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variants[variant] || variants.neutral} ${
        sizes[size] || sizes.sm
      } ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}
