'use client';

import React from 'react';
import { Mic, Film, Check, Users, Sparkles } from 'lucide-react';

interface DubbingModeSelectorProps {
  mode: 'voice_over' | 'ai_dubbing';
  onModeChange: (mode: 'voice_over' | 'ai_dubbing') => void;
}

export default function DubbingModeSelector({
  mode,
  onModeChange,
}: DubbingModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-white mb-1">
          Select Processing Mode (موڈ منتخب کریں)
        </label>
        <p className="text-xs text-slate-400">
          Choose between single-speaker Voice Over narration or multi-character dialogue AI Dubbing with gender &amp; lip-sync matching.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: AI Dubbing (Multi-Character Dialogue) */}
        <div
          onClick={() => onModeChange('ai_dubbing')}
          className={`cursor-pointer rounded-2xl border p-5 transition relative flex flex-col justify-between ${
            mode === 'ai_dubbing'
              ? 'border-accent-500 bg-accent-500/10 shadow-lg shadow-accent-500/10 ring-1 ring-accent-500/40'
              : 'border-border bg-surface hover:border-slate-500 hover:bg-surface-elevated/40'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-lg">
                🎬
              </div>
              <span className="text-[10px] bg-gradient-to-r from-accent-500/20 to-purple-500/20 text-accent-300 border border-accent-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Multi-Character Dialogue
              </span>
            </div>

            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>AI Dubbing (اے آئی ڈبنگ)</span>
            </h3>

            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Video dialogues are translated with <strong>automatic character matching</strong>:
            </p>

            <ul className="mt-2.5 space-y-1.5 text-[11px] text-slate-400">
              <li className="flex items-center gap-1.5">
                <span className="text-blue-400">👨</span>
                <span><strong>Male Characters:</strong> Dubbed in male voices (mardana awaz).</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-pink-400">👩</span>
                <span><strong>Female Characters:</strong> Dubbed in female voices (zanana awaz).</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">🎯</span>
                <span><strong>Lip Sync &amp; Timing:</strong> Aligned with mouth movement &amp; emotions.</span>
              </li>
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold">
            <span className={mode === 'ai_dubbing' ? 'text-accent-400 font-bold' : 'text-slate-400'}>
              {mode === 'ai_dubbing' ? '✓ Selected Mode' : 'Click to Select'}
            </span>
            <div
              className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                mode === 'ai_dubbing'
                  ? 'bg-accent-500 border-accent-400 text-white'
                  : 'border-border bg-surface-elevated'
              }`}
            >
              {mode === 'ai_dubbing' && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* Option 2: Voice Over (Single Speaker Narrator) */}
        <div
          onClick={() => onModeChange('voice_over')}
          className={`cursor-pointer rounded-2xl border p-5 transition relative flex flex-col justify-between ${
            mode === 'voice_over'
              ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
              : 'border-border bg-surface hover:border-slate-500 hover:bg-surface-elevated/40'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-lg">
                🎙️
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                Single Speaker Narrator
              </span>
            </div>

            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Voice Over (وائس اوور)</span>
            </h3>

            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Applies a <strong>single chosen narrator voice</strong> across the entire video:
            </p>

            <ul className="mt-2.5 space-y-1.5 text-[11px] text-slate-400">
              <li className="flex items-center gap-1.5">
                <span className="text-blue-400">🎙️</span>
                <span>Consistent single narrator from start to end.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-purple-400">📖</span>
                <span>Best for tutorials, documentaries, presentations, and single presenter videos.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400">⚡</span>
                <span>Direct translation with steady pacing.</span>
              </li>
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold">
            <span className={mode === 'voice_over' ? 'text-blue-400 font-bold' : 'text-slate-400'}>
              {mode === 'voice_over' ? '✓ Selected Mode' : 'Click to Select'}
            </span>
            <div
              className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                mode === 'voice_over'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-border bg-surface-elevated'
              }`}
            >
              {mode === 'voice_over' && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
