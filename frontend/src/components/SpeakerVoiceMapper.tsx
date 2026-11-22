'use client';

import React, { useState, useRef } from 'react';
import { Users, Volume2, Play, Square, Loader2, Sparkles, Check } from 'lucide-react';
import { VoiceOption, SpeakerVoiceConfig } from '@/lib/types';

interface SpeakerVoiceMapperProps {
  speakers: Record<string, SpeakerVoiceConfig>;
  voices: VoiceOption[];
  targetLanguage: string;
  onUpdateSpeaker: (speakerId: string, updates: Partial<SpeakerVoiceConfig>) => void;
}

export default function SpeakerVoiceMapper({
  speakers,
  voices,
  targetLanguage,
  onUpdateSpeaker,
}: SpeakerVoiceMapperProps) {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speakerEntries = Object.entries(speakers);

  const handlePlayPreview = async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingVoiceId === voiceId) {
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
      const url = `/api/v1/voices/${encodeURIComponent(voiceId)}/preview?language_code=${encodeURIComponent(targetLanguage)}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setPlayingVoiceId(voiceId);
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
      console.error('Audio playback error:', err);
      setPlayingVoiceId(null);
    }
  };

  if (speakerEntries.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center text-xs text-slate-400">
        No characters detected yet. Character voice mapping will automatically appear once the video is transcribed.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-400" />
            <span>Character &amp; Speaker Voice Mapping (کرداروں کی آوازوں کی سیٹنگ)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Each video character has their own distinct voice. Male speakers speak in male voices, and female speakers speak in female voices.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
          {speakerEntries.length} Character{speakerEntries.length > 1 ? 's' : ''} Detected
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {speakerEntries.map(([spkId, config]) => {
          const isMale = config.gender === 'male';
          const isPlaying = playingVoiceId === config.voice_id;

          // Filter compatible voices matching gender
          const genderVoices = voices.filter((v) => v.gender === config.gender);
          const voiceOptionsToUse = genderVoices.length > 0 ? genderVoices : voices;

          return (
            <div
              key={spkId}
              className={`rounded-xl border p-4 transition space-y-3 ${
                isMale
                  ? 'border-blue-500/40 bg-blue-500/5'
                  : 'border-pink-500/40 bg-pink-500/5'
              }`}
            >
              {/* Header with Gender Switcher */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{isMale ? '👨' : '👩'}</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">{spkId}</h4>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                        isMale
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-pink-500/20 text-pink-300'
                      }`}
                    >
                      {isMale ? 'Male Character (مردانہ)' : 'Female Character (زنانی)'}
                    </span>
                  </div>
                </div>

                {/* Gender Toggle */}
                <div className="flex rounded-lg border border-border bg-surface p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      const newGender = 'male';
                      const bestMale = voices.find((v) => v.gender === 'male');
                      onUpdateSpeaker(spkId, {
                        gender: newGender,
                        voice_id: bestMale?.voice_id || config.voice_id,
                        voice_name: bestMale?.name || config.voice_name,
                      });
                    }}
                    className={`px-2 py-1 rounded transition ${
                      isMale ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👨 Male
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newGender = 'female';
                      const bestFemale = voices.find((v) => v.gender === 'female');
                      onUpdateSpeaker(spkId, {
                        gender: newGender,
                        voice_id: bestFemale?.voice_id || config.voice_id,
                        voice_name: bestFemale?.name || config.voice_name,
                      });
                    }}
                    className={`px-2 py-1 rounded transition ${
                      !isMale ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👩 Female
                  </button>
                </div>
              </div>

              {/* Voice Selector Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">
                  Assigned AI Voice ({isMale ? 'مردانہ آواز' : 'زنانی آواز'}):
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={config.voice_id}
                    onChange={(e) => {
                      const vId = e.target.value;
                      const selected = voices.find((v) => v.voice_id === vId);
                      onUpdateSpeaker(spkId, {
                        voice_id: vId,
                        voice_name: selected?.name || vId,
                        provider: selected?.provider || 'edge_tts',
                      });
                    }}
                    className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-500"
                  >
                    {voiceOptionsToUse.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.name} ({v.gender.toUpperCase()})
                      </option>
                    ))}
                  </select>

                  {/* Audio Preview Button */}
                  <button
                    type="button"
                    onClick={(e) => handlePlayPreview(config.voice_id, e)}
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition ${
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
