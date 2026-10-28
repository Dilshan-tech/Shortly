import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Navbar } from './Navbar.jsx';
import { getHealth } from '../../api/analytics.js';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);

  // Check backend health on mount and periodically
  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        await getHealth();
        if (isMounted) setBackendHealthy(true);
      } catch {
        if (isMounted) setBackendHealthy(false);
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100 font-sans">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        backendHealthy={backendHealthy}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
