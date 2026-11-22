'use client';

import React from 'react';
import { ArrowRightLeft, Globe } from 'lucide-react';
import { LanguageInfo } from '@/lib/types';

interface LanguageSelectorProps {
  languages: LanguageInfo[];
  sourceLang: string;
  targetLang: string;
  onSourceChange: (lang: string) => void;
  onTargetChange: (lang: string) => void;
  disabled?: boolean;
}

export default function LanguageSelector({
  languages,
  sourceLang,
  targetLang,
  onSourceChange,
  onTargetChange,
  disabled,
}: LanguageSelectorProps) {
  const handleSwap = () => {
    if (sourceLang === 'auto') return;
    const temp = sourceLang;
    onSourceChange(targetLang);
    onTargetChange(temp);
  };

  const currentTarget = languages.find((l) => l.code === targetLang);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
      {/* Source Language */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Original Video Language
        </label>
        <div className="relative">
          <select
            value={sourceLang}
            onChange={(e) => onSourceChange(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-500 transition"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className="bg-surface text-white">
                {l.name} {l.native_name !== l.name ? `(${l.native_name})` : ''}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Select &apos;Auto Detect&apos; to identify the spoken language automatically.
        </p>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleSwap}
          disabled={disabled || sourceLang === 'auto'}
          title="Swap source and target languages"
          className="p-2.5 rounded-full border border-border bg-surface-elevated text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
        >
          <ArrowRightLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Target Language */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Convert Voice To (Target Language)
        </label>
        <div className="relative">
          <select
            value={targetLang}
            onChange={(e) => onTargetChange(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-500 transition"
          >
            {languages
              .filter((l) => l.code !== 'auto')
              .map((l) => (
                <option key={l.code} value={l.code} className="bg-surface text-white">
                  {l.name} ({l.native_name}) {l.direction === 'rtl' ? '• RTL' : ''}
                </option>
              ))}
          </select>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>Script: {currentTarget?.script || 'Universal'}</span>
          {currentTarget?.direction === 'rtl' && (
            <span className="text-amber-400 font-medium">Right-to-Left (RTL)</span>
          )}
        </div>
      </div>
    </div>
  );
}
