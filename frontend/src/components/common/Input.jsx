import React, { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    prefix,
    className = '',
    id,
    type = 'text',
    required,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300 tracking-wide uppercase">
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        {prefix && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm font-medium">
            {prefix}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          className={`w-full rounded-lg bg-slate-900 border text-slate-100 placeholder-slate-500 text-sm py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
            Icon ? 'pl-9 pr-3' : prefix ? 'pl-16 pr-3' : 'px-3'
          } ${
            error
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-slate-700/80 hover:border-slate-600 focus:border-brand-500'
          } ${className}`}
          {...props}
        />
      </div>

      {error ? (
        <p className="text-xs text-rose-400 font-medium animate-in fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});
