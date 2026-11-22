'use client';

import React from 'react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Square,
} from 'lucide-react';
import { ProcessingJob } from '@/lib/types';

interface JobProgressProps {
  job: ProcessingJob | null;
  onCancel?: () => void;
  onRetry?: () => void;
}

const STAGES = [
  { key: 'EXTRACTING_AUDIO', label: 'Extracting Audio' },
  { key: 'TRANSCRIBING', label: 'Transcribing Speech' },
  { key: 'TRANSLATING', label: 'Translating Content' },
  { key: 'GENERATING_SPEECH', label: 'Synthesizing Voices' },
  { key: 'SYNCHRONIZING', label: 'Aligning Timeline' },
  { key: 'MIXING', label: 'Mixing Background' },
  { key: 'RENDERING', label: 'Rendering Final MP4' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function JobProgress({ job, onCancel, onRetry }: JobProgressProps) {
  if (!job) return null;

  const isRunning = job.status === 'RUNNING' || job.status === 'QUEUED';
  const isCompleted = job.status === 'COMPLETED';
  const isFailed = job.status === 'FAILED';
  const isCancelled = job.status === 'CANCELLED';

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-md space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isRunning && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {isCompleted && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          )}
          {isFailed && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="h-5 w-5" />
            </div>
          )}
          {isCancelled && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-white">
              {isRunning
                ? 'Processing AI Dubbing Pipeline'
                : isCompleted
                ? 'Dubbing Pipeline Completed'
                : isFailed
                ? 'Processing Failed'
                : 'Job Cancelled'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {job.message || 'Executing background media task...'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isRunning && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-elevated text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          )}
          {isFailed && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-xs font-semibold text-white transition shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry Pipeline</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-xs font-medium text-slate-300 mb-2">
          <span className="capitalize text-accent-400">
            {job.stage.replace(/_/g, ' ').toLowerCase()}
          </span>
          <span>{job.progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated border border-border">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isFailed
                ? 'bg-rose-500'
                : isCompleted
                ? 'bg-emerald-500'
                : 'bg-accent-500'
            }`}
            style={{ width: `${Math.max(5, job.progress)}%` }}
          />
        </div>
      </div>

      {/* Stage Checklist */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50">
        {STAGES.map((s, idx) => {
          const isDone = isCompleted || job.progress > (idx + 1) * 12;
          const isCurrent = job.stage === s.key;
          return (
            <div
              key={s.key}
              className={`flex items-center gap-2 p-2 rounded-lg text-[11px] border ${
                isDone
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                  : isCurrent
                  ? 'bg-accent-500/10 border-accent-500/30 text-accent-300 font-semibold'
                  : 'bg-surface-elevated/20 border-border/40 text-slate-500'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="h-3.5 w-3.5 text-accent-400 animate-spin shrink-0" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-slate-600 shrink-0 flex items-center justify-center text-[9px]">
                  {idx + 1}
                </span>
              )}
              <span className="truncate">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Error Details */}
      {isFailed && job.error_details && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <XCircle className="h-4 w-4" />
            <span>Pipeline Diagnostics</span>
          </div>
          <pre className="mt-2 p-2 rounded bg-black/40 overflow-x-auto text-[10px] text-rose-200/90 font-mono">
            {job.error_details}
          </pre>
        </div>
      )}
    </div>
  );
}
