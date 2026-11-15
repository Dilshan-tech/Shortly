import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Plus,
  RefreshCw,
  LogIn,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Sun,
  Moon,
  Link2
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../common/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

export function Navbar({ onMenuClick, onRefresh, isRefreshing = false }) {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/overview') return 'Overview & Analytics';
    if (path === '/create') return 'Create Short Link';
    if (path === '/links') return 'Link Library';
    if (path.startsWith('/analytics/')) return 'Detailed Link Analytics';
    if (path === '/settings') return 'Settings & Account';
    return 'Shortly';
  };

  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-2xl border-b border-zinc-200/80 dark:border-white/[0.07] px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-semibold text-zinc-400 dark:text-zinc-500">Platform</span>
          <span className="hidden sm:inline text-xs text-zinc-300 dark:text-zinc-700">/</span>
          <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] transition-all"
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
        </button>

        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            isLoading={isRefreshing}
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            title="Refresh data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
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

        {/* User Authentication Menu */}
        {isAuthenticated ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:border-white/[0.09] text-zinc-800 dark:text-zinc-200 transition-all focus:outline-none shadow-xs"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center text-[11px] font-bold text-white shadow-xs">
                {getInitials(user?.name, user?.email)}
              </div>
              <span className="hidden sm:inline text-xs font-bold max-w-[120px] truncate">
                {user?.name || user?.email}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#111115] border border-zinc-200/90 dark:border-white/[0.1] shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.85)] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-white/[0.06]">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-zinc-400" />
                    Account Settings
                  </Link>
                  <Link
                    to="/links"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    My Short Links
                  </Link>
                </div>

                <div className="pt-1 border-t border-zinc-100 dark:border-white/[0.06]">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login">
            <Button variant="secondary" size="sm">
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
