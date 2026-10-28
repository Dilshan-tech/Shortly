import React from 'react';
import { Menu, Plus, RefreshCw, Link2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../common/Button.jsx';

export function Navbar({ onMenuClick, onRefresh, isRefreshing = false }) {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/overview') return 'Overview & Analytics';
    if (path === '/create') return 'Create Short Link';
    if (path === '/links') return 'Link Library';
    if (path.startsWith('/analytics/')) return 'Detailed Link Analytics';
    if (path === '/settings') return 'Settings & Deployment';
    return 'Shortly';
  };

  return (
    <header className="sticky top-0 z-20 bg-[#0b0f19]/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            isLoading={isRefreshing}
            className="text-slate-400 hover:text-slate-200"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline ml-1 text-xs">Refresh</span>
          </Button>
        )}

        {location.pathname !== '/create' && (
          <Link to="/create">
            <Button variant="primary" size="sm" icon={Plus}>
              <span className="hidden xs:inline">Create Link</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
