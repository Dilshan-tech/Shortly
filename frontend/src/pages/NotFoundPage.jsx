import React from 'react';
import { Link } from 'react-router-dom';
import { Link2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button.jsx';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shadow-inner">
        <Link2 className="w-7 h-7" />
      </div>
      <h2 className="text-2xl font-bold text-white">Page Not Found</h2>
      <p className="text-sm text-slate-400 max-w-sm">
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
