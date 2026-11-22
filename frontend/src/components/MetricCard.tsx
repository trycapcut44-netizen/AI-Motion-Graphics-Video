import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: 'emerald' | 'indigo' | 'amber' | 'slate';
}

export default function MetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  badge,
  badgeColor = 'indigo',
}: MetricCardProps) {
  const badgeClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    indigo: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }[badgeColor];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated text-slate-300 border border-border">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {subValue && <span className="text-xs text-slate-400">{subValue}</span>}
      </div>
      {badge && (
        <div className="mt-3">
          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded border ${badgeClasses}`}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}
