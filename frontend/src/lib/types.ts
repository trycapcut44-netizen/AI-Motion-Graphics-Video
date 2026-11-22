export interface LanguageInfo {
  code: string;
  name: string;
  native_name: string;
  script: string;
  direction: 'ltr' | 'rtl';
  transcription_supported: boolean;
  translation_supported: boolean;
  tts_supported: boolean;
  voice_replication_supported: boolean;
  subtitles_supported: boolean;
  providers: string[];
  notes?: string;
}

export interface PipelineStageStatus {
  supported: boolean;
  provider: string;
  message: string;
}

export interface LanguageCompatibilityResponse {
  source_language: string;
  target_language: string;
  is_compatible: boolean;
  audio_extraction: PipelineStageStatus;
  transcription: PipelineStageStatus;
  translation: PipelineStageStatus;
  speech_generation: PipelineStageStatus;
  voice_replication: PipelineStageStatus;
  subtitles: PipelineStageStatus;
  limitations: string[];
}

export interface VoiceOption {
  voice_id: string;
  name: string;
  provider: string;
  language_code: string;
  gender: 'male' | 'female' | 'neutral';
  sample_url?: string;
  description?: string;
  supports_cloning: boolean;
}

export interface SpeakerVoiceConfig {
  speaker_id: string;
  character_name: string;
  gender: 'male' | 'female';
  voice_id: string;
  voice_name: string;
  provider: string;
  speed?: number;
  pitch?: number;
}

export interface TranscriptSegment {
  id: string;
  project_id: string;
  speaker_id: string;
  speaker_gender?: 'male' | 'female';
  voice_id?: string | null;
  start_time: number;
  end_time: number;
  source_text: string;
  translated_text: string | null;
  audio_asset_id?: string | null;
  edit_version: number;
  is_approved: boolean;
}

export interface MediaAsset {
  id: string;
  project_id: string;
  asset_type: string;
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  created_at: string;
}

export interface ProcessingJob {
  id: string;
  project_id: string;
  stage: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  message?: string;
  error_code?: string;
  error_details?: string;
  retry_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ProjectSettings {
  dubbing_mode?: 'voice_over' | 'ai_dubbing';
  speaker_map?: Record<string, SpeakerVoiceConfig>;
  background_audio_enabled: boolean;
  original_audio_volume: number;
  dubbed_speech_volume: number;
  speech_speed: number;
  subtitles_enabled: boolean;
  burn_subtitles: boolean;
  translation_style: 'natural' | 'conversational' | 'formal';
  selected_voice_id?: string;
  selected_voice_name?: string;
  selected_voice_gender?: string;
  selected_voice_provider?: string;
  replication_enabled?: boolean;
}

export interface Project {
  id: string;
  name: string;
  owner_id?: string;
  source_language: string;
  target_language: string;
  status: string;
  original_asset_id?: string;
  output_asset_id?: string;
  settings_json?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  assets?: MediaAsset[];
  segments?: TranscriptSegment[];
  jobs?: ProcessingJob[];
}

export interface UsageStats {
  total_projects: number;
  completed_projects: number;
  failed_jobs: number;
  total_video_duration_seconds: number;
  total_video_duration_minutes: number;
  total_estimated_cost_usd: number;
  services: {
    gemini_api: {
      configured: boolean;
      model_transcription: string;
      model_translation: string;
      model_tts: string;
    };
    edge_neural_tts: {
      configured: boolean;
      status: string;
      cost: string;
      languages_supported: string;
    };
    ffmpeg_engine: {
      path: string;
      status: string;
    };
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string | null;
  role: 'admin' | 'user' | 'editor' | 'viewer';
  status: 'active' | 'suspended' | 'pending';
  is_active: boolean;
  can_ai_dubbing: boolean;
  can_voice_over: boolean;
  can_clone_voice: boolean;
  can_export_subtitles: boolean;
  can_burn_subtitles: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  max_video_duration_minutes: number;
  monthly_minutes_quota: number;
  used_minutes: number;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
  projects_count?: number;
}

export interface UserAccessUpdate {
  is_active?: boolean;
  status?: string;
  role?: string;
  can_ai_dubbing?: boolean;
  can_voice_over?: boolean;
  can_clone_voice?: boolean;
  can_export_subtitles?: boolean;
  can_burn_subtitles?: boolean;
  tier?: string;
  max_video_duration_minutes?: number;
  monthly_minutes_quota?: number;
  used_minutes?: number;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  suspended_users: number;
  admin_users: number;
  total_projects: number;
  total_minutes_dubbed: number;
  ai_dubbing_enabled_users: number;
  system_status: string;
}

export interface AccessStatus {
  allowed: boolean;
  is_locked: boolean;
  reason?: string;
  message?: string;
  client_name?: string;
  license_key?: string;
  status?: string;
  expires_at?: string;
  features?: {
    ai_dubbing?: boolean;
    voice_over?: boolean;
    voice_cloning?: boolean;
  };
}

export interface ClientLicense {
  id: string;
  license_key: string;
  client_name: string;
  status: 'active' | 'revoked' | 'suspended' | 'expired';
  is_active: boolean;
  expires_at?: string | null;
  allowed_features?: string;
  notes?: string | null;
  device_info?: string | null;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemAccessConfig {
  is_global_locked: boolean;
  lock_message: string;
  remote_kill_switch_enabled: boolean;
  remote_kill_switch_url: string;
  updated_at?: string;
}

