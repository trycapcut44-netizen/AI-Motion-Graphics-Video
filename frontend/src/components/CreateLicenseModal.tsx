'use client';

import React, { useState } from 'react';
import { X, Key, Calendar, ShieldCheck, Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { ClientLicense } from '@/lib/types';

interface CreateLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (license: ClientLicense) => void;
}

export default function CreateLicenseModal({ isOpen, onClose, onCreated }: CreateLicenseModalProps) {
  const [clientName, setClientName] = useState('');
  const [expiryOption, setExpiryOption] = useState<string>('30');
  const [notes, setNotes] = useState('');
  const [aiDubbing, setAiDubbing] = useState(true);
  const [voiceOver, setVoiceOver] = useState(true);
  const [voiceCloning, setVoiceCloning] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLicense, setCreatedLicense] = useState<ClientLicense | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setError('Client Name enter karein.');
      return;
    }

    setLoading(true);
    setError(null);

    let days: number | null = null;
    if (expiryOption !== 'lifetime') {
      days = parseInt(expiryOption, 10);
    }

    try {
      const newLic = await api.createAdminLicense({
        client_name: clientName.trim(),
        expires_in_days: days,
        notes: notes.trim() || undefined,
        allowed_features: {
          ai_dubbing: aiDubbing,
          voice_over: voiceOver,
          voice_cloning: voiceCloning,
        },
      });

      setCreatedLicense(newLic);
      onCreated(newLic);
    } catch (err: any) {
      setError(err.message || 'License generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!createdLicense) return;
    navigator.clipboard.writeText(createdLicense.license_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleReset = () => {
    setCreatedLicense(null);
    setClientName('');
    setNotes('');
    setExpiryOption('30');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Generate Client License Key</h2>
              <p className="text-xs text-slate-400">کلائنٹ کے لیے نیا لائسنس کی تیار کریں</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-surface-elevated transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {createdLicense ? (
          /* Success Screen */
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">لائسنس کامیابی سے تیار ہو گیا ہے!</p>
                <p className="text-[11px] text-emerald-300">
                  Yeh key client ko send karein. Jab chahein aap ise 1-click me revoke kar sakte hain.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Client Name</span>
                <p className="text-sm font-bold text-white">{createdLicense.client_name}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">License Key (Secret)</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={createdLicense.license_key}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono font-bold text-accent-400 tracking-wider"
                  />
                  <button
                    onClick={handleCopyKey}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold transition shrink-0"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-border/50">
                <div>
                  <span className="text-slate-500 text-[10px]">Status:</span>{' '}
                  <span className="font-semibold text-emerald-400 uppercase">{createdLicense.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Validity:</span>{' '}
                  <span className="font-semibold text-slate-300">
                    {createdLicense.expires_at ? new Date(createdLicense.expires_at).toLocaleDateString() : 'Lifetime'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl bg-surface-elevated hover:bg-border text-white text-xs font-semibold transition border border-border"
            >
              Done (مکمل ہوا)
            </button>
          </div>
        ) : (
          /* Creation Form */
          <form onSubmit={handleSubmit} className="py-4 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Client Name / Identification <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Usman Video Agency, Ali Khan"
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-accent-400" />
                <span>Access Validity (کتنے عرصے تک چلے)</span>
              </label>
              <select
                value={expiryOption}
                onChange={(e) => setExpiryOption(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500"
              >
                <option value="7">7 Days (Trial Access)</option>
                <option value="15">15 Days</option>
                <option value="30">30 Days (1 Month)</option>
                <option value="90">90 Days (3 Months)</option>
                <option value="365">1 Year</option>
                <option value="lifetime">Lifetime (جب تک آپ خود Revoke نہ کریں)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent-400" />
                <span>Feature Permissions</span>
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-surface-elevated cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiDubbing}
                    onChange={(e) => setAiDubbing(e.target.checked)}
                    className="rounded border-slate-700 text-accent-500 focus:ring-accent-500"
                  />
                  <span className="text-slate-200">AI Dubbing</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-surface-elevated cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceOver}
                    onChange={(e) => setVoiceOver(e.target.checked)}
                    className="rounded border-slate-700 text-accent-500 focus:ring-accent-500"
                  />
                  <span className="text-slate-200">Voice Over</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Internal Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid via Bank Transfer, Test client"
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-border">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                <span>Generate License Key</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
