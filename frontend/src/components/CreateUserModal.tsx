'use client';

import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { User } from '@/lib/types';
import { api } from '@/lib/api';

interface CreateUserModalProps {
  onClose: () => void;
  onUserCreated: (newUser: User) => void;
}

export default function CreateUserModal({
  onClose,
  onUserCreated,
}: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'user' | 'admin' | 'editor'>('user');
  const [tier, setTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');

  const [canAiDubbing, setCanAiDubbing] = useState(true);
  const [canVoiceOver, setCanVoiceOver] = useState(true);
  const [canCloneVoice, setCanCloneVoice] = useState(false);
  const [canExportSubtitles, setCanExportSubtitles] = useState(true);

  const [maxDuration, setMaxDuration] = useState(30);
  const [monthlyQuota, setMonthlyQuota] = useState(120);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !username.trim()) {
      setErrorMsg('Email and username are required.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const created = await api.createAdminUser({
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        full_name: fullName.trim() || undefined,
        role,
        tier,
        status,
        is_active: status === 'active',
        can_ai_dubbing: canAiDubbing,
        can_voice_over: canVoiceOver,
        can_clone_voice: canCloneVoice,
        can_export_subtitles: canExportSubtitles,
        max_video_duration_minutes: Number(maxDuration),
        monthly_minutes_quota: Number(monthlyQuota),
      });

      onUserCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-600/20 text-accent-400 border border-accent-500/30">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New User Account</h3>
              <p className="text-xs text-slate-400">نیا صارف شامل کریں اور اس کی رسائی کا تعین کریں</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-surface transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Username <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. john_doe"
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Full Name (پورا نام)</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Plan Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500"
              >
                <option value="active">🟢 Active</option>
                <option value="suspended">🔴 Suspended</option>
              </select>
            </div>
          </div>

          {/* Permissions Toggles */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs font-bold text-slate-300">Feature Access Permissions</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 rounded-lg border border-border/80 bg-surface-elevated/40 p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canAiDubbing}
                  onChange={(e) => setCanAiDubbing(e.target.checked)}
                  className="rounded border-border accent-accent-500"
                />
                <span className="text-white">AI Dubbing (ملٹی کریکٹر)</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-border/80 bg-surface-elevated/40 p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canVoiceOver}
                  onChange={(e) => setCanVoiceOver(e.target.checked)}
                  className="rounded border-border accent-accent-500"
                />
                <span className="text-white">Voice Over (وائس اوور)</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-border/80 bg-surface-elevated/40 p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canCloneVoice}
                  onChange={(e) => setCanCloneVoice(e.target.checked)}
                  className="rounded border-border accent-accent-500"
                />
                <span className="text-white">Voice Cloning</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-border/80 bg-surface-elevated/40 p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canExportSubtitles}
                  onChange={(e) => setCanExportSubtitles(e.target.checked)}
                  className="rounded border-border accent-accent-500"
                />
                <span className="text-white">Subtitle Export</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-slate-300 hover:text-white hover:bg-surface transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Create User Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
