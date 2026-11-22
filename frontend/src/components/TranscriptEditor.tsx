'use client';

import React, { useState } from 'react';
import {
  Clock,
  User,
  Check,
  RotateCcw,
  Sparkles,
  Save,
  AlertCircle,
} from 'lucide-react';
import { TranscriptSegment } from '@/lib/types';

interface TranscriptEditorProps {
  segments: TranscriptSegment[];
  targetLangDirection?: 'ltr' | 'rtl';
  targetLangName?: string;
  onSaveSegments: (updated: TranscriptSegment[]) => Promise<void>;
  isSaving?: boolean;
}

export default function TranscriptEditor({
  segments: initialSegments,
  targetLangDirection = 'ltr',
  targetLangName = 'Hindi',
  onSaveSegments,
  isSaving,
}: TranscriptEditorProps) {
  const [segments, setSegments] = useState<TranscriptSegment[]>(initialSegments);
  const [dirty, setDirty] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 10);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}.${ms}`;
  };

  const handleTextChange = (id: string, newText: string) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, translated_text: newText } : seg))
    );
    setDirty(true);
  };

  const handleSpeakerChange = (id: string, newSpeaker: string) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, speaker_id: newSpeaker } : seg))
    );
    setDirty(true);
  };

  const handleToggleApprove = (id: string) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, is_approved: !seg.is_approved } : seg))
    );
    setDirty(true);
  };

  const handleSaveAll = async () => {
    await onSaveSegments(segments);
    setDirty(false);
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
        <div>
          <h3 className="text-sm font-semibold text-white">Review & Edit Bilingual Transcript</h3>
          <p className="text-xs text-slate-400">
            Verify translations before generating final audio narration. Edit text freely to adjust tone.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={!dirty || isSaving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-40 text-xs font-semibold text-white transition shadow-sm"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}</span>
        </button>
      </div>

      {/* Segments List */}
      <div className="space-y-3">
        {segments.map((seg, idx) => (
          <div
            key={seg.id}
            className={`rounded-xl border p-4 transition ${
              seg.is_approved
                ? 'border-border bg-surface'
                : 'border-slate-800 bg-surface/50 opacity-60'
            }`}
          >
            {/* Segment Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5 mb-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-400">#{idx + 1}</span>
                <div className="flex items-center gap-1.5 text-accent-400 font-mono">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {formatTime(seg.start_time)} - {formatTime(seg.end_time)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({(seg.end_time - seg.start_time).toFixed(1)}s)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="flex items-center gap-1 bg-surface-elevated px-2 py-1 rounded-lg border border-border">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={seg.speaker_id}
                      onChange={(e) => handleSpeakerChange(seg.id, e.target.value)}
                      placeholder="Speaker 1"
                      className="w-20 bg-transparent text-xs text-white font-semibold focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newGender = seg.speaker_gender === 'female' ? 'male' : 'female';
                      let newSpk = seg.speaker_id;
                      if (newGender === 'female' && seg.speaker_id === 'Speaker 1') {
                        newSpk = 'Speaker 2';
                      } else if (newGender === 'male' && seg.speaker_id === 'Speaker 2') {
                        newSpk = 'Speaker 1';
                      }
                      setSegments((prev) =>
                        prev.map((s) => (s.id === seg.id ? { ...s, speaker_gender: newGender, speaker_id: newSpk } : s))
                      );
                      setDirty(true);
                    }}
                    title="Click to switch between Male and Female voice"
                    className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-bold border transition shadow-sm ${
                      seg.speaker_gender === 'female'
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 hover:bg-pink-500/30'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                    }`}
                  >
                    <span>{seg.speaker_gender === 'female' ? '👩 Female (زنانی)' : '👨 Male (مردانہ)'}</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleApprove(seg.id)}
                className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition ${
                  seg.is_approved
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 border-border'
                }`}
              >
                <Check className="h-3 w-3" />
                <span>{seg.is_approved ? 'Approved' : 'Excluded'}</span>
              </button>
            </div>

            {/* Bilingual Content (Side-by-side or stacked on mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Source Speech */}
              <div className="rounded-lg bg-surface-elevated/40 border border-border/50 p-3">
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Original Speech
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{seg.source_text}</p>
              </div>

              {/* Editable Translation */}
              <div className="rounded-lg bg-surface-elevated/70 border border-accent-500/30 p-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-accent-400 mb-1.5 uppercase tracking-wider">
                  <span>{targetLangName} Translation (Editable)</span>
                  {targetLangDirection === 'rtl' && (
                    <span className="text-amber-400 font-mono text-[10px]">RTL Mode</span>
                  )}
                </div>
                <textarea
                  value={seg.translated_text || ''}
                  onChange={(e) => handleTextChange(seg.id, e.target.value)}
                  dir={targetLangDirection}
                  rows={2}
                  className={`w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500 transition resize-y ${
                    targetLangDirection === 'rtl' ? 'rtl-content' : ''
                  }`}
                  placeholder="Enter translated dialogue..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
