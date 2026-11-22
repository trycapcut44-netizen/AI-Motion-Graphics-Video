'use client';

import React, { useEffect, useState } from 'react';
import {
  Key,
  Shield,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { UsageStats } from '@/lib/types';

export default function SettingsPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);

  // Gemini Key State
  const [keyStatus, setKeyStatus] = useState<{
    is_configured: boolean;
    masked_key: string;
    transcription_model: string;
    translation_model: string;
    tts_model: string;
  } | null>(null);

  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [uStats, kStatus] = await Promise.all([
        api.getUsageStats().catch(() => null),
        api.getGeminiKeyStatus().catch(() => null),
      ]);
      setStats(uStats);
      setKeyStatus(kStatus);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a valid Gemini API key.' });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);
      const res = await api.saveGeminiKey(inputKey.trim());
      setFeedback({ type: 'success', message: res.message });
      setInputKey('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save Gemini key.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setFeedback(null);
      const res = await api.testGeminiKey(inputKey.trim() || undefined);
      setFeedback({
        type: 'success',
        message: res.test_response ? `${res.message} (Test response: "${res.test_response}")` : res.message,
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Verification test failed. Check key validity and quotas.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!confirm('Are you sure you want to remove your Gemini API key? The system will revert to the local test engine.')) {
      return;
    }

    try {
      setFeedback(null);
      const res = await api.removeGeminiKey();
      setFeedback({ type: 'success', message: res.message });
      setInputKey('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove key.' });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings & AI Configuration</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your Google Gemini API credentials, models, and media pipeline parameters.
        </p>
      </div>

      <div className="space-y-6">
        {/* Gemini API Key Management Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Google Gemini API Key</h2>
                <p className="text-xs text-slate-400">
                  Required for real-time speech transcription, contextual translation, and Gemini TTS
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                keyStatus?.is_configured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {keyStatus?.is_configured ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Key Configured ({keyStatus.masked_key})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Not Configured (Using Offline Engine)</span>
                </>
              )}
            </span>
          </div>

          {/* Form to Input / Update Key */}
          <form onSubmit={handleSaveKey} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                {keyStatus?.is_configured ? 'Update Gemini API Key' : 'Enter Gemini API Key'}
              </label>

              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder={
                    keyStatus?.is_configured
                      ? `Leave blank to keep current (${keyStatus.masked_key}) or enter new key`
                      : 'AIzaSy...'
                  }
                  className="w-full rounded-xl border border-border bg-surface-elevated pl-4 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 p-1 text-slate-400 hover:text-white transition"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSaving || !inputKey.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-40 text-xs font-semibold text-white transition shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Key</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || (!inputKey.trim() && !keyStatus?.is_configured)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-surface-elevated hover:bg-surface-elevated/80 disabled:opacity-40 text-xs font-semibold text-slate-300 hover:text-white transition"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Testing Live API...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-accent-400" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>

              {keyStatus?.is_configured && (
                <button
                  type="button"
                  onClick={handleRemoveKey}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Key</span>
                </button>
              )}
            </div>
          </form>

          {/* Help & Documentation Box */}
          <div className="rounded-xl bg-surface-elevated/40 border border-border/70 p-4 space-y-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <span>Don&apos;t have a Gemini API key yet?</span>
            </div>
            <p>
              You can obtain a free Gemini API key in under 1 minute from Google AI Studio. The API key provides free access to Gemini 2.0 Flash for audio transcription and translation.
            </p>
            <div className="pt-1">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-accent-400 hover:text-accent-300 font-semibold"
              >
                <span>Get Gemini API Key from Google AI Studio</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Media Pipeline Constraints */}
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Media Pipeline Constraints</h3>
              <p className="text-xs text-slate-400">Resource limits and rendering parameters</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/30">
              <div className="text-slate-400">Max Upload Size</div>
              <div className="text-base font-bold text-white mt-1">250 MB</div>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/30">
              <div className="text-slate-400">Max Video Duration</div>
              <div className="text-base font-bold text-white mt-1">10 Minutes (600s)</div>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/30">
              <div className="text-slate-400">Concurrent Background Jobs</div>
              <div className="text-base font-bold text-white mt-1">2 Workers</div>
            </div>
          </div>
        </div>

        {/* Privacy & Storage Security */}
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Shield className="h-4 w-4 text-accent-400" />
            <span>Security & Data Privacy</span>
          </div>
          <p>
            • Your Gemini API key is stored securely in the server-side environment and is never exposed in browser source code or public logs.
          </p>
          <p>
            • Video uploads and audio files are tokenized under internal UUID keys inside private storage folders.
          </p>
          <p>
            • Deleting a project permanently purges all uploaded, intermediate, and rendered media from disk.
          </p>
        </div>
      </div>
    </div>
  );
}
