'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Film,
  Search,
  Filter,
  PlusCircle,
  ExternalLink,
  Trash2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Project } from '@/lib/types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this project?')) return;
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'COMPLETED' && p.status === 'COMPLETED') ||
      (statusFilter === 'RUNNING' && ['TRANSCRIBING', 'DUBBING'].includes(p.status)) ||
      (statusFilter === 'DRAFT' && ['DRAFT', 'UPLOADED', 'AWAITING_REVIEW'].includes(p.status));
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">My Dubbing Projects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your localized videos, transcripts, and downloadable assets.
          </p>
        </div>
        <Link
          href="/new"
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold transition shadow-sm"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Dubbing Project</span>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-lg border border-border bg-surface-elevated pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="RUNNING">In Progress</option>
            <option value="DRAFT">Review / Draft</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
          Loading project library...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
          <Film className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No projects found</h3>
          <p className="text-xs text-slate-400">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Create a new project to start dubbing.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border border-border bg-surface p-5 hover:border-slate-500/80 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono uppercase px-2 py-0.5 rounded bg-surface-elevated border border-border text-[11px] font-semibold text-accent-400">
                      {project.source_language} → {project.target_language}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      project.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : project.status === 'DUBBING' || project.status === 'TRANSCRIBING'
                        ? 'bg-accent-500/10 text-accent-400 border-accent-500/20 animate-pulse'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    }`}
                  >
                    {project.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <Link
                  href={`/projects/${project.id}`}
                  className="text-base font-semibold text-white hover:text-accent-400 transition block truncate"
                >
                  {project.name}
                </Link>

                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between">
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-accent-400 hover:text-accent-300 transition"
                >
                  <span>Open Project</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => handleDelete(project.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
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
  );
}
