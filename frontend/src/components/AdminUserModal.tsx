'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Film,
  Mic,
  FileText,
  Clock,
  Sparkles,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { User, UserAccessUpdate } from '@/lib/types';
import { api } from '@/lib/api';

interface AdminUserModalProps {
  user: User;
  onClose: () => void;
  onUserUpdated: (updatedUser: User) => void;
}

export default function AdminUserModal({
  user,
  onClose,
  onUserUpdated,
}: AdminUserModalProps) {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [tier, setTier] = useState(user.tier);
  const [isActive, setIsActive] = useState(user.is_active);

  // Granular feature permissions
  const [canAiDubbing, setCanAiDubbing] = useState(user.can_ai_dubbing);
  const [canVoiceOver, setCanVoiceOver] = useState(user.can_voice_over);
  const [canCloneVoice, setCanCloneVoice] = useState(user.can_clone_voice);
  const [canExportSubtitles, setCanExportSubtitles] = useState(user.can_export_subtitles);
  const [canBurnSubtitles, setCanBurnSubtitles] = useState(user.can_burn_subtitles);

  // Quotas
  const [maxDuration, setMaxDuration] = useState(user.max_video_duration_minutes);
  const [monthlyQuota, setMonthlyQuota] = useState(user.monthly_minutes_quota);
  const [usedMinutes, setUsedMinutes] = useState(user.used_minutes);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStatusToggle = (newStatus: 'active' | 'suspended') => {
    setStatus(newStatus);
    setIsActive(newStatus === 'active');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);

      const payload: UserAccessUpdate = {
        role,
        status,
        is_active: isActive,
        tier,
        can_ai_dubbing: canAiDubbing,
        can_voice_over: canVoiceOver,
        can_clone_voice: canCloneVoice,
        can_export_subtitles: canExportSubtitles,
        can_burn_subtitles: canBurnSubtitles,
        max_video_duration_minutes: Number(maxDuration),
        monthly_minutes_quota: Number(monthlyQuota),
        used_minutes: Number(usedMinutes),
      };

      const updated = await api.updateAdminUserAccess(user.id, payload);
      onUserUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user access');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-600/20 text-accent-400 border border-accent-500/30">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Access Control: {user.full_name || user.username}</span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isActive ? 'Active' : 'Suspended'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-surface transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Account Status & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Account Status (اکاؤنٹ اسٹیٹس)
              </label>
              <div className="flex rounded-xl border border-border bg-surface-elevated p-1">
                <button
                  type="button"
                  onClick={() => handleStatusToggle('active')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🟢 Active
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusToggle('suspended')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    !isActive
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔴 Suspend
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Role (عہدہ)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500"
              >
                <option value="user">User (عام صارف)</option>
                <option value="admin">Admin (ایڈمنسٹریٹر)</option>
                <option value="editor">Editor (ایڈیٹر)</option>
                <option value="viewer">Viewer (صرف دیکھنے والا)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Plan Tier (پلان)</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500"
              >
                <option value="free">Free Tier</option>
                <option value="pro">Pro Tier</option>
                <option value="enterprise">Enterprise Tier</option>
              </select>
            </div>
          </div>

          {/* 2. Granular Feature Permissions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent-400" />
              <span>Feature Access Permissions (خصوصی اختیارات)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* AI Dubbing Toggle */}
              <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-elevated/40 p-3.5 cursor-pointer hover:border-slate-500 transition">
                <input
                  type="checkbox"
                  checked={canAiDubbing}
                  onChange={(e) => setCanAiDubbing(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-accent-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">AI Dubbing (اے آئی ڈبنگ)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold">
                      Multi-Character
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Allows multi-speaker character dialogue translation with gender and lip-sync matching.
                  </p>
                </div>
              </label>

              {/* Voice Over Toggle */}
              <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-elevated/40 p-3.5 cursor-pointer hover:border-slate-500 transition">
                <input
                  type="checkbox"
                  checked={canVoiceOver}
                  onChange={(e) => setCanVoiceOver(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-accent-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Voice Over (وائس اوور)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold">
                      Narrator
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Allows single narrator voice replacement across entire video.
                  </p>
                </div>
              </label>

              {/* Voice Cloning */}
              <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-elevated/40 p-3.5 cursor-pointer hover:border-slate-500 transition">
                <input
                  type="checkbox"
                  checked={canCloneVoice}
                  onChange={(e) => setCanCloneVoice(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-accent-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Voice Cloning (آواز کلوننگ)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                      Advanced
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Allows uploading speaker reference voice samples for custom replication.
                  </p>
                </div>
              </label>

              {/* Subtitles Export */}
              <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-elevated/40 p-3.5 cursor-pointer hover:border-slate-500 transition">
                <input
                  type="checkbox"
                  checked={canExportSubtitles}
                  onChange={(e) => setCanExportSubtitles(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-accent-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-white">Subtitle Export (سب ٹائٹلز)</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Allows downloading SRT and WebVTT subtitle files in target language.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Limits & Usage Quotas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Quotas &amp; Limits (استعمال کی حدیں)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Max Video Length (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Monthly Quota (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={monthlyQuota}
                  onChange={(e) => setMonthlyQuota(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">Used Minutes</label>
                  <button
                    type="button"
                    onClick={() => setUsedMinutes(0.0)}
                    className="text-[10px] text-accent-400 hover:underline flex items-center gap-0.5"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    <span>Reset</span>
                  </button>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={usedMinutes}
                  onChange={(e) => setUsedMinutes(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-surface-elevated/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-slate-300 hover:text-white hover:bg-surface transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Access Settings...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Access Controls (محفوظ کریں)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
