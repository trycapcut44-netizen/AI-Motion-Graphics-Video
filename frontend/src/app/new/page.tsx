'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  Globe2,
  Mic,
  Sliders,
  FileText,
  PlayCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  LanguageInfo,
  LanguageCompatibilityResponse,
  VoiceOption,
  Project,
  TranscriptSegment,
  ProcessingJob,
} from '@/lib/types';
import VideoUploader from '@/components/VideoUploader';
import LanguageSelector from '@/components/LanguageSelector';
import CompatibilityPanel from '@/components/CompatibilityBadge';
import VoiceSelector from '@/components/VoiceSelector';
import TranscriptEditor from '@/components/TranscriptEditor';
import JobProgress from '@/components/JobProgress';
import VideoPlayer from '@/components/VideoPlayer';
import DubbingModeSelector from '@/components/DubbingModeSelector';
import SpeakerVoiceMapper from '@/components/SpeakerVoiceMapper';
import { SpeakerVoiceConfig } from '@/lib/types';

const STEPS = [
  { num: 1, label: 'Upload Video', icon: UploadCloud },
  { num: 2, label: 'Languages', icon: Globe2 },
  { num: 3, label: 'Voice & AI', icon: Mic },
  { num: 4, label: 'Dubbing Settings', icon: Sliders },
  { num: 5, label: 'Transcript Review', icon: FileText },
  { num: 6, label: 'Export & Preview', icon: PlayCircle },
];

export default function NewProjectWizard() {
  const router = useRouter();

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [projectName, setProjectName] = useState('My Dubbing Project');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('hi');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volumeGain, setVolumeGain] = useState(1.0);
  const [replicationEnabled, setReplicationEnabled] = useState(false);

  // Dubbing Mode: "ai_dubbing" (multi-speaker character matching) or "voice_over" (single narrator)
  const [dubbingMode, setDubbingMode] = useState<'voice_over' | 'ai_dubbing'>('ai_dubbing');
  const [speakerMap, setSpeakerMap] = useState<Record<string, SpeakerVoiceConfig>>({});

  // Settings - By default mute original audio completely so only clean AI voice is heard
  const [preserveBackground, setPreserveBackground] = useState(false);
  const [origVolume, setOrigVolume] = useState(0.0);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [burnSubtitles, setBurnSubtitles] = useState(false);
  const [translationStyle, setTranslationStyle] = useState<'natural' | 'conversational' | 'formal'>('natural');

  // Async Data
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [compatibility, setCompatibility] = useState<LanguageCompatibilityResponse | null>(null);
  const [loadingCompat, setLoadingCompat] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);

  // Created Project & Job State
  const [project, setProject] = useState<Project | null>(null);
  const [activeJob, setActiveJob] = useState<ProcessingJob | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingTranscript, setIsSavingTranscript] = useState(false);

  // Load languages on mount
  useEffect(() => {
    api.getLanguages().then((langs) => {
      setLanguages(langs);
    }).catch(console.error);
  }, []);

  // Update compatibility & voices when languages change
  useEffect(() => {
    if (sourceLang && targetLang) {
      setLoadingCompat(true);
      api.checkCompatibility(sourceLang, targetLang, replicationEnabled)
        .then((comp) => setCompatibility(comp))
        .catch(console.error)
        .finally(() => setLoadingCompat(false));

      api.getVoices(targetLang)
        .then((vList) => {
          setVoices(vList);
          if (vList.length > 0) {
            setSelectedVoice(vList[0]);
          }
        })
        .catch(console.error);
    }
  }, [sourceLang, targetLang, replicationEnabled]);

  // Poll active background job
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeJob && (activeJob.status === 'RUNNING' || activeJob.status === 'QUEUED')) {
      interval = setInterval(async () => {
        try {
          const updated = await api.getJobStatus(activeJob.id);
          setActiveJob(updated);

          // If transcription finished, load segments and speaker mapping
          if (updated.stage === 'AWAITING_REVIEW' && updated.status === 'COMPLETED' && project) {
            const [segs, spkData] = await Promise.all([
              api.getTranscript(project.id),
              api.getProjectSpeakers(project.id).catch(() => null),
            ]);
            setSegments(segs);
            if (spkData?.speakers) {
              setSpeakerMap(spkData.speakers);
            }
            setIsProcessing(false);
          }

          // If dubbing finished, mark project complete
          if (updated.stage === 'COMPLETED' && updated.status === 'COMPLETED') {
            setIsProcessing(false);
          }

          if (updated.status === 'FAILED') {
            setIsProcessing(false);
          }
        } catch (err) {
          console.error('Job polling error:', err);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [activeJob, project]);

  // Step 1 -> Step 2: Upload Video & Create Project
  const handleNextFromUpload = async () => {
    if (!selectedFile) {
      alert('Please upload a video file first.');
      return;
    }

    try {
      setIsProcessing(true);
      // 1. Create project
      const newProj = await api.createProject(projectName, sourceLang, targetLang, {
        dubbing_mode: dubbingMode,
        background_audio_enabled: preserveBackground,
        original_audio_volume: origVolume,
        dubbed_speech_volume: volumeGain,
        speech_speed: speed,
        subtitles_enabled: subtitlesEnabled,
        burn_subtitles: burnSubtitles,
        translation_style: translationStyle,
      });

      // 2. Upload video
      await api.uploadVideo(newProj.id, selectedFile);

      // 3. Re-fetch project to ensure all asset metadata and original_asset_id are in state
      const freshProj = await api.getProject(newProj.id);
      setProject(freshProj);
      setCurrentStep(2);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 4 -> Step 5: Save Settings & Trigger Transcription
  const handleStartTranscription = async () => {
    if (!project) {
      alert('No active project found. Please upload a video first.');
      setCurrentStep(1);
      return;
    }

    try {
      setIsProcessing(true);

      // Verify project still exists and has original asset (e.g. in case of server restart)
      const freshProj = await api.getProject(project.id).catch(() => null);
      if (!freshProj || !freshProj.original_asset_id) {
        alert('Video asset not found on server. Please upload your video again.');
        setCurrentStep(1);
        setIsProcessing(false);
        return;
      }
      setProject(freshProj);

      // Update project settings and voice config
      if (selectedVoice) {
        await api.configureVoice(
          freshProj.id,
          selectedVoice.voice_id,
          selectedVoice.provider,
          targetLang,
          speed,
          pitch,
          volumeGain,
          replicationEnabled
        );
      }

      await api.updateProject(freshProj.id, {
        name: projectName,
        source_language: sourceLang,
        target_language: targetLang,
        settings: {
          dubbing_mode: dubbingMode,
          background_audio_enabled: preserveBackground,
          original_audio_volume: origVolume,
          dubbed_speech_volume: volumeGain,
          speech_speed: speed,
          subtitles_enabled: subtitlesEnabled,
          burn_subtitles: burnSubtitles,
          translation_style: translationStyle,
          selected_voice_id: selectedVoice?.voice_id,
          selected_voice_name: selectedVoice?.name,
          selected_voice_gender: selectedVoice?.gender,
        },
      });

      // Trigger transcription
      const trigger = await api.startTranscription(freshProj.id);
      setActiveJob({
        id: trigger.job_id,
        project_id: freshProj.id,
        stage: 'EXTRACTING_AUDIO',
        status: 'RUNNING',
        progress: 10,
        message: 'Starting audio extraction and transcription...',
        retry_count: 0,
        created_at: new Date().toISOString(),
      });

      setCurrentStep(5);
    } catch (err: any) {
      alert(`Transcription trigger failed: ${err.message}`);
      setIsProcessing(false);
    }
  };

  // Step 5: Save edited transcript segments
  const handleSaveSegments = async (updated: TranscriptSegment[]) => {
    if (!project) return;
    try {
      setIsSavingTranscript(true);
      await api.updateTranscriptBulk(project.id, updated);
      setSegments(updated);
      const spkData = await api.getProjectSpeakers(project.id).catch(() => null);
      if (spkData?.speakers) {
        setSpeakerMap(spkData.speakers);
      }
    } catch (err: any) {
      alert(`Failed to save transcript: ${err.message}`);
    } finally {
      setIsSavingTranscript(false);
    }
  };

  // Step 5 -> Step 6: Start Dubbing Pipeline
  const handleStartDubbing = async () => {
    if (!project) return;
    try {
      setIsProcessing(true);
      if (dubbingMode === 'ai_dubbing' && Object.keys(speakerMap).length > 0) {
        await api.updateProjectSpeakers(project.id, {
          dubbing_mode: dubbingMode,
          speakers: speakerMap,
        }).catch(console.error);
      } else if (selectedVoice) {
        await api.configureVoice(
          project.id,
          selectedVoice.voice_id,
          selectedVoice.provider,
          targetLang,
          speed,
          pitch,
          volumeGain,
          replicationEnabled
        ).catch(console.error);
      }
      const trigger = await api.startDubbing(project.id);
      setActiveJob({
        id: trigger.job_id,
        project_id: project.id,
        stage: 'GENERATING_SPEECH',
        status: 'RUNNING',
        progress: 10,
        message: 'Synthesizing voice clips in target language...',
        retry_count: 0,
        created_at: new Date().toISOString(),
      });
      setCurrentStep(6);
    } catch (err: any) {
      alert(`Failed to start dubbing: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const targetLangInfo = languages.find((l) => l.code === targetLang);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Wizard Step Bar */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCurrent = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            const isClickable = s.num < currentStep && !isProcessing;
            return (
              <div
                key={s.num}
                onClick={() => isClickable && setCurrentStep(s.num)}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition ${
                  isCurrent
                    ? 'bg-accent-600/10 text-accent-400 border border-accent-500/30'
                    : isCompleted
                    ? 'text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer'
                    : 'text-slate-500'
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] ${
                    isCurrent
                      ? 'bg-accent-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-surface-elevated text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : s.num}
                </div>
                <span className="truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Upload Video */}
      {currentStep === 1 && (
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Step 1: Upload Video</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select an MP4, MOV, or WebM video you would like to translate and dub.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full sm:max-w-md rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500 transition"
              placeholder="e.g. YouTube Tech Review Dub"
            />
          </div>

          <VideoUploader
            onFileSelect={(file) => setSelectedFile(file)}
            selectedFile={selectedFile}
            onClear={() => setSelectedFile(null)}
            uploading={isProcessing}
          />

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleNextFromUpload}
              disabled={!selectedFile || isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-40 text-sm font-semibold text-white transition shadow-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading Video...</span>
                </>
              ) : (
                <>
                  <span>Continue to Languages</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Languages */}
      {currentStep === 2 && (
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Step 2: Dynamic Language Selection</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select the source language of your video and the desired target language for speech conversion.
            </p>
          </div>

          <LanguageSelector
            languages={languages}
            sourceLang={sourceLang}
            targetLang={targetLang}
            onSourceChange={setSourceLang}
            onTargetChange={setTargetLang}
          />

          {/* Compatibility Verification Panel */}
          <CompatibilityPanel compatibility={compatibility} loading={loadingCompat} />

          <div className="flex justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              disabled={Boolean(compatibility && !compatibility.is_compatible)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-40 text-sm font-semibold text-white transition shadow-sm"
            >
              <span>Continue to Voices</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Mode & Voice Selection */}
      {currentStep === 3 && (
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Step 3: Choose Mode & Voice Acoustics</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select between multi-character AI Dubbing (gender matching & lip sync) or single-narrator Voice Over.
            </p>
          </div>

          {/* Mode Selector: AI Dubbing vs Voice Over */}
          <DubbingModeSelector
            mode={dubbingMode}
            onModeChange={(m) => setDubbingMode(m)}
          />

          {dubbingMode === 'ai_dubbing' ? (
            <div className="rounded-xl border border-accent-500/30 bg-accent-500/5 p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🎬</span>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Multi-Character Dialogue AI Dubbing (ملٹی کریکٹر ڈبنگ موڈ)
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Our AI pipeline automatically detects each character in the video, identifies their gender (Male/Female), and assigns distinct natural voices with lip-sync timing.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="rounded-lg border border-border/60 bg-surface/80 p-3">
                  <div className="text-base mb-1">👨 🎙️</div>
                  <div className="text-xs font-bold text-white">Male Voice Matching</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    All male dialogues are translated and spoken by masculine voices (mardana awaz).
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-surface/80 p-3">
                  <div className="text-base mb-1">👩 🎙️</div>
                  <div className="text-xs font-bold text-white">Female Voice Matching</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    All female dialogues are translated and spoken by feminine voices (zanana awaz).
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-surface/80 p-3">
                  <div className="text-base mb-1">🎯 ⏱️</div>
                  <div className="text-xs font-bold text-white">Lip-Sync & Emotion</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Silence removal & time-stretching match natural dialogue breath and mouth movements.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-400 flex items-center gap-2 bg-surface/40 p-3 rounded-lg border border-border/40">
                <span className="text-accent-400 font-bold">ℹ️ Note:</span>
                <span>
                  After transcription in Step 5, you will be able to review and customize each detected character's assigned voice, listen to audio samples, and switch genders if desired.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-center gap-2.5">
                <span className="text-xl">🎙️</span>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Voice Over (Single Narrator / ایک راوی کی آواز)
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    The chosen narrator voice below will narrate all segments across the entire video.
                  </p>
                </div>
              </div>

              <VoiceSelector
                voices={voices}
                selectedVoiceId={selectedVoice?.voice_id || ''}
                onSelectVoice={(v) => setSelectedVoice(v)}
                speed={speed}
                onSpeedChange={setSpeed}
                pitch={pitch}
                onPitchChange={setPitch}
                replicationEnabled={replicationEnabled}
                onToggleReplication={setReplicationEnabled}
                targetLanguage={targetLang}
              />
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              disabled={dubbingMode === 'voice_over' && !selectedVoice}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-40 text-sm font-semibold text-white transition shadow-sm"
            >
              <span>Dubbing Settings</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Dubbing Settings */}
      {currentStep === 4 && (
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Step 4: Configure Dubbing & Audio Mix</h2>
            <p className="text-xs text-slate-400 mt-1">
              Fine-tune background audio ducking, subtitle options, and translation style.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Background Audio Settings */}
            <div className="rounded-xl border border-border bg-surface-elevated/40 p-5 space-y-4">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Original Voice Handling (اصل آواز کا کنٹرول)
              </h4>

              {/* Option A: Mute Original Voice Completely */}
              <div
                onClick={() => {
                  setPreserveBackground(false);
                  setOrigVolume(0.0);
                }}
                className={`cursor-pointer rounded-xl border p-3.5 transition flex items-start gap-3 ${
                  !preserveBackground
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                    : 'border-border bg-surface hover:border-slate-500'
                }`}
              >
                <div className="text-xl">🔇</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Mute Original Voice (اصل آواز مکمل ختم کریں)
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    100% clean replacement: Only the newly converted AI voice is heard.
                  </p>
                </div>
              </div>

              {/* Option B: Keep Background Sound Effects */}
              <div
                onClick={() => {
                  setPreserveBackground(true);
                  if (origVolume <= 0.01) setOrigVolume(0.10);
                }}
                className={`cursor-pointer rounded-xl border p-3.5 transition flex items-start gap-3 ${
                  preserveBackground
                    ? 'border-accent-500 bg-accent-500/10 shadow-sm'
                    : 'border-border bg-surface hover:border-slate-500'
                }`}
              >
                <div className="text-xl">🔉</div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-white">
                    Keep Background Music / SFX (پس منظر آواز رکھیں)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Original audio is ducked and kept low in the background.
                  </p>
                </div>
              </div>

              {preserveBackground && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Background Audio Volume</span>
                    <span className="font-mono">{Math.round(origVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.30"
                    step="0.05"
                    value={origVolume}
                    onChange={(e) => setOrigVolume(parseFloat(e.target.value))}
                    className="w-full accent-accent-500 bg-surface"
                  />
                  <p className="text-[10px] text-slate-500">
                    Keeps background low so the dubbed voice remains clear and crisp.
                  </p>
                </div>
              )}
            </div>

            {/* Subtitles & Formatting */}
            <div className="rounded-xl border border-border bg-surface-elevated/40 p-5 space-y-4">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Subtitles & Translation
              </h4>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-medium text-slate-200">Generate Subtitles</div>
                  <div className="text-[11px] text-slate-400">Export SRT & WebVTT subtitle files</div>
                </div>
                <input
                  type="checkbox"
                  checked={subtitlesEnabled}
                  onChange={(e) => setSubtitlesEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-accent-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-medium text-slate-200">Burn Subtitles into Video</div>
                  <div className="text-[11px] text-slate-400">Permanently render text onto frames</div>
                </div>
                <input
                  type="checkbox"
                  checked={burnSubtitles}
                  onChange={(e) => setBurnSubtitles(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-accent-500"
                />
              </label>

              <div className="pt-2 border-t border-border">
                <label className="block text-xs text-slate-300 mb-1.5 font-medium">
                  Translation Tone & Style
                </label>
                <select
                  value={translationStyle}
                  onChange={(e) => setTranslationStyle(e.target.value as any)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-500"
                >
                  <option value="natural">Natural (Balanced conversational speech)</option>
                  <option value="conversational">Conversational (Informal, expressive)</option>
                  <option value="formal">Formal (Professional, documentary)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleStartTranscription}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-40 text-sm font-semibold text-white transition shadow-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Preparing Pipeline...</span>
                </>
              ) : (
                <>
                  <span>Extract & Transcribe</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Review & Edit Transcript */}
      {currentStep === 5 && (
        <div className="space-y-6">
          {/* If job is still running transcription */}
          {activeJob && (activeJob.status === 'RUNNING' || activeJob.status === 'QUEUED') ? (
            <JobProgress
              job={activeJob}
              onCancel={() => api.cancelJob(activeJob.id)}
            />
          ) : (
            <div className="space-y-6">
              {/* Speaker Voice Mapping (AI Dubbing Mode) */}
              {dubbingMode === 'ai_dubbing' && Object.keys(speakerMap).length > 0 && (
                <SpeakerVoiceMapper
                  speakers={speakerMap}
                  voices={voices}
                  targetLanguage={targetLang}
                  onUpdateSpeaker={(spkId, updates) => {
                    setSpeakerMap((prev) => {
                      const updated = {
                        ...prev,
                        [spkId]: {
                          ...prev[spkId],
                          ...updates,
                        },
                      };
                      if (project) {
                        api.updateProjectSpeakers(project.id, {
                          dubbing_mode: 'ai_dubbing',
                          speakers: updated,
                        }).catch(console.error);
                      }
                      return updated;
                    });
                  }}
                />
              )}

              <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-6">
                <TranscriptEditor
                  segments={segments}
                  targetLangDirection={targetLangInfo?.direction || 'ltr'}
                  targetLangName={targetLangInfo?.name || targetLang}
                  onSaveSegments={handleSaveSegments}
                  isSaving={isSavingTranscript}
                />

                <div className="flex justify-between pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStartDubbing}
                    disabled={segments.length === 0 || isProcessing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm font-semibold text-white transition shadow-md"
                  >
                    <PlayCircle className="h-4 w-4" />
                    <span>Generate Dubbing & Render MP4</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 6: Export & Preview */}
      {currentStep === 6 && (
        <div className="space-y-6">
          {activeJob && (activeJob.status === 'RUNNING' || activeJob.status === 'QUEUED') ? (
            <JobProgress
              job={activeJob}
              onCancel={() => api.cancelJob(activeJob.id)}
            />
          ) : (
            project && (
              <VideoPlayer
                projectId={project.id}
                projectName={project.name}
                targetLanguage={targetLang}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
