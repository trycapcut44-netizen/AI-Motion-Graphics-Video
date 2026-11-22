'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Globe2,
  LayoutDashboard,
  Film,
  Languages,
  Activity,
  Settings,
  PlusCircle,
  Shield,
  Lock,
  Unlock,
  LogOut,
  X,
  Loader2,
  Key,
} from 'lucide-react';
import { useAccess } from '@/components/AccessGate';

export default function Navbar() {
  const pathname = usePathname();
  const { isAdminUnlocked, unlockAdmin, lockAdmin } = useAccess();

  // Admin Login Quick Modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filter nav items: ONLY show "Admin Panel" if Admin is authenticated!
  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'New Project', href: '/new', icon: PlusCircle },
    { name: 'Projects', href: '/projects', icon: Film },
    { name: 'Languages & Voices', href: '/languages', icon: Languages },
    { name: 'Usage & Costs', href: '/usage', icon: Activity },
    ...(isAdminUnlocked
      ? [{ name: 'Admin Panel', href: '/admin', icon: Shield, badge: 'Control' }]
      : []),
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMsg('Password enter karein.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const success = await unlockAdmin(passwordInput.trim());
    setSubmitting(false);

    if (success) {
      setShowAdminModal(false);
      setPasswordInput('');
    } else {
      setErrorMsg('Ghalat Admin Password.');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-600/20 text-accent-500 border border-accent-500/30 group-hover:bg-accent-600/30 transition">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-white tracking-tight">GlobalDub</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-400 border border-accent-500/30">AI</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-none">Multilingual Video Localization</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-surface-elevated text-white border border-border shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-accent-400' : 'text-slate-500'}`} />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action Buttons & Admin State */}
          <div className="flex items-center gap-3">
            {/* If Admin is unlocked, show Admin Indicator & Logout */}
            {isAdminUnlocked ? (
              <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/30 rounded-xl px-2.5 py-1 text-xs text-purple-300">
                <Shield className="h-3.5 w-3.5 text-purple-400" />
                <span className="font-semibold hidden sm:inline">Admin Mode</span>
                <button
                  type="button"
                  onClick={lockAdmin}
                  className="ml-1 p-1 hover:text-white hover:bg-purple-500/20 rounded transition"
                  title="Lock Admin Mode"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            ) : (
              /* Discreet Admin Key Login Trigger */
              <button
                type="button"
                onClick={() => {
                  setShowAdminModal(true);
                  setErrorMsg(null);
                }}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-surface transition"
                title="Admin Authentication"
              >
                <Lock className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>AI Engine Online</span>
            </div>

            <Link
              href="/new"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium transition shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Dub</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Admin Login Quick Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-purple-500/30 bg-surface shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                  <Key className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Admin Master Login</h3>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Master Admin Password
                </label>
                <input
                  type="password"
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password (default: admin123)"
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Unlock Admin Panel</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
