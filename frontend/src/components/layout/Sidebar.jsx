import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Link2, Settings, Shield, ExternalLink } from 'lucide-react';

export function Sidebar({ isOpen, onClose, backendHealthy = true }) {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/create', label: 'Create Link', icon: PlusCircle },
    { to: '/links', label: 'Link Library', icon: Link2 },
    { to: '/settings', label: 'Settings', icon: Settings }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0b0f19] border-r border-slate-800/80 text-slate-300">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800/80">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
          <Link2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white tracking-tight">Shortly</span>
            <span className="text-[10px] uppercase font-semibold bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded-full border border-brand-500/20">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">URL & Click Analytics</p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
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
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Backend Health & Quick Status Footer */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                backendHealthy ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 animate-pulse'
              }`}
            />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-200">
                {backendHealthy ? 'Core Engine Online' : 'Engine Offline'}
              </span>
              <span className="text-[10px] text-slate-400">Atomic JSON Persistence</span>
            </div>
          </div>
          <Shield className="w-4 h-4 text-slate-400" />
        </div>
      </div>
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
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
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
