import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Smartphone,
  HardDrive,
  Database,
  Wifi,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { getHealth } from '../api/analytics.js';

export function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await getHealth();
      setHealth(res);
    } catch (err) {
      setError('Failed to connect to backend engine.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          System Configuration & Deployment
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Runtime environment, network topology, storage status, and mobile testing guidance
        </p>
      </div>

      {/* Backend Engine Status Card */}
      <Card>
        <CardHeader
          title="Backend Core Status"
          subtitle="Real-time connectivity and service configuration"
          action={
            <Button
              size="xs"
              variant="secondary"
              onClick={checkHealth}
              isLoading={checking}
              icon={RefreshCw}
            >
              Ping Server
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Connectivity</span>
            <div className="flex items-center gap-2">
              {health?.status === 'healthy' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">Operational</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-sm font-semibold text-rose-300">Disconnected</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Public Short-Link Base</span>
            <p className="text-xs font-mono text-brand-300 truncate">
              {health?.publicUrl || 'http://localhost:5000'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Uptime</span>
            <p className="text-xs font-mono text-slate-200">
              {health?.uptime ? `${Math.floor(health.uptime)} seconds` : 'N/A'}
            </p>
          </div>
        </div>
      </Card>

      {/* Mobile Testing & LAN Guide */}
      <Card>
        <CardHeader
          title="Testing From Mobile Devices (LAN Wi-Fi)"
          subtitle="How to scan QR codes and test redirects from your smartphone"
        />

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed pt-1">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-brand-950/30 border border-brand-500/20 text-brand-200">
            <Wifi className="w-5 h-5 shrink-0 text-brand-400 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Local Area Network (LAN) Setup</p>
              <p className="text-slate-300 mt-1">
                Your mobile phone cannot resolve <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">localhost</code> on your laptop because localhost refers to the phone itself.
                To test from a phone connected to the same Wi-Fi router:
              </p>
            </div>
          </div>

          <ol className="list-decimal list-inside space-y-2.5 pl-2 text-slate-300">
            <li>
              <strong className="text-white">Find your computer's local IP address:</strong> Run{' '}
              <code className="bg-slate-950 px-2 py-0.5 rounded font-mono text-brand-300">ipconfig</code> on Windows (or <code className="bg-slate-950 px-2 py-0.5 rounded font-mono text-brand-300">ifconfig / ip a</code> on macOS/Linux).
              Look for IPv4 address e.g. <code className="text-emerald-300 font-mono">192.168.1.105</code>.
            </li>
            <li>
              <strong className="text-white">Set the public short-link base:</strong> Start the backend with:
              <pre className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-[11px] text-brand-300 mt-1 overflow-x-auto">
                $env:PUBLIC_URL="http://192.168.1.105:5000"; npm start --prefix backend
              </pre>
            </li>
            <li>
              <strong className="text-white">Allow Firewall Access:</strong> Ensure Windows Firewall allows incoming connections on port 5000 and 5173 for Private networks.
            </li>
            <li>
              <strong className="text-white">Scan the QR code:</strong> Any QR code generated by Shortly will automatically encode the reachable LAN IP. When scanned with your phone's camera, your phone will visit the backend, trigger a real mobile analytics event, and redirect seamlessly!
            </li>
          </ol>
        </div>
      </Card>

      {/* JSON Storage & MongoDB Migration Architecture */}
      <Card>
        <CardHeader
          title="Persistence Architecture & Database Migration"
          subtitle="How data durability works and how to transition to MongoDB"
        />

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold">
                <HardDrive className="w-4 h-4 text-brand-400" />
                <span>Current: Atomic JSON Store</span>
              </div>
              <p className="text-slate-400">
                Data is stored in serialized files (<code className="text-slate-200">urls.json</code> and <code className="text-slate-200">clicks.json</code>).
                Writes use an in-memory queue and atomic renaming (<code className="text-slate-200">.tmp</code>) to prevent data corruption across server restarts.
              </p>
              <p className="text-[11px] text-amber-300/80 pt-1">
                * Concurrency limit: Ideal for single-process instances. Ephemeral cloud filesystems (e.g., standard Heroku) require persistent volumes.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Future: MongoDB Repository Layer</span>
              </div>
              <p className="text-slate-400">
                Shortly is architected with a decoupled repository pattern (<code className="text-slate-200">UrlRepository</code> & <code className="text-slate-200">ClickRepository</code>).
                To upgrade to MongoDB or PostgreSQL, replace the file repository methods with Mongoose or Prisma queries without altering controllers or services.
              </p>
              <p className="text-[11px] text-emerald-300/80 pt-1">
                * Zero controller changes required for database engine swaps.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
