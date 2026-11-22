'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Film, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface VideoUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  uploading?: boolean;
}

export default function VideoUploader({
  onFileSelect,
  selectedFile,
  onClear,
  uploading,
}: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const validExtensions = ['.mp4', '.mov', '.webm', '.mkv', '.avi'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      alert(`Invalid format. Please upload: ${validExtensions.join(', ')}`);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onFileSelect(file);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setVideoDuration(e.currentTarget.duration);
  };

  const clearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setVideoDuration(null);
    onClear();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
            isDragging
              ? 'border-accent-500 bg-accent-500/10'
              : 'border-border bg-surface hover:border-slate-500 hover:bg-surface-elevated/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
            className="hidden"
          />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated text-accent-400 border border-border shadow-sm mb-4">
            <UploadCloud className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-white">Upload your video</h3>
          <p className="mt-1 text-xs text-slate-400">
            Drag and drop your video file here, or click to browse
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
            <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border">MP4</span>
            <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border">MOV</span>
            <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border">WebM</span>
            <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border">MKV</span>
            <span>Max 250 MB (Up to 10 minutes)</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20">
                <Film className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white truncate max-w-sm sm:max-w-md">
                  {selectedFile.name}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span>{formatBytes(selectedFile.size)}</span>
                  {videoDuration && <span>• {formatDuration(videoDuration)} duration</span>}
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready for processing
                  </span>
                </div>
              </div>
            </div>
            {!uploading && (
              <button
                type="button"
                onClick={clearSelection}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated transition"
                title="Remove video"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Video Preview */}
          {previewUrl && (
            <div className="relative rounded-xl overflow-hidden bg-black/60 border border-border aspect-video max-h-72 flex items-center justify-center">
              <video
                src={previewUrl}
                controls
                onLoadedMetadata={handleLoadedMetadata}
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
