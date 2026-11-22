'use client';

import React from 'react';
import {
  Download,
  FileText,
  Subtitles,
  Film,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface VideoPlayerProps {
  projectId: string;
  projectName: string;
  targetLanguage: string;
}

export default function VideoPlayer({
  projectId,
  projectName,
  targetLanguage,
}: VideoPlayerProps) {
  const videoUrl = api.getDownloadUrl(projectId, 'video');
  const srtUrl = api.getDownloadUrl(projectId, 'subtitles_srt');
  const vttUrl = api.getDownloadUrl(projectId, 'subtitles_vtt');
  const txtUrl = api.getDownloadUrl(projectId, 'transcript_txt');
  const srcTxtUrl = api.getDownloadUrl(projectId, 'source_transcript_txt');

  return (
    <div className="space-y-6">
      {/* Video Container */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xl">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <video
            controls
            playsInline
            crossOrigin="anonymous"
            className="w-full h-full object-contain"
          >
            <source src={videoUrl} type="video/mp4" />
            <track
              label={`${targetLanguage.toUpperCase()} Subtitles`}
              kind="subtitles"
              srcLang={targetLanguage}
              src={vttUrl}
              default
            />
            Your browser does not support HTML5 video playback.
          </video>
        </div>

        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">{projectName}</h4>
              <p className="text-xs text-slate-400">
                Dubbed into {targetLanguage.toUpperCase()} • H.264 AAC Output
              </p>
            </div>
          </div>

          <a
            href={videoUrl}
            download={`${projectName}_dubbed_${targetLanguage}.mp4`}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold transition shadow-md"
          >
            <Download className="h-4 w-4" />
            <span>Download Final MP4</span>
          </a>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* SRT */}
        <a
          href={srtUrl}
          download={`${projectName}_${targetLanguage}.srt`}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-surface hover:border-slate-500 hover:bg-surface-elevated/40 transition group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated text-slate-300 border border-border group-hover:text-accent-400">
            <Subtitles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Subtitles (.SRT)</div>
            <div className="text-[11px] text-slate-400">Standard subtitle file</div>
          </div>
        </a>

        {/* WebVTT */}
        <a
          href={vttUrl}
          download={`${projectName}_${targetLanguage}.vtt`}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-surface hover:border-slate-500 hover:bg-surface-elevated/40 transition group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated text-slate-300 border border-border group-hover:text-accent-400">
            <Subtitles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">WebVTT (.VTT)</div>
            <div className="text-[11px] text-slate-400">Web video player track</div>
          </div>
        </a>

        {/* Translated Transcript */}
        <a
          href={txtUrl}
          download={`${projectName}_${targetLanguage}_transcript.txt`}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-surface hover:border-slate-500 hover:bg-surface-elevated/40 transition group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated text-slate-300 border border-border group-hover:text-accent-400">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Dubbed Script (.TXT)</div>
            <div className="text-[11px] text-slate-400">Translated text script</div>
          </div>
        </a>

        {/* Original Transcript */}
        <a
          href={srcTxtUrl}
          download={`${projectName}_source_transcript.txt`}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-surface hover:border-slate-500 hover:bg-surface-elevated/40 transition group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-elevated text-slate-300 border border-border group-hover:text-accent-400">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Source Script (.TXT)</div>
            <div className="text-[11px] text-slate-400">Original speech script</div>
          </div>
        </a>
      </div>
    </div>
  );
}
