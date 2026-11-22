'use client';

import React, { useEffect, useState } from 'react';
import {
  Globe2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Mic,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { LanguageInfo, VoiceOption } from '@/lib/types';

export default function LanguagesPage() {
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>('hi');
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLanguages()
      .then((data) => {
        setLanguages(data);
        if (data.length > 0) {
          const defaultLang = data.find((l) => l.code === 'hi') || data[0];
          setSelectedLang(defaultLang.code);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedLang) {
      api.getVoices(selectedLang)
        .then(setVoices)
        .catch(console.error);
    }
  }, [selectedLang]);

  const filteredLanguages = languages.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.native_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Multilingual Language & Voice Matrix
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Comprehensive capability matrix of all verified languages and neural voice models across transcription, translation, and speech synthesis.
        </p>
      </div>

      {/* Main Grid: Language Table on Left, Voice Catalog on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Language Table */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages..."
                className="w-full rounded-lg border border-border bg-surface-elevated pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
              />
            </div>
            <span className="text-xs text-slate-400">{filteredLanguages.length} languages</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-elevated/40 text-slate-400 border-b border-border text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-3">Script / RTL</th>
                  <th className="py-3 px-3 text-center">Transcribe</th>
                  <th className="py-3 px-3 text-center">Translate</th>
                  <th className="py-3 px-3 text-center">TTS Voices</th>
                  <th className="py-3 px-3 text-center">Voice Replica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLanguages.map((lang) => {
                  const isSelected = selectedLang === lang.code;
                  return (
                    <tr
                      key={lang.code}
                      onClick={() => setSelectedLang(lang.code)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-accent-600/10 text-white font-medium'
                          : 'hover:bg-surface-elevated/30 text-slate-300'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{lang.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {lang.native_name} <span className="font-mono uppercase text-[10px] text-slate-500">({lang.code})</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-300">{lang.script}</div>
                        {lang.direction === 'rtl' && (
                          <span className="text-[10px] font-semibold text-amber-400">RTL Layout</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {lang.transcription_supported ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 inline" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-600 inline" />
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {lang.translation_supported ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 inline" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-600 inline" />
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {lang.tts_supported ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 inline" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-600 inline" />
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {lang.voice_replication_supported ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-semibold">
                            <ShieldCheck className="h-3.5 w-3.5" /> Eligible
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">Restricted</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Language Voice Explorer */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Mic className="h-4 w-4 text-accent-400" />
            <h3 className="text-sm font-semibold text-white">
              Voices for {languages.find((l) => l.code === selectedLang)?.name || selectedLang}
            </h3>
          </div>

          <div className="space-y-3">
            {voices.length === 0 ? (
              <p className="text-xs text-slate-500">No standalone voices cataloged for this code.</p>
            ) : (
              voices.map((voice) => (
                <div
                  key={voice.voice_id}
                  className="rounded-xl border border-border bg-surface-elevated/40 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{voice.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                        voice.gender === 'female'
                          ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {voice.gender}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{voice.description}</p>
                  <div className="text-[10px] font-mono text-slate-500 pt-1">
                    Provider: {voice.provider}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
