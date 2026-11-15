import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  Server,
  User,
  Key,
  Mail,
  Trash2,
  Lock,
  Smartphone,
  HardDrive,
  Database,
  Wifi,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Globe,
  LogIn
} from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { getHealth } from '../api/analytics.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/common/ToastContext.jsx';

export function SettingsPage() {
  const {
    user,
    isAuthenticated,
    updateProfile,
    updateEmail,
    changePassword,
    deleteAccount,
    logout
  } = useAuth();
  const { addToast } = useToast();

  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  // Profile Form States
  const [name, setName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  // Email Form States
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete Account States
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

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

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameLoading(true);
    const res = await updateProfile({ name: name.trim() });
    setNameLoading(false);
    if (res.success) {
      addToast({ type: 'success', title: 'Profile Updated', message: 'Name updated successfully.' });
    } else {
      addToast({ type: 'error', title: 'Update Failed', message: res.error });
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !emailCurrentPassword) return;
    setEmailLoading(true);
    const res = await updateEmail({ newEmail: newEmail.trim(), currentPassword: emailCurrentPassword });
    setEmailLoading(false);
    if (res.success) {
      addToast({ type: 'success', title: 'Email Changed', message: 'Your email address was updated successfully.' });
      setNewEmail('');
      setEmailCurrentPassword('');
    } else {
      addToast({ type: 'error', title: 'Email Update Failed', message: res.error });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      addToast({ type: 'error', title: 'Invalid Password', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({ type: 'error', title: 'Mismatch', message: 'New passwords do not match.' });
      return;
    }
    setPasswordLoading(true);
    const res = await changePassword({ currentPassword, newPassword });
    setPasswordLoading(false);
    if (res.success) {
      addToast({ type: 'success', title: 'Password Changed', message: 'Password updated. Other sessions logged out.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      addToast({ type: 'error', title: 'Change Password Failed', message: res.error });
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deleteConfirmPassword) return;
    setDeleteLoading(true);
    const res = await deleteAccount({ currentPassword: deleteConfirmPassword });
    setDeleteLoading(false);
    if (res.success) {
      addToast({ type: 'info', title: 'Account Deleted', message: 'Your account and all links have been permanently deleted.' });
    } else {
      addToast({ type: 'error', title: 'Deletion Failed', message: res.error });
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Settings & Account Management
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          User profile, credentials, database status, and network topology
        </p>
      </div>

      {/* Account Settings Section */}
      {isAuthenticated ? (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Account Profile"
              subtitle="Your identity and personal information"
              action={
                <Badge variant="brand" size="sm">
                  {user?.role === 'admin' ? 'Administrator' : 'Standard User'}
                </Badge>
              }
            />

            <div className="pt-2 space-y-6">
              {/* Profile Details Header */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200/80 dark:border-white/[0.08]">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center text-lg font-extrabold text-white shadow-md shadow-brand-500/20">
                  {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={logout} className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300">
                  Sign Out
                </Button>
              </div>

              {/* Edit Display Name */}
              <form onSubmit={handleUpdateName} className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Display Name
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter display name"
                    className="flex-1 rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-white/[0.08] px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 font-medium"
                  />
                  <Button type="submit" variant="secondary" size="sm" isLoading={nameLoading}>
                    Save Name
                  </Button>
                </div>
              </form>

              {/* Update Email Form */}
              <form onSubmit={handleUpdateEmail} className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Update Email Address</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Requires current password confirmation</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="New email address"
                    required
                    className="rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-white/[0.08] px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 font-medium"
                  />
                  <input
                    type="password"
                    value={emailCurrentPassword}
                    onChange={(e) => setEmailCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    required
                    className="rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-white/[0.08] px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 font-medium"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm" isLoading={emailLoading}>
                  Update Email
                </Button>
              </form>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Change Password</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Will securely revoke all other active sessions across all devices
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    required
                    className="rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-white/[0.08] px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 font-medium"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    required
                    className="rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-white/[0.08] px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 font-medium"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-white/[0.08] px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 font-medium"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm" isLoading={passwordLoading}>
                  Change Password
                </Button>
              </form>

              {/* Danger Zone: Delete Account */}
              <div className="pt-4 border-t border-rose-500/20">
                <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" /> Danger Zone: Delete Account
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Permanently delete your account, all short links you created, and all associated click analytics events.
                      This action cannot be undone.
                    </p>
                  </div>

                  {!showDeleteConfirm ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-semibold"
                    >
                      I want to delete my account
                    </Button>
                  ) : (
                    <form onSubmit={handleDeleteAccount} className="space-y-3 pt-2">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="password"
                          value={deleteConfirmPassword}
                          onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                          placeholder="Type password to confirm permanent deletion"
                          required
                          className="flex-1 rounded-xl bg-white dark:bg-[#080a0f] border border-rose-500/40 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 font-medium"
                        />
                        <div className="flex gap-2">
                          <Button type="submit" variant="danger" size="sm" isLoading={deleteLoading}>
                            Permanently Delete
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteConfirmPassword('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 mx-auto">
              <LogIn className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sign In to Shortly</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Authenticate to associate shortened links with your account, edit them anytime, and view private analytics.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="sm">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

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
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200/80 dark:border-white/[0.08] space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Connectivity</span>
            <div className="flex items-center gap-2">
              {health?.status === 'healthy' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Operational</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">Disconnected</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200/80 dark:border-white/[0.08] space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Database Engine</span>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {health?.database?.engine || 'MongoDB Atlas'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080a0f] border border-slate-200/80 dark:border-white/[0.08] space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Uptime</span>
            <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
              {health?.uptime ? `${Math.floor(health.uptime)} seconds` : 'N/A'}
            </p>
          </div>
        </div>
      </Card>

      {/* VS Code Port Forwarding Guide */}
      <Card>
        <CardHeader
          title="VS Code Port Forwarding (Mobile & Remote Testing)"
          subtitle="How to open Shortly on your smartphone through forwarded tunnels"
        />

        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-300">
            <Globe className="w-5 h-5 shrink-0 text-brand-600 dark:text-brand-400 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Dual-Port Forwarding Architecture</p>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                VS Code forwards ports individually to separate HTTPS addresses:
                one for the Vite frontend (Port 5173) and one for the Express backend (Port 5000).
                For short link redirects to work on your phone, <strong className="text-slate-900 dark:text-white">PUBLIC_URL</strong> must be set to the backend forwarded URL (Port 5000), not localhost or port 5173!
              </p>
            </div>
          </div>

          <ol className="list-decimal list-inside space-y-3 pl-2 text-slate-600 dark:text-slate-300">
            <li>
              <strong className="text-slate-900 dark:text-white">Forward both ports in VS Code:</strong> Go to the <strong className="text-slate-800 dark:text-slate-100">Ports</strong> tab in VS Code. Forward Port <code className="bg-slate-100 dark:bg-[#07090f] px-1.5 py-0.5 rounded text-brand-600 dark:text-brand-300 font-mono">5173</code> (Frontend) and Port <code className="bg-slate-100 dark:bg-[#07090f] px-1.5 py-0.5 rounded text-brand-600 dark:text-brand-300 font-mono">5000</code> (Backend).
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white">Make Port 5000 Public:</strong> Right-click Port 5000 in the Ports tab &rarr; <strong className="text-slate-800 dark:text-slate-100">Port Visibility</strong> &rarr; <strong className="text-emerald-600 dark:text-emerald-400">Public</strong>.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-white">Open on Mobile:</strong> Open the <strong className="text-slate-800 dark:text-slate-100">Port 5173</strong> Forwarded Address on your phone.
            </li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
