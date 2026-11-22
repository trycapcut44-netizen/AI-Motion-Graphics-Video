'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  PlayCircle,
  RotateCcw,
  Download,
  Trash2,
  Subtitles,
  FileText,
  Clock,
  Film,
  CheckCircle2,
  Loader2,
  Volume2,
  Play,
  Square,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Project, TranscriptSegment, ProcessingJob, VoiceOption, SpeakerVoiceConfig } from '@/lib/types';
import TranscriptEditor from '@/components/TranscriptEditor';
import JobProgress from '@/components/JobProgress';
import VideoPlayer from '@/components/VideoPlayer';
import DubbingModeSelector from '@/components/DubbingModeSelector';
import SpeakerVoiceMapper from '@/components/SpeakerVoiceMapper';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [activeJob, setActiveJob] = useState<ProcessingJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDubbing, setIsDubbing] = useState(false);

  // Dubbing Mode: "ai_dubbing" (multi-speaker) or "voice_over" (single narrator)
  const [dubbingMode, setDubbingMode] = useState<'voice_over' | 'ai_dubbing'>('ai_dubbing');
  const [speakerMap, setSpeakerMap] = useState<Record<string, SpeakerVoiceConfig>>({});

  // Voice selection states (Voice Over mode)
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const proj = await api.getProject(projectId);
      setProject(proj);

      const [segs, vList, currentVoice, spkData] = await Promise.all([
        api.getTranscript(projectId).catch(() => []),
        api.getVoices(proj.target_language).catch(() => []),
        api.getProjectVoice(projectId).catch(() => null),
        api.getProjectSpeakers(projectId).catch(() => null),
      ]);

      setSegments(segs);
      setVoices(vList);

      if (spkData?.speakers) {
        setSpeakerMap(spkData.speakers);
      }
      if (spkData?.dubbing_mode) {
        setDubbingMode(spkData.dubbing_mode as any);
      } else if (proj.settings_json) {
        try {
          const parsed = JSON.parse(proj.settings_json);
          if (parsed.dubbing_mode) setDubbingMode(parsed.dubbing_mode);
        } catch {}
      }

      if (currentVoice?.voice_id) {
        const found = vList.find((v) => v.voice_id === currentVoice.voice_id);
        if (found) {
          setSelectedVoice(found);
          setGenderFilter(found.gender as any);
        }
      } else if (vList.length > 0) {
        setSelectedVoice(vList[0]);
      }

      // Check recent job
      if (proj.jobs && proj.jobs.length > 0) {
        const latest = proj.jobs[0];
        if (latest.status === 'RUNNING' || latest.status === 'QUEUED') {
          setActiveJob(latest);
        }
      }
    } catch (err: any) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll active background job if running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeJob && (activeJob.status === 'RUNNING' || activeJob.status === 'QUEUED')) {
      interval = setInterval(async () => {
        try {
          const updated = await api.getJobStatus(activeJob.id);
          setActiveJob(updated);

          if (updated.status === 'COMPLETED') {
            setIsDubbing(false);
            loadProjectData();
          }
        } catch (err) {
          console.error('Job polling error:', err);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [activeJob]);

  const handleSaveSegments = async (updated: TranscriptSegment[]) => {
    try {
      setIsSaving(true);
      await api.updateTranscriptBulk(projectId, updated);
      setSegments(updated);
      const spkData = await api.getProjectSpeakers(projectId).catch(() => null);
      if (spkData?.speakers) {
        setSpeakerMap(spkData.speakers);
      }
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlayPreview = async (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingVoiceId === voice.voice_id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const url = `/api/v1/voices/${encodeURIComponent(voice.voice_id)}/preview?language_code=${encodeURIComponent(project?.target_language || 'ur')}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setPlayingVoiceId(voice.voice_id);
      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };
      await audio.play();
    } catch (err) {
      console.error(err);
      setPlayingVoiceId(null);
    }
  };

  const handleGenderSwitch = (gender: 'male' | 'female' | 'all') => {
    setGenderFilter(gender);
    if (gender !== 'all') {
      const match = voices.find((v) => v.gender === gender);
      if (match) setSelectedVoice(match);
    }
  };

  const filteredVoices = voices.filter((v) => {
    if (genderFilter === 'all') return true;
    return v.gender === genderFilter;
  });

  const handleStartDubbing = async () => {
    try {
      setIsDubbing(true);
      if (dubbingMode === 'ai_dubbing' && Object.keys(speakerMap).length > 0) {
        await api.updateProjectSpeakers(projectId, {
          dubbing_mode: 'ai_dubbing',
          speakers: speakerMap,
        }).catch(console.error);
        await api.updateProject(projectId, {
          settings: {
            dubbing_mode: 'ai_dubbing',
          },
        }).catch(console.error);
      } else if (selectedVoice && project) {
        await api.configureVoice(
          projectId,
          selectedVoice.voice_id,
          selectedVoice.provider,
          project.target_language,
          1.0,
          1.0,
          1.0,
          false,
          selectedVoice.name,
          selectedVoice.gender
        ).catch(console.error);
        await api.updateProject(projectId, {
          settings: {
            dubbing_mode: 'voice_over',
            selected_voice_id: selectedVoice.voice_id,
            selected_voice_name: selectedVoice.name,
            selected_voice_gender: selectedVoice.gender,
          },
        }).catch(console.error);
      }
      const trigger = await api.startDubbing(projectId);
      setActiveJob({
        id: trigger.job_id,
        project_id: projectId,
        stage: 'GENERATING_SPEECH',
        status: 'RUNNING',
        progress: 10,
        message: 'Synthesizing voice clips in target language...',
        retry_count: 0,
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      alert(`Failed to start dubbing: ${err.message}`);
      setIsDubbing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.deleteProject(projectId);
      router.push('/projects');
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
        Loading project details...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
        <h3 className="text-base font-semibold text-white">Project Not Found</h3>
        <Link href="/projects" className="text-xs text-accent-400 hover:underline">
          Return to projects library
        </Link>
      </div>
    );
  }

  const isCompleted = project.status === 'COMPLETED';

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="p-2 rounded-xl border border-border bg-surface hover:text-white text-slate-400 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">{project.name}</h1>
              <span className="font-mono uppercase px-2 py-0.5 rounded bg-surface-elevated border border-border text-[11px] font-semibold text-accent-400">
                {project.source_language} → {project.target_language}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Created {new Date(project.created_at).toLocaleDateString()} • ID: {project.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {segments.length > 0 && !isDubbing && (
            <button
              type="button"
              onClick={handleStartDubbing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-semibold text-white transition shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isCompleted ? 'Re-generate Dub' : 'Generate Dubbing'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="p-2 rounded-xl border border-border bg-surface text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="Delete Project"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active Job Progress Tracker */}
      {activeJob && (activeJob.status === 'RUNNING' || activeJob.status === 'QUEUED') && (
        <JobProgress job={activeJob} onCancel={() => api.cancelJob(activeJob.id)} />
      )}

      {/* Mode Selector: AI Dubbing vs Voice Over */}
      <DubbingModeSelector
        mode={dubbingMode}
        onModeChange={(m) => setDubbingMode(m)}
      />

      {/* Mode 1: AI Dubbing (Character Voice Mapping) */}
      {dubbingMode === 'ai_dubbing' && (
        <div>
          {Object.keys(speakerMap).length > 0 ? (
            <SpeakerVoiceMapper
              speakers={speakerMap}
              voices={voices}
              targetLanguage={project.target_language}
              onUpdateSpeaker={(spkId, updates) => {
                setSpeakerMap((prev) => {
                  const updated = {
                    ...prev,
                    [spkId]: {
                      ...prev[spkId],
                      ...updates,
                    },
                  };
                  api.updateProjectSpeakers(projectId, {
                    dubbing_mode: 'ai_dubbing',
                    speakers: updated,
                  }).catch(console.error);
                  return updated;
                });
              }}
            />
          ) : (
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6 text-center space-y-2">
              <div className="text-2xl">🎬</div>
              <h4 className="text-sm font-bold text-white">AI Dubbing Mode Active</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Characters and male/female voices will be automatically detected and mapped when transcription finishes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Voice Over (Single Speaker Narrator) */}
      {dubbingMode === 'voice_over' && voices.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-blue-400" />
                <span>Single Narrator Voice (منتخب راوی کی آواز): {selectedVoice?.name || 'Default'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch voice between Male &amp; Female, listen to sample audio, and click Re-generate Dub.
              </p>
            </div>

            {/* Gender Toggle Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleGenderSwitch('male')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  genderFilter === 'male'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-surface-elevated border-border text-slate-300 hover:text-white'
                }`}
              >
                <span>👨 Male (مردانہ)</span>
              </button>
              <button
                type="button"
                onClick={() => handleGenderSwitch('female')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  genderFilter === 'female'
                    ? 'bg-pink-600 text-white border-pink-500 shadow-sm'
                    : 'bg-surface-elevated border-border text-slate-300 hover:text-white'
                }`}
              >
                <span>👩 Female (زنانی)</span>
              </button>
              <button
                type="button"
                onClick={() => handleGenderSwitch('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  genderFilter === 'all'
                    ? 'bg-accent-600 text-white border-accent-500'
                    : 'bg-surface-elevated border-border text-slate-300 hover:text-white'
                }`}
              >
                <span>All</span>
              </button>
            </div>
          </div>

          {/* Voice Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredVoices.map((v) => {
              const isSelected = selectedVoice?.voice_id === v.voice_id;
              const isMale = v.gender === 'male';
              const isPlaying = playingVoiceId === v.voice_id;

              return (
                <div
                  key={v.voice_id}
                  onClick={() => setSelectedVoice(v)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition flex flex-col justify-between ${
                    isSelected
                      ? isMale
                        ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/40'
                        : 'border-pink-500 bg-pink-500/10 shadow-sm ring-1 ring-pink-500/40'
                      : 'border-border bg-surface hover:border-slate-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-base">{isMale ? '👨' : '👩'}</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                          isMale
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-pink-500/20 text-pink-300'
                        }`}
                      >
                        {isMale ? 'Male' : 'Female'}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white truncate">{v.name}</div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => handlePlayPreview(v, e)}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded border transition ${
                        isPlaying
                          ? 'bg-accent-500 text-white border-accent-400 animate-pulse'
                          : 'bg-surface-elevated text-slate-300 border-border hover:text-white'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Square className="h-3 w-3 fill-current" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 fill-current" />
                          <span>Sample</span>
                        </>
                      )}
                    </button>
                    {isSelected && (
                      <span className="text-[11px] font-bold text-accent-400">Active</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Final Video Player If Completed */}
      {isCompleted && (
        <VideoPlayer
          projectId={project.id}
          projectName={project.name}
          targetLanguage={project.target_language}
        />
      )}

      {/* Transcript Editor Section */}
      {segments.length > 0 && (
        <TranscriptEditor
          segments={segments}
          targetLangDirection={['ur', 'ar'].includes(project.target_language) ? 'rtl' : 'ltr'}
          targetLangName={project.target_language.toUpperCase()}
          onSaveSegments={handleSaveSegments}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
