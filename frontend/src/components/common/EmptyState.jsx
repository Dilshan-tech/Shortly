import React from 'react';
import { Link2 } from 'lucide-react';
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
    <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
      <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 shadow-inner">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6">{description}</p>
      {actionLabel && (
        actionLink ? (
          <a href={actionLink}>
            <Button variant="primary">{actionLabel}</Button>
          </a>
        ) : (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}
