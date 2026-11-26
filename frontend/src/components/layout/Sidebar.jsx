import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Link2,
  Settings
} from 'lucide-react';

export function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/create', label: 'Create Link', icon: PlusCircle },
    { to: '/links', label: 'Link Library', icon: Link2 },
    { to: '/settings', label: 'Settings', icon: Settings }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white/95 dark:bg-[#0b0b0e]/95 backdrop-blur-2xl border-r border-zinc-200/80 dark:border-white/[0.07] text-zinc-600 dark:text-zinc-400 transition-colors">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-100 dark:border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-brand-500/30 shrink-0">
          <Link2 className="w-4.5 h-4.5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-zinc-900 dark:text-white tracking-tight">Shortly</span>
            <span className="text-[10px] font-mono uppercase font-bold bg-brand-50 text-brand-600 border border-brand-200/70 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-500/30 px-1.5 py-0.2 rounded-full">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Link Infrastructure & Analytics</p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3.5 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
          Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 border border-brand-200/90 shadow-xs dark:bg-white/[0.08] dark:text-white dark:border-white/[0.12] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.04]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (fixed) */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (overlay) */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
