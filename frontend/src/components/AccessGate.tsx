'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Key,
  Lock,
  Unlock,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { api, getStoredLicenseKey, setStoredLicenseKey, getStoredAdminToken, setStoredAdminToken } from '@/lib/api';
import { AccessStatus } from '@/lib/types';

interface AccessContextType {
  status: AccessStatus | null;
  loading: boolean;
  refreshStatus: () => Promise<void>;
  isAdminUnlocked: boolean;
  unlockAdmin: (password: string) => Promise<boolean>;
  lockAdmin: () => void;
}

const AccessContext = createContext<AccessContextType>({
  status: null,
  loading: true,
  refreshStatus: async () => {},
  isAdminUnlocked: false,
  unlockAdmin: async () => false,
  lockAdmin: () => {},
});

export const useAccess = () => useContext(AccessContext);

export default function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Modal input states
  const [keyInput, setKeyInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkStatus = async () => {
    try {
      const storedKey = getStoredLicenseKey();
      const res = await api.getAccessStatus(storedKey || undefined);
      setAccessStatus(res);

      // Check if admin token is stored
      const adminToken = getStoredAdminToken();
      if (adminToken) {
        setIsAdminUnlocked(true);
      }
    } catch (err: any) {
      console.warn('Access check error:', err);
      // If error occurs, fallback to default status
      setAccessStatus({
        allowed: true,
        is_locked: false,
        status: 'active',
        message: 'System active',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [pathname]);

  const handleActivateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setActionError('Barah-e-karam License Key enter karein.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const trimmed = keyInput.trim().toUpperCase();
      const res = await api.verifyLicenseKey(trimmed);
      if (res.allowed) {
        setStoredLicenseKey(trimmed);
        setAccessStatus(res);
        setActionSuccess(`License '${res.client_name || trimmed}' successfully activated!`);
        setKeyInput('');
      } else {
        setActionError(res.message || 'Yeh license key revoked ya invalid hai.');
      }
    } catch (err: any) {
      setActionError(err.message || 'License verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasswordInput.trim()) {
      setActionError('Admin password enter karein.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await api.adminLogin(adminPasswordInput.trim());
      if (res.authenticated && res.token) {
        setStoredAdminToken(res.token);
        setIsAdminUnlocked(true);
        setActionSuccess('Admin master mode unlocked!');
        setShowAdminLogin(false);
        setAdminPasswordInput('');
        // Re-check status
        await checkStatus();
      } else {
        setActionError('Ghalat admin password.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Ghalat admin password.');
    } finally {
      setSubmitting(false);
    }
  };

  const lockAdmin = () => {
    setStoredAdminToken('');
    setIsAdminUnlocked(false);
  };

  const unlockAdmin = async (password: string) => {
    try {
      const res = await api.adminLogin(password);
      if (res.authenticated && res.token) {
        setStoredAdminToken(res.token);
        setIsAdminUnlocked(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const contextValue: AccessContextType = {
    status: accessStatus,
    loading,
    refreshStatus: checkStatus,
    isAdminUnlocked,
    unlockAdmin,
    lockAdmin,
  };

  // If loading initial check, render minimal loader
  if (loading) {
    return (
      <AccessContext.Provider value={contextValue}>
        <div className="min-h-screen flex items-center justify-center bg-background text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
            <p className="text-xs font-medium">Verifying tool license & access permissions...</p>
          </div>
        </div>
      </AccessContext.Provider>
    );
  }

  // Determine if user is locked out
  // Admin unlocked users are never locked out
  const isBlocked = !isAdminUnlocked && accessStatus && (!accessStatus.allowed || accessStatus.is_locked);

  if (isBlocked) {
    const isRevoked = accessStatus.reason === 'revoked';
    const isExpired = accessStatus.reason === 'expired';
    const isGlobal = accessStatus.reason === 'global_lock' || accessStatus.reason === 'remote_revoked';

    return (
      <AccessContext.Provider value={contextValue}>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-red-500 selection:text-white">
          <div className="max-w-md w-full bg-surface border border-red-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
            {/* Top red glow */}
            <div className="absolute -top-16 -left-16 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10">
                <ShieldAlert className="h-8 w-8 animate-pulse" />
              </div>
            </div>

            {/* Title & Explanation */}
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider mb-2">
                {isRevoked ? 'Access Revoked' : isExpired ? 'License Expired' : 'Tool Access Locked'}
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                رسائی بند کر دی گئی ہے
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {accessStatus.message ||
                  'Aap ka access admin ki janib se revoke kar diya gaya hai. Mazeed istamal ke liye admin se rabta karein.'}
              </p>
            </div>

            {/* Client Info Badge if available */}
            {accessStatus.client_name && (
              <div className="mb-6 p-3 rounded-xl bg-surface-elevated/70 border border-border text-xs flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">Client Account</p>
                  <p className="text-slate-200 font-semibold">{accessStatus.client_name}</p>
                </div>
                {accessStatus.license_key && (
                  <div className="text-right">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Key</p>
                    <p className="text-slate-300 font-mono text-[11px]">{accessStatus.license_key}</p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Alerts */}
            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            {actionSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Activate New Key Form */}
            {!showAdminLogin ? (
              <form onSubmit={handleActivateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-accent-400" />
                    <span>Enter New License Key</span>
                  </label>
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="GDUB-XXXX-XXXX-XXXX"
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500 uppercase font-mono tracking-wider"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-md"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      <span>Activate License (لائسنس لگائیں)</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(true);
                      setActionError(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-200 transition flex items-center justify-center gap-1 mx-auto"
                  >
                    <Lock className="h-3 w-3" />
                    <span>Are you the Admin/Owner? Unlock with Admin Password</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Admin Password Login Form */
              <form onSubmit={handleAdminUnlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-purple-400" />
                    <span>Master Admin Password</span>
                  </label>
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Enter admin password (default: admin123)"
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-md"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Admin Master Unlock</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setActionError(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-200 transition"
                  >
                    ← Back to License Key Entry
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-border/60 text-center">
              <button
                type="button"
                onClick={checkStatus}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1.5 mx-auto transition"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Re-check Access Status</span>
              </button>
            </div>
          </div>
        </div>
      </AccessContext.Provider>
    );
  }

  return <AccessContext.Provider value={contextValue}>{children}</AccessContext.Provider>;
}
