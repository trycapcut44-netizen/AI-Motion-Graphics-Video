'use client';

import React, { useState, useRef } from 'react';
import { Volume2, Play, Square, Sparkles, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { VoiceOption } from '@/lib/types';

interface VoiceSelectorProps {
  voices: VoiceOption[];
  selectedVoiceId: string;
  onSelectVoice: (voice: VoiceOption) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  pitch: number;
  onPitchChange: (pitch: number) => void;
  replicationEnabled: boolean;
  onToggleReplication: (enabled: boolean) => void;
  targetLanguage?: string;
}

export default function VoiceSelector({
  voices,
  selectedVoiceId,
  onSelectVoice,
  speed,
  onSpeedChange,
  pitch,
  onPitchChange,
  replicationEnabled,
  onToggleReplication,
  targetLanguage = 'en',
}: VoiceSelectorProps) {
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'all'>('all');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentAffirmed, setConsentAffirmed] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredVoices = voices.filter((v) => {
    if (genderFilter === 'all') return true;
    return v.gender === genderFilter;
  });

  const handleGenderSwitch = (gender: 'male' | 'female' | 'all') => {
    setGenderFilter(gender);
    if (gender !== 'all') {
      const match = voices.find((v) => v.gender === gender);
      if (match && selectedVoiceId !== match.voice_id) {
        onSelectVoice(match);
      }
    }
  };

  const handlePlayPreview = async (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();

    // If currently playing this voice, stop it
    if (playingVoiceId === voice.voice_id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    // Stop existing audio if any
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      setIsLoadingAudio(voice.voice_id);
      const url = `/api/v1/voices/${encodeURIComponent(voice.voice_id)}/preview?language_code=${encodeURIComponent(targetLanguage)}`;
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoadingAudio(null);
        setPlayingVoiceId(voice.voice_id);
      };

      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsLoadingAudio(null);
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error('Audio preview playback error:', err);
      setIsLoadingAudio(null);
      setPlayingVoiceId(null);
    }
  };

  const handleReplicationToggle = () => {
    if (!replicationEnabled) {
      setShowConsentModal(true);
    } else {
      onToggleReplication(false);
      setConsentAffirmed(false);
    }
  };

  const confirmConsent = () => {
    if (consentAffirmed) {
      onToggleReplication(true);
      setShowConsentModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary Voice Gender Selector */}
      <div className="rounded-2xl border border-border bg-surface-elevated/40 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-accent-400" />
              <span>Select Voice Gender (آواز کی جنس منتخب کریں)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose Male or Female voice, listen to audio samples, and pick your favorite speaker.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReplicationToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                replicationEnabled
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                  : 'bg-surface border-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Voice Clone Mode</span>
            </button>
          </div>
        </div>

        {/* Large Gender Toggle Cards */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => handleGenderSwitch('male')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition ${
              genderFilter === 'male'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-surface border-border text-slate-300 hover:border-slate-500 hover:bg-surface-elevated'
            }`}
          >
            <span className="text-base">👨</span>
            <span>Male Voices (مردانہ آوازیں)</span>
          </button>

          <button
            type="button"
            onClick={() => handleGenderSwitch('female')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition ${
              genderFilter === 'female'
                ? 'bg-pink-600 text-white border-pink-500 shadow-md shadow-pink-500/20'
                : 'bg-surface border-border text-slate-300 hover:border-slate-500 hover:bg-surface-elevated'
            }`}
          >
            <span className="text-base">👩</span>
            <span>Female Voices (زنانی آوازیں)</span>
          </button>

          <button
            type="button"
            onClick={() => handleGenderSwitch('all')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition ${
              genderFilter === 'all'
                ? 'bg-accent-600 text-white border-accent-500 shadow-md'
                : 'bg-surface border-border text-slate-300 hover:border-slate-500 hover:bg-surface-elevated'
            }`}
          >
            <span>All Voices (تمام)</span>
          </button>
        </div>
      </div>

      {/* Voice Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredVoices.map((voice) => {
          const isSelected = selectedVoiceId === voice.voice_id;
          const isMale = voice.gender === 'male';
          const isPlaying = playingVoiceId === voice.voice_id;
          const isLoading = isLoadingAudio === voice.voice_id;

          return (
            <div
              key={voice.voice_id}
              onClick={() => onSelectVoice(voice)}
              className={`cursor-pointer rounded-2xl border p-5 transition relative flex flex-col justify-between ${
                isSelected
                  ? isMale
                    ? 'border-blue-500 bg-blue-500/10 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/40'
                    : 'border-pink-500 bg-pink-500/10 shadow-md shadow-pink-500/10 ring-1 ring-pink-500/40'
                  : 'border-border bg-surface hover:border-slate-500 hover:bg-surface-elevated/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold border ${
                        isMale
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-pink-500/10 text-pink-400 border-pink-500/30'
                      }`}
                    >
                      {isMale ? '👨' : '👩'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{voice.name}</h4>
                      <span
                        className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          isMale
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                        }`}
                      >
                        {isMale ? 'Male Voice' : 'Female Voice'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                  {voice.description || 'Verified neural speech model'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                {/* Audio Preview Button */}
                <button
                  type="button"
                  onClick={(e) => handlePlayPreview(voice, e)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    isPlaying
                      ? 'bg-accent-600 text-white border-accent-500 animate-pulse'
                      : 'bg-surface border-border text-slate-300 hover:text-white hover:bg-surface-elevated'
                  }`}
                  title="Listen to sample audio"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : isPlaying ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" />
                      <span>Stop Audio</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Listen Sample</span>
                    </>
                  )}
                </button>

                {isSelected ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" /> Selected
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 hover:text-slate-300">
                    Click to select
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Speech Adjustments */}
      <div className="rounded-xl border border-border bg-surface p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
            <span>Speech Speed ({speed.toFixed(2)}x)</span>
            <span className="text-slate-500">0.8x - 1.3x</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.3"
            step="0.05"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-full accent-accent-500 bg-surface-elevated"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
            <span>Voice Pitch ({pitch.toFixed(2)}x)</span>
            <span className="text-slate-500">0.85x - 1.15x</span>
          </div>
          <input
            type="range"
            min="0.85"
            max="1.15"
            step="0.05"
            value={pitch}
            onChange={(e) => onPitchChange(parseFloat(e.target.value))}
            className="w-full accent-accent-500 bg-surface-elevated"
          />
        </div>
      </div>

      {/* Consent Modal for Voice Replication */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-purple-400 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Voice Replication Consent & Verification
                </h3>
                <p className="text-xs text-slate-400">Statutory and API Policy Compliance</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 bg-surface-elevated/50 p-4 rounded-xl border border-border">
              <p>
                To utilize voice replication features with Google Gemini Voices API, explicit
                affirmation of permission is legally required.
              </p>
              <div className="flex items-start gap-2 text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Unauthorized voice cloning for impersonation, deception, harassment, or
                  unauthorized use is strictly prohibited.
                </span>
              </div>
            </div>

            <label className="flex items-start gap-3 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAffirmed}
                onChange={(e) => setConsentAffirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-accent-500"
              />
              <span className="text-xs text-slate-300">
                I certify that I hold explicit authorization and legal permission from the speaker to
                replicate their voice for this project.
              </span>
            </label>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmConsent}
                disabled={!consentAffirmed}
                className="px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-40 text-xs font-semibold text-white transition"
              >
                Affirm & Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
