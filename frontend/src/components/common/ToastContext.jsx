import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((firstArg, type = 'info', duration = 4000) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    let toastObj;

    if (typeof firstArg === 'object' && firstArg !== null) {
      toastObj = {
        id,
        message: firstArg.message || firstArg.title || '',
        title: firstArg.title || null,
        type: firstArg.type || 'info',
        duration: firstArg.duration || duration
      };
    } else {
      toastObj = {
        id,
        message: String(firstArg || ''),
        title: null,
        type,
        duration
      };
    }

    setToasts((prev) => [...prev, toastObj]);

    const dur = toastObj.duration;
    if (dur > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, dur);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    addToast,
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    info: (msg, duration) => addToast(msg, 'info', duration)
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 bg-white/95 dark:bg-slate-900/95 ${
              t.type === 'success'
                ? 'border-emerald-500/30 dark:border-emerald-500/40'
                : t.type === 'error'
                ? 'border-rose-500/30 dark:border-rose-500/40'
                : 'border-brand-500/30 dark:border-brand-500/40'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-brand-500 dark:text-brand-400" />}
            </div>
            <div className="flex-1 text-xs">
              {t.title && (
                <p className="font-semibold text-slate-900 dark:text-white leading-tight mb-0.5">
                  {t.title}
                </p>
              )}
              <p className="font-medium text-slate-700 dark:text-slate-200 leading-snug">
                {t.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
