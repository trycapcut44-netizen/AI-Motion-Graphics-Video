import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { LanguageCompatibilityResponse } from '@/lib/types';

interface CompatibilityPanelProps {
  compatibility: LanguageCompatibilityResponse | null;
  loading?: boolean;
}

export default function CompatibilityPanel({ compatibility, loading }: CompatibilityPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-40 bg-surface-elevated rounded mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-surface-elevated rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!compatibility) return null;

  const stages = [
    { name: 'Audio Extraction', info: compatibility.audio_extraction },
    { name: 'Speech Transcription', info: compatibility.transcription },
    { name: 'Language Translation', info: compatibility.translation },
    { name: 'Speech Generation (TTS)', info: compatibility.speech_generation },
    { name: 'Subtitles & Formatting', info: compatibility.subtitles },
    { name: 'Voice Replication', info: compatibility.voice_replication },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-accent-400" />
          <h4 className="text-sm font-semibold text-white">Pipeline Compatibility Verification</h4>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            compatibility.is_compatible
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}
        >
          {compatibility.is_compatible ? 'Verified Compatible' : 'Partial / Action Needed'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {stages.map((stage) => {
          const isOk = stage.info.supported;
          return (
            <div
              key={stage.name}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs ${
                isOk
                  ? 'bg-surface-elevated/40 border-border text-slate-300'
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
              }`}
            >
              {isOk ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="font-medium text-white truncate">{stage.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{stage.info.provider}</div>
              </div>
            </div>
          );
        })}
      </div>

      {compatibility.limitations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <ul className="text-xs text-amber-300/90 space-y-1">
            {compatibility.limitations.map((lim, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {lim}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
