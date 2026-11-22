'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Coins,
  Clock,
  Film,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { UsageStats } from '@/lib/types';
import MetricCard from '@/components/MetricCard';

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUsageStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Usage & Cost Tracking</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Real-time metrics and estimated costs based on media minutes processed and AI provider operations.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Video Duration Processed"
          value={`${stats ? stats.total_video_duration_minutes : 0}m`}
          subValue={`${stats ? stats.total_video_duration_seconds : 0} seconds`}
          icon={Clock}
          badge="Total Volume"
          badgeColor="indigo"
        />
        <MetricCard
          title="Completed Dubs"
          value={stats ? stats.completed_projects : 0}
          icon={Film}
          badge="Finished Videos"
          badgeColor="emerald"
        />
        <MetricCard
          title="Failed / Cancelled"
          value={stats ? stats.failed_jobs : 0}
          icon={AlertCircle}
          badge="Job Exceptions"
          badgeColor="amber"
        />
        <MetricCard
          title="Estimated Cost (USD)"
          value={`$${stats ? stats.total_estimated_cost_usd.toFixed(2) : '0.00'}`}
          icon={Coins}
          badge="Usage Accrual"
          badgeColor="slate"
        />
      </div>

      {/* Connected AI Providers & Services Status */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <Server className="h-5 w-5 text-accent-400" />
          <h2 className="text-base font-semibold text-white">Configured Services & Provider Status</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gemini API */}
          <div className="rounded-xl border border-border bg-surface-elevated/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Google Gemini API</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  stats?.services.gemini_api.configured
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {stats?.services.gemini_api.configured ? 'Configured' : 'Key Needed'}
              </span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <div>Transcription: {stats?.services.gemini_api.model_transcription}</div>
              <div>Translation: {stats?.services.gemini_api.model_translation}</div>
              <div>TTS Model: {stats?.services.gemini_api.model_tts}</div>
            </div>
          </div>

          {/* Edge Neural TTS */}
          <div className="rounded-xl border border-border bg-surface-elevated/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Neural Speech Engine</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Online (Active)
              </span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <div>Coverage: 100+ Languages</div>
              <div>Hindi, Urdu, Arabic, Spanish, etc.</div>
              <div>Cost: Included / Zero Fee</div>
            </div>
          </div>

          {/* FFmpeg Engine */}
          <div className="rounded-xl border border-border bg-surface-elevated/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">FFmpeg 7.1 Media Engine</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Operational
              </span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <div>H.264 & AAC Rendering</div>
              <div>Audio Ducking & Limiter</div>
              <div>Lossless Video Passthrough</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
