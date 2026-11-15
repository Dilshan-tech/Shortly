import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`saas-card p-4 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/[0.06] ${className}`}>
      <div className="space-y-0.5">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
