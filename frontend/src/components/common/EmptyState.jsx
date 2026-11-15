import React from 'react';
import { Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './Button.jsx';

export function EmptyState({
  icon: Icon = Link2,
  title = 'No links found',
  description = 'Create your first shortened link to begin tracking real click analytics.',
  actionLabel,
  onAction,
  actionLink
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 sm:p-16 border border-dashed border-slate-300/80 dark:border-white/[0.1] rounded-3xl bg-white/40 dark:bg-white/[0.02] backdrop-blur-md relative overflow-hidden shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-400 flex items-center justify-center text-white mb-4 shadow-lg shadow-brand-500/25">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && (
        actionLink ? (
          <Link to={actionLink}>
            <Button variant="primary" size="md">{actionLabel}</Button>
          </Link>
        ) : (
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}
