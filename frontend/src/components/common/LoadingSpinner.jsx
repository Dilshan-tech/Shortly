import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3 text-slate-400">
      <Loader2 className={`${sizes[size] || sizes.md} animate-spin text-brand-500`} />
      {text && <p className="text-xs font-medium tracking-wide">{text}</p>}
    </div>
  );
}
