'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Film,
  CheckCircle2,
  Clock,
  Coins,
  PlusCircle,
  ArrowRight,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Project, UsageStats } from '@/lib/types';
import MetricCard from '@/components/MetricCard';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [projList, usageStats] = await Promise.all([
        api.getProjects(),
        api.getUsageStats(),
      ]);
      setProjects(projList);
      setStats(usageStats);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? All associated media will be wiped.')) return;
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-gradient-to-r from-surface to-surface-elevated/40 p-6 sm:p-8 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Multilingual Video Dubbing Platform
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Localize speech into natural Hindi, Urdu, Arabic, Spanish, French, and 20+ languages with synchronized audio, voice adaptation, and multilingual subtitles.
          </p>
        </div>
        <Link
          href="/new"
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent-600 hover:bg-accent-500 text-white font-semibold text-sm transition shadow-md shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Dubbing Project</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Projects"
          value={stats ? stats.total_projects : 0}
          icon={Film}
          badge="SaaS Projects"
          badgeColor="indigo"
        />
        <MetricCard
          title="Completed Dubs"
          value={stats ? stats.completed_projects : 0}
          icon={CheckCircle2}
          badge="Verified Outputs"
          badgeColor="emerald"
        />
        <MetricCard
          title="Processed Duration"
          value={`${stats ? stats.total_video_duration_minutes : 0}m`}
          subValue="media synchronized"
          icon={Clock}
          badge="FFmpeg Pipeline"
          badgeColor="slate"
        />
        <MetricCard
          title="Estimated API Cost"
          value={`$${stats ? stats.total_estimated_cost_usd.toFixed(2) : '0.00'}`}
          subValue="USD"
          icon={Coins}
          badge="Usage Tracker"
          badgeColor="amber"
        />
      </div>

      {/* Recent Projects Section */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Film className="h-5 w-5 text-accent-400" />
            <h2 className="text-base font-semibold text-white">Recent Dubbing Projects</h2>
          </div>
          <Link
            href="/projects"
            className="flex items-center gap-1 text-xs font-semibold text-accent-400 hover:text-accent-300 transition"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
            Loading project records...
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated text-slate-500 border border-border">
              <Film className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No dubbing projects yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Get started by uploading an English or foreign language video and converting it into any target language.
            </p>
            <div className="pt-2">
              <Link
                href="/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-xs font-semibold text-white transition"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Create First Dub</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {projects.slice(0, 8).map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 sm:p-5 hover:bg-surface-elevated/40 transition group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-slate-300 border border-border">
                    <Film className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-sm font-semibold text-white hover:text-accent-400 transition truncate block"
                    >
                      {project.name}
                    </Link>
                    <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono uppercase px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-[10px]">
                        {project.source_language} → {project.target_language}
                      </span>
                      <span>•</span>
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                      project.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : project.status === 'DUBBING' || project.status === 'TRANSCRIBING'
                        ? 'bg-accent-500/10 text-accent-400 border-accent-500/20 animate-pulse'
                        : project.status === 'AWAITING_REVIEW'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}
                  >
                    {project.status.replace(/_/g, ' ')}
                  </span>

                  <Link
                    href={`/projects/${project.id}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated transition"
                    title="Open Project"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(project.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete Project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
