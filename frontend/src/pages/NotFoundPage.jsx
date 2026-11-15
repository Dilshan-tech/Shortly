import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Link2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/common/Button.jsx';
import { appConfig } from '../config/appConfig.js';

export function NotFoundPage() {
  const location = useLocation();
  const [attemptingRedirect, setAttemptingRedirect] = useState(false);

  useEffect(() => {
    // If visitor opened a potential short code on the frontend port (e.g. /Butterfly),
    // automatically bounce them to the backend redirect handler on port 5000.
    const path = location.pathname.replace(/^\/+/, '');
    const isSingleSlug = path && !path.includes('/');
    const reserved = ['create', 'links', 'settings', 'analytics', 'api', 'login', 'register'];

    if (isSingleSlug && !reserved.includes(path.toLowerCase()) && appConfig.apiBaseUrl) {
      setAttemptingRedirect(true);
      window.location.replace(`${appConfig.apiBaseUrl}/${path}${location.search}`);
    }
  }, [location]);

  if (attemptingRedirect) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <Loader2 className="w-8 h-8 text-brand-600 dark:text-brand-400 animate-spin" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Redirecting to destination...</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Opening your short link via backend service.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-inner">
        <Link2 className="w-7 h-7" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Page Not Found</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        The dashboard view you are trying to reach does not exist or may have been moved.
      </p>
      <Link to="/">
        <Button variant="primary" icon={ArrowLeft}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
