'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  UserPlus,
  Sliders,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Film,
  Mic,
  Clock,
  Sparkles,
  RefreshCw,
  Power,
  ChevronRight,
  Key,
  Globe,
  Lock,
  Unlock,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Radio,
  Wifi,
  RadioTower,
  LogOut,
} from 'lucide-react';
import { User, AdminStats, ClientLicense, SystemAccessConfig } from '@/lib/types';
import { api } from '@/lib/api';
import { useAccess } from '@/components/AccessGate';
import AdminUserModal from '@/components/AdminUserModal';
import CreateUserModal from '@/components/CreateUserModal';
import CreateLicenseModal from '@/components/CreateLicenseModal';

export default function AdminPanelPage() {
  const { isAdminUnlocked, unlockAdmin, lockAdmin } = useAccess();
  const [activeTab, setActiveTab] = useState<'licenses' | 'users'>('licenses');

  // Admin Auth Gate State
  const [adminAuthInput, setAdminAuthInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  // License State
  const [licenses, setLicenses] = useState<ClientLicense[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemAccessConfig | null>(null);
  const [showCreateLicenseModal, setShowCreateLicenseModal] = useState(false);
  const [remoteUrlInput, setRemoteUrlInput] = useState('');
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [testingRemote, setTestingRemote] = useState(false);
  const [remoteTestResult, setRemoteTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Admin Password Management
  const [currentAdminPw, setCurrentAdminPw] = useState('');
  const [newAdminPw, setNewAdminPw] = useState('');
  const [pwChanging, setPwChanging] = useState(false);

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  // Modals
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Status feedback toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminAuthInput.trim()) {
      setAuthError('Barah-e-karam Master Admin Password enter karein.');
      return;
    }

    setAuthenticating(true);
    setAuthError(null);
    try {
      const ok = await unlockAdmin(adminAuthInput.trim());
      if (ok) {
        setAdminAuthInput('');
        loadData();
      } else {
        setAuthError('Ghalat Admin Password. Access Denied.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setAuthenticating(false);
    }
  };

  const loadData = async () => {
    try {
      const [statsData, usersData, licensesData, configData] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getAdminUsers({
          search: search || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          tier: tierFilter || undefined,
        }).catch(() => []),
        api.getAdminLicenses().catch(() => []),
        api.getAdminSystemConfig().catch(() => null),
      ]);

      if (statsData) setStats(statsData);
      setUsers(usersData);
      setLicenses(licensesData);
      if (configData) {
        setSystemConfig(configData);
        setRemoteUrlInput(configData.remote_kill_switch_url || '');
        setRemoteEnabled(configData.remote_kill_switch_enabled);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      showToast(err.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdminUnlocked) {
      loadData();
    }
  }, [isAdminUnlocked, roleFilter, statusFilter, tierFilter]);

  // Handle Search debounce
  useEffect(() => {
    if (isAdminUnlocked) {
      const timer = setTimeout(() => {
        loadData();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search, isAdminUnlocked]);

  // 1-Click Toggle Active / Suspended for User
  const handleToggleStatus = async (user: User) => {
    try {
      const updated = await api.toggleUserStatus(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      showToast(
        `User '${updated.username}' is now ${updated.is_active ? 'ACTIVE 🟢' : 'SUSPENDED 🔴'}.`
      );
      api.getAdminStats().then(setStats).catch(console.error);
    } catch (err: any) {
      showToast(err.message || 'Status toggle failed', 'error');
    }
  };

  // 1-Click Revoke License
  const handleRevokeLicense = async (lic: ClientLicense) => {
    if (!confirm(`Kya aap waqai '${lic.client_name}' ka access REVOKE (khatam) karna chahte hain? Yeh client foran lock ho jaye ga.`)) {
      return;
    }

    try {
      const updated = await api.revokeAdminLicense(lic.id);
      setLicenses((prev) => prev.map((l) => (l.id === lic.id ? updated : l)));
      showToast(`Access for '${lic.client_name}' has been REVOKED 🔴! Client is now locked out.`, 'error');
    } catch (err: any) {
      showToast(err.message || 'Revocation failed', 'error');
    }
  };

  // 1-Click Restore License
  const handleRestoreLicense = async (lic: ClientLicense) => {
    try {
      const updated = await api.restoreAdminLicense(lic.id);
      setLicenses((prev) => prev.map((l) => (l.id === lic.id ? updated : l)));
      showToast(`Access for '${lic.client_name}' has been RESTORED 🟢!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Restore failed', 'error');
    }
  };

  // Delete License
  const handleDeleteLicense = async (lic: ClientLicense) => {
    if (!confirm(`Delete license key '${lic.license_key}' permanently?`)) return;
    try {
      await api.deleteAdminLicense(lic.id);
      setLicenses((prev) => prev.filter((l) => l.id !== lic.id));
      showToast(`License '${lic.license_key}' deleted permanently.`);
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  // Toggle Global Tool Kill-Switch
  const handleToggleGlobalLock = async () => {
    if (!systemConfig) return;
    const targetState = !systemConfig.is_global_locked;
    const confirmMsg = targetState
      ? '⚠️ EMERGENCY LOCKDOWN: Kya aap pure tool ka access tamam clients ke liye foran band karna chahte hain?'
      : 'Kya aap tool ka global access dobara kholna chahte hain?';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await api.toggleGlobalLock(targetState);
      setSystemConfig((prev) => (prev ? { ...prev, is_global_locked: res.is_global_locked } : null));
      showToast(
        targetState
          ? 'EMERGENCY LOCKDOWN ACTIVATED 🔴! All non-admin clients are now locked out.'
          : 'Global Access Unlocked 🟢! Clients can use the tool.',
        targetState ? 'error' : 'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Global lock toggle failed', 'error');
    }
  };

  // Save Remote Config
  const handleSaveRemoteConfig = async () => {
    try {
      const res = await api.updateRemoteConfig(remoteEnabled, remoteUrlInput.trim());
      setSystemConfig((prev) =>
        prev
          ? {
              ...prev,
              remote_kill_switch_enabled: res.remote_kill_switch_enabled,
              remote_kill_switch_url: res.remote_kill_switch_url,
            }
          : null
      );
      showToast('Remote Kill-Switch configuration saved successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save remote config', 'error');
    }
  };

  // Test Remote URL
  const handleTestRemote = async () => {
    if (!remoteUrlInput.trim()) {
      showToast('Please enter a valid URL first.', 'error');
      return;
    }

    setTestingRemote(true);
    setRemoteTestResult(null);
    try {
      const res = await api.testRemoteUrl(remoteUrlInput.trim());
      setRemoteTestResult(res);
      if (res.success) {
        showToast('Remote URL connection successful!');
      } else {
        showToast(`Remote check failed: ${res.message}`, 'error');
      }
    } catch (err: any) {
      setRemoteTestResult({ success: false, message: err.message });
      showToast(err.message || 'Remote test failed', 'error');
    } finally {
      setTestingRemote(false);
    }
  };

  // Change Admin Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdminPw || !newAdminPw) {
      showToast('Both current and new passwords are required.', 'error');
      return;
    }

    setPwChanging(true);
    try {
      await api.changeAdminPassword(currentAdminPw, newAdminPw);
      showToast('Master Admin Password changed successfully! Keep this safe.');
      setCurrentAdminPw('');
      setNewAdminPw('');
    } catch (err: any) {
      showToast(err.message || 'Password update failed', 'error');
    } finally {
      setPwChanging(false);
    }
  };

  const handleCopyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 3000);
  };

  if (!isAdminUnlocked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-purple-500/30 bg-surface shadow-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-lg shadow-purple-500/10">
              <Lock className="h-8 w-8" />
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider mb-2">
              Restricted Area
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">Master Admin Access Required</h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Yeh area sirf system administrator ke liye makhsoos hai. Barah-e-karam apna Master Admin Password enter karein.
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-purple-400" />
                <span>Master Admin Password</span>
              </label>
              <input
                type="password"
                autoFocus
                required
                value={adminAuthInput}
                onChange={(e) => setAdminAuthInput(e.target.value)}
                placeholder="Enter password (default: admin123)"
                className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={authenticating}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-md"
            >
              {authenticating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>Authenticate Admin (لاگ ان کریں)</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 shadow-xl border text-xs font-bold flex items-center gap-2 animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
              : 'bg-rose-950 border-rose-500 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-600/20 text-accent-400 border border-accent-500/30">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Admin Panel &amp; Access Control</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-400 border border-accent-500/30">
                  ایڈمن کنٹرول
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate client licenses, revoke access instantly in 1-click, and configure emergency kill-switches.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={lockAdmin}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white text-xs font-bold transition shadow-sm"
            title="Lock Admin Mode and hide from menu"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Exit Admin Mode (لاگ آؤٹ)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            className="p-2 rounded-xl border border-border bg-surface text-slate-400 hover:text-white transition"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'licenses' ? (
            <button
              type="button"
              onClick={() => setShowCreateLicenseModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition shadow-sm"
            >
              <Key className="h-4 w-4" />
              <span>Issue Client License (نیا لائسنس بنائیں)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add User (نیا صارف)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('licenses')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'licenses'
              ? 'border-accent-500 text-white bg-surface-elevated/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="h-4 w-4 text-accent-400" />
          <span>Client Licenses &amp; Kill-Switch (لائسنس اور کِل سوئچ)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-accent-500/20 text-accent-300 font-mono">
            {licenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'users'
              ? 'border-accent-500 text-white bg-surface-elevated/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4 text-blue-400" />
          <span>User Accounts &amp; Quotas (صارفین کے اکاؤنٹس)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono">
            {users.length}
          </span>
        </button>
      </div>

      {/* TAB 1: CLIENT LICENSES & KILL-SWITCH */}
      {activeTab === 'licenses' && (
        <div className="space-y-6">
          {/* Master Emergency Kill-Switch & Remote Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Global Master Kill-Switch Card */}
            <div
              className={`rounded-2xl border p-5 transition ${
                systemConfig?.is_global_locked
                  ? 'border-red-500 bg-red-950/20 shadow-lg shadow-red-500/10'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      systemConfig?.is_global_locked
                        ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    <Power className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Master Tool Kill-Switch (گلوبل کِل سوئچ)</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          systemConfig?.is_global_locked
                            ? 'bg-red-500 text-white'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {systemConfig?.is_global_locked ? 'LOCKED 🔴' : 'ACTIVE 🟢'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {systemConfig?.is_global_locked
                        ? 'تمام کلائنٹس کا ایکسس بند ہے۔ کوئی بھی ویڈیو ڈب یا اپلوڈ نہیں کر سکتا۔'
                        : 'ٹول مکمل فعال ہے۔ لائسنس یافتہ کلائنٹس آسانی سے ویڈیو ڈب کر سکتے ہیں۔'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleGlobalLock}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 ${
                    systemConfig?.is_global_locked
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>
                    {systemConfig?.is_global_locked ? 'Unlock Tool (ٹول کھولیں)' : 'Lock Entire Tool (فوری بند کریں)'}
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Instant Revocation Info Card */}
            <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col justify-between">
              <div className="flex items-start gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">1-Click Client Access Revocation (فوری ایکسس خاتمہ)</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    اگر آپ نے کسی کو یہ ٹول استعمال کرنے کے لیے دیا ہے، تو نیچے دی گئی لسٹ میں سے اس کے نام کے آگے موجود{' '}
                    <span className="text-red-400 font-semibold">&quot;Revoke Access&quot;</span> بٹن پر کلک کریں۔ کلائنٹ کے سامنے فوری لاک اسکرین آ جائے گی اور اس کا کام رک جائے گا۔
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Client Licenses Table */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Issued Client Licenses (جاری کردہ کلائنٹ لائسنس)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 font-mono">
                    {licenses.length} keys
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Manage client access keys and revoke them in real-time.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateLicenseModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition shadow-sm"
              >
                <Key className="h-3.5 w-3.5" />
                <span>+ New License</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-surface-elevated/60 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Client Name (کلائنٹ)</th>
                    <th className="py-3 px-4">License Key (کی)</th>
                    <th className="py-3 px-4">Status &amp; Access (حالت)</th>
                    <th className="py-3 px-4">Validity / Expiry</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Instant Control (کنٹرول)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {licenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No client licenses issued yet. Click &quot;+ New License&quot; to generate one.
                      </td>
                    </tr>
                  ) : (
                    licenses.map((lic) => {
                      const isRevoked = lic.status === 'revoked' || !lic.is_active;
                      const isExpired = lic.status === 'expired';

                      return (
                        <tr
                          key={lic.id}
                          className={`hover:bg-surface-elevated/40 transition ${
                            isRevoked ? 'bg-red-500/[0.04]' : ''
                          }`}
                        >
                          {/* Client Name */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{lic.client_name}</span>
                              {lic.notes && (
                                <span className="text-[10px] text-slate-500 font-normal">({lic.notes})</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">{lic.device_info || 'Any Machine'}</div>
                          </td>

                          {/* License Key */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-accent-400 bg-background px-2 py-1 rounded border border-border">
                                {lic.license_key}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyKey(lic.id, lic.license_key)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-surface-elevated transition"
                                title="Copy License Key"
                              >
                                {copiedKeyId === lic.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isRevoked
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : isExpired
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {isRevoked ? 'REVOKED 🔴' : isExpired ? 'EXPIRED 🟡' : 'ACTIVE 🟢'}
                            </span>
                          </td>

                          {/* Validity */}
                          <td className="py-3 px-4 text-slate-300">
                            {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : 'Lifetime (تادم حیات)'}
                          </td>

                          {/* Last Active */}
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {lic.last_used_at ? new Date(lic.last_used_at).toLocaleTimeString() : 'Never'}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isRevoked ? (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeLicense(lic)}
                                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white transition text-xs font-bold"
                                  title="Revoke client access immediately"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  <span>Revoke Access (ختم کریں)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreLicense(lic)}
                                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white transition text-xs font-bold"
                                  title="Restore client access"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  <span>Restore (بحال کریں)</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteLicense(lic)}
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition"
                                title="Delete License Key"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remote Cloud Kill-Switch & Master Admin Security */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Remote Cloud Kill-Switch Configuration */}
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-accent-400" />
                  <h3 className="text-sm font-bold text-white">Remote Cloud Kill-Switch (آن لائن ریموٹ کِل سوئچ)</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-slate-400">Enable</span>
                  <input
                    type="checkbox"
                    checked={remoteEnabled}
                    onChange={(e) => setRemoteEnabled(e.target.checked)}
                    className="rounded border-slate-700 text-accent-500 focus:ring-accent-500 h-4 w-4"
                  />
                </label>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                اگر آپ نے یہ ٹول کسی اور کے لیپ ٹاپ یا کمپیوٹر میں کاپی کر کے دیا ہے، تو آپ کسی بھی مفت ریموٹ JSON لنک (جیسے GitHub Gist یا Pastebin) کے ذریعے کسی بھی وقت انٹرنیٹ سے اس کا ایکسس گھر بیٹھے بند کر سکتے ہیں۔
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Remote JSON URL (e.g. GitHub Gist Raw / API endpoint)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={remoteUrlInput}
                    onChange={(e) => setRemoteUrlInput(e.target.value)}
                    placeholder="https://raw.githubusercontent.com/.../status.json"
                    className="flex-1 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestRemote}
                    disabled={testingRemote}
                    className="px-3 py-2 rounded-xl border border-border bg-surface-elevated hover:bg-border text-xs font-semibold text-slate-200 transition shrink-0"
                  >
                    {testingRemote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Test URL'}
                  </button>
                </div>
              </div>

              {remoteTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    remoteTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}
                >
                  {remoteTestResult.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <span>{remoteTestResult.message}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-surface-elevated border border-border/60 text-[11px] font-mono text-slate-400 space-y-1">
                <p className="text-accent-400 font-sans font-semibold">Sample Remote JSON format:</p>
                <pre className="text-[10px] text-slate-300">
{`{
  "is_active": true,
  "revoked_keys": ["GDUB-KEY-TO-BLOCK"],
  "message": "Access has been revoked by admin"
}`}
                </pre>
              </div>

              <button
                type="button"
                onClick={handleSaveRemoteConfig}
                className="w-full py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold transition"
              >
                Save Remote Kill-Switch Setting
              </button>
            </div>

            {/* 2. Master Admin Password Configuration */}
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Lock className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Master Admin Password (ایڈمن پاس ورڈ تبدیل کریں)</h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                ایڈمن پینل اور لائسنس کنٹرول کو محفوظ رکھنے کے لیے ماسٹر پاس ورڈ تبدیل کریں۔ ڈیفالٹ پاس ورڈ:{' '}
                <span className="font-mono text-accent-400 font-bold">admin123</span> ہے۔
              </p>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Current Admin Password</label>
                  <input
                    type="password"
                    required
                    value={currentAdminPw}
                    onChange={(e) => setCurrentAdminPw(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">New Admin Password</label>
                  <input
                    type="password"
                    required
                    value={newAdminPw}
                    onChange={(e) => setNewAdminPw(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pwChanging}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {pwChanging ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : 'Update Master Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER ACCOUNTS & QUOTAS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Platform Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold uppercase">Total Users</span>
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-xl font-bold text-white">{stats.total_users}</div>
                <p className="text-[10px] text-slate-500">Platform Accounts</p>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-[11px] font-semibold uppercase">Active Users</span>
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="text-xl font-bold text-emerald-300">{stats.active_users}</div>
                <p className="text-[10px] text-emerald-500/80">Full Platform Access</p>
              </div>

              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-1">
                <div className="flex items-center justify-between text-rose-400">
                  <span className="text-[11px] font-semibold uppercase">Suspended</span>
                  <UserX className="h-4 w-4" />
                </div>
                <div className="text-xl font-bold text-rose-300">{stats.suspended_users}</div>
                <p className="text-[10px] text-rose-500/80">Access Restricted</p>
              </div>

              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-1">
                <div className="flex items-center justify-between text-purple-400">
                  <span className="text-[11px] font-semibold uppercase">AI Dubbing</span>
                  <Film className="h-4 w-4" />
                </div>
                <div className="text-xl font-bold text-purple-300">{stats.ai_dubbing_enabled_users}</div>
                <p className="text-[10px] text-purple-400/80">Active Dubbers</p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold uppercase">Dubbed Minutes</span>
                  <Clock className="h-4 w-4 text-accent-400" />
                </div>
                <div className="text-xl font-bold text-white font-mono">{stats.total_minutes_dubbed}m</div>
                <p className="text-[10px] text-slate-500">Total Processed</p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold uppercase">Engine Status</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-sm font-bold text-emerald-400 uppercase tracking-wide mt-1">Operational</div>
                <p className="text-[10px] text-slate-500">AI &amp; FFmpeg Ready</p>
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-accent-500"
                >
                  <option value="">All Roles (تمام عہدے)</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="editor">Editor</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-accent-500"
                >
                  <option value="">All Statuses (تمام حالتیں)</option>
                  <option value="active">Active (فعال)</option>
                  <option value="suspended">Suspended (معطل)</option>
                </select>

                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-accent-500"
                >
                  <option value="">All Tiers (تمام پلانز)</option>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-surface-elevated/60 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">User Details (صارف کی تفصیل)</th>
                    <th className="py-3.5 px-4">Role &amp; Plan</th>
                    <th className="py-3.5 px-4">Status &amp; Instant Access</th>
                    <th className="py-3.5 px-4">Permissions (اختیارات)</th>
                    <th className="py-3.5 px-4">Quota &amp; Usage</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-accent-400" />
                        <span>Loading platform users...</span>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No users found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isAdmin = u.role === 'admin';
                      const isSuspended = !u.is_active || u.status === 'suspended';
                      const usagePercent = Math.min(
                        100,
                        Math.round((u.used_minutes / Math.max(1, u.monthly_minutes_quota)) * 100)
                      );

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-surface-elevated/40 transition ${
                            isSuspended ? 'bg-rose-500/[0.02]' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold uppercase text-xs ${
                                  isAdmin
                                    ? 'bg-accent-600/20 text-accent-300 border border-accent-500/30'
                                    : isSuspended
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-surface-elevated text-slate-200 border border-border'
                                }`}
                              >
                                {u.full_name ? u.full_name.charAt(0) : u.username.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{u.full_name || u.username}</span>
                                  {isAdmin && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent-500/20 text-accent-300 border border-accent-500/30 font-bold">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-elevated border border-border text-slate-300">
                                {u.role}
                              </span>
                              <div className="text-[10px] text-accent-400 capitalize font-medium">
                                {u.tier} Tier
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                  u.is_active
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-rose-500/20 hover:border-rose-500 hover:text-rose-300'
                                    : 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-300'
                                }`}
                                title="Click to toggle account access"
                              >
                                <Power className="h-3 w-3" />
                                <span>{u.is_active ? 'Active (فعال)' : 'Suspended (معطل)'}</span>
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  u.can_ai_dubbing
                                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                                    : 'bg-surface-elevated text-slate-500 border-border line-through'
                                }`}
                                title={u.can_ai_dubbing ? 'AI Dubbing Allowed' : 'AI Dubbing Disabled'}
                              >
                                🎬 Dubbing
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  u.can_voice_over
                                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                                    : 'bg-surface-elevated text-slate-500 border-border line-through'
                                }`}
                                title={u.can_voice_over ? 'Voice Over Allowed' : 'Voice Over Disabled'}
                              >
                                🎙️ VoiceOver
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1 w-32">
                              <div className="flex justify-between text-[10px] text-slate-300 font-mono">
                                <span>{u.used_minutes}m</span>
                                <span className="text-slate-500">/ {u.monthly_minutes_quota}m</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden border border-border">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    usagePercent > 90
                                      ? 'bg-rose-500'
                                      : usagePercent > 60
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedUserForEdit(u)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface-elevated text-slate-200 hover:text-white hover:border-accent-500 transition text-[11px] font-semibold"
                                title="Edit User Access Controls"
                              >
                                <Sliders className="h-3 w-3 text-accent-400" />
                                <span>Control Access</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Access Control Modal */}
      {selectedUserForEdit && (
        <AdminUserModal
          user={selectedUserForEdit}
          onClose={() => setSelectedUserForEdit(null)}
          onUserUpdated={(updated) => {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            showToast(`Permissions updated for '${updated.username}'.`);
          }}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onUserCreated={(newUser) => {
            setUsers((prev) => [newUser, ...prev]);
            showToast(`User '${newUser.username}' created successfully.`);
            api.getAdminStats().then(setStats).catch(console.error);
          }}
        />
      )}

      {/* Create License Modal */}
      {showCreateLicenseModal && (
        <CreateLicenseModal
          isOpen={showCreateLicenseModal}
          onClose={() => setShowCreateLicenseModal(false)}
          onCreated={(newLic) => {
            setLicenses((prev) => [newLic, ...prev]);
            showToast(`License '${newLic.license_key}' created for ${newLic.client_name}!`);
          }}
        />
      )}
    </div>
  );
}
