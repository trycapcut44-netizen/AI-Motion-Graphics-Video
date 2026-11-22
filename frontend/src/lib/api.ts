import {
  LanguageInfo,
  LanguageCompatibilityResponse,
  VoiceOption,
  Project,
  TranscriptSegment,
  ProcessingJob,
  UsageStats,
  User,
  UserAccessUpdate,
  AdminStats,
  AccessStatus,
  ClientLicense,
  SystemAccessConfig,
} from './types';

const API_BASE = '/api/v1';

export function getStoredLicenseKey(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gdub_license_key') || '';
  }
  return '';
}

export function setStoredLicenseKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key) {
      localStorage.setItem('gdub_license_key', key);
    } else {
      localStorage.removeItem('gdub_license_key');
    }
  }
}

export function getStoredAdminToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gdub_admin_token') || '';
  }
  return '';
}

export function setStoredAdminToken(token: string): void {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('gdub_admin_token', token);
    } else {
      localStorage.removeItem('gdub_admin_token');
    }
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const customHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  const licenseKey = getStoredLicenseKey();
  if (licenseKey && !customHeaders['X-License-Key']) {
    customHeaders['X-License-Key'] = licenseKey;
  }

  const adminToken = getStoredAdminToken();
  if (adminToken && !customHeaders['X-Admin-Key'] && !customHeaders['Authorization']) {
    customHeaders['X-Admin-Key'] = adminToken;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: customHeaders,
  });

  const rawText = await res.text();

  if (!res.ok) {
    let errorDetail = `Request failed (${res.status} ${res.statusText})`;
    if (rawText) {
      try {
        const err = JSON.parse(rawText);
        if (typeof err.detail === 'string') {
          errorDetail = err.detail;
        } else if (Array.isArray(err.detail)) {
          errorDetail = err.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
        } else if (err.message) {
          errorDetail = err.message;
        } else {
          errorDetail = JSON.stringify(err);
        }
      } catch {
        errorDetail = rawText.slice(0, 300);
      }
    }
    throw new Error(errorDetail);
  }

  if (!rawText.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(rawText) as T;
  } catch (err: any) {
    throw new Error(`Failed to parse response JSON: ${err.message}`);
  }
}

export const api = {
  // Languages
  getLanguages: () => fetchJson<LanguageInfo[]>('/languages'),
  checkCompatibility: (source: string, target: string, replication: boolean = false) =>
    fetchJson<LanguageCompatibilityResponse>('/languages/compatibility', {
      method: 'POST',
      body: JSON.stringify({
        source_language: source,
        target_language: target,
        voice_replication_requested: replication,
      }),
    }),

  // Voices
  getVoices: (languageCode: string = 'hi') =>
    fetchJson<VoiceOption[]>(`/voices?language_code=${encodeURIComponent(languageCode)}`),
  getProjectVoice: (projectId: string) =>
    fetchJson<{ voice_id: string | null; voice_name?: string; gender?: string; provider?: string }>(
      `/voices/projects/${projectId}/configuration`
    ),
  configureVoice: (
    projectId: string,
    voiceId: string,
    provider: string,
    langCode: string,
    speed: number = 1.0,
    pitch: number = 1.0,
    gain: number = 1.0,
    replication: boolean = false,
    voiceName?: string,
    gender?: string
  ) =>
    fetchJson(`/voices/projects/${projectId}/configure`, {
      method: 'POST',
      body: JSON.stringify({
        voice_id: voiceId,
        voice_name: voiceName,
        gender,
        provider,
        language_code: langCode,
        speed,
        pitch,
        volume_gain: gain,
        replication_enabled: replication,
      }),
    }),
  submitConsent: (projectId: string, speakerName: string, consentStatement: string) =>
    fetchJson(`/voices/projects/${projectId}/consent`, {
      method: 'POST',
      body: JSON.stringify({
        speaker_name: speakerName,
        consent_statement: consentStatement,
        has_explicit_permission: true,
      }),
    }),

  // Projects
  getProjects: () => fetchJson<Project[]>('/projects'),
  getProject: (id: string) => fetchJson<Project>(`/projects/${id}`),
  createProject: (name: string, sourceLang: string, targetLang: string, settings?: any) =>
    fetchJson<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name,
        source_language: sourceLang,
        target_language: targetLang,
        settings,
      }),
    }),
  updateProject: (id: string, updates: Partial<Project> & { settings?: any }) =>
    fetchJson<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  getProjectSpeakers: (projectId: string) =>
    fetchJson<{ project_id: string; dubbing_mode: string; speakers: Record<string, any> }>(
      `/projects/${projectId}/speakers`
    ),
  updateProjectSpeakers: (projectId: string, payload: { dubbing_mode?: string; speakers?: Record<string, any> }) =>
    fetchJson<{ status: string; dubbing_mode: string; speakers: Record<string, any> }>(
      `/projects/${projectId}/speakers`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    ),
  deleteProject: (id: string) =>
    fetchJson<{ status: string; message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),
  uploadVideo: async (projectId: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    const licenseKey = getStoredLicenseKey();
    if (licenseKey) {
      headers['X-License-Key'] = licenseKey;
    }
    const res = await fetch(`${API_BASE}/projects/${projectId}/upload`, {
      method: 'POST',
      body: formData,
      headers,
    });
    const raw = await res.text();
    if (!res.ok) {
      let detail = `Upload failed (${res.status})`;
      try {
        const err = JSON.parse(raw);
        detail = err.detail || detail;
      } catch {
        if (raw) detail = raw.slice(0, 300);
      }
      throw new Error(detail);
    }
    return JSON.parse(raw);
  },

  // Transcription
  startTranscription: (projectId: string) =>
    fetchJson<{ status: string; job_id: string }>(`/projects/${projectId}/transcription`, {
      method: 'POST',
    }),

  // Transcript
  getTranscript: (projectId: string) =>
    fetchJson<TranscriptSegment[]>(`/projects/${projectId}/transcript`),
  updateTranscriptBulk: (projectId: string, segments: TranscriptSegment[]) =>
    fetchJson<TranscriptSegment[]>(`/projects/${projectId}/transcript`, {
      method: 'PUT',
      body: JSON.stringify({ segments }),
    }),
  updateSingleSegment: (projectId: string, segmentId: string, updates: Partial<TranscriptSegment>) =>
    fetchJson<TranscriptSegment>(`/projects/${projectId}/transcript/${segmentId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  // Dubbing
  startDubbing: (projectId: string) =>
    fetchJson<{ status: string; job_id: string }>(`/projects/${projectId}/dub`, {
      method: 'POST',
    }),

  // Jobs
  getJobStatus: (jobId: string) => fetchJson<ProcessingJob>(`/jobs/${jobId}`),
  cancelJob: (jobId: string) =>
    fetchJson<{ status: string; message: string }>(`/jobs/${jobId}/cancel`, {
      method: 'POST',
    }),
  retryJob: (jobId: string) =>
    fetchJson<{ status: string; message: string }>(`/jobs/${jobId}/retry`, {
      method: 'POST',
    }),

  // Usage
  getUsageStats: () => fetchJson<UsageStats>('/usage/stats'),

  // Gemini API Key Management
  getGeminiKeyStatus: () =>
    fetchJson<{
      is_configured: boolean;
      masked_key: string;
      transcription_model: string;
      translation_model: string;
      tts_model: string;
    }>('/settings/gemini-key'),
  saveGeminiKey: (apiKey: string) =>
    fetchJson<{ status: string; message: string; masked_key: string; is_configured: boolean }>(
      '/settings/gemini-key',
      {
        method: 'POST',
        body: JSON.stringify({ api_key: apiKey }),
      }
    ),
  removeGeminiKey: () =>
    fetchJson<{ status: string; message: string; is_configured: boolean }>(
      '/settings/gemini-key',
      {
        method: 'DELETE',
      }
    ),
  testGeminiKey: (apiKey?: string) =>
    fetchJson<{ status: string; message: string; test_response?: string }>(
      '/settings/gemini-key/test',
      {
        method: 'POST',
        body: JSON.stringify({ api_key: apiKey || '' }),
      }
    ),

  // Downloads URL helpers
  getDownloadUrl: (projectId: string, assetType: string) =>
    `${API_BASE}/projects/${projectId}/downloads/${assetType}`,

  // Admin Panel & Access Control APIs
  getAdminStats: () => fetchJson<AdminStats>('/admin/stats'),
  getAdminUsers: (params?: { search?: string; role?: string; status?: string; tier?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    if (params?.status) query.append('status', params.status);
    if (params?.tier) query.append('tier', params.tier);
    const qs = query.toString();
    return fetchJson<User[]>(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  getAdminUser: (userId: string) => fetchJson<User>(`/admin/users/${userId}`),
  createAdminUser: (data: Partial<User> & { email: string; username: string }) =>
    fetchJson<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminUserProfile: (userId: string, data: Partial<User>) =>
    fetchJson<User>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateAdminUserAccess: (userId: string, data: UserAccessUpdate) =>
    fetchJson<User>(`/admin/users/${userId}/access`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  toggleUserStatus: (userId: string) =>
    fetchJson<User>(`/admin/users/${userId}/toggle-status`, {
      method: 'POST',
    }),
  deleteAdminUser: (userId: string) =>
    fetchJson<{ success: boolean; detail: string; id: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    }),

  // License & Tool Access Control APIs
  getAccessStatus: (licenseKey?: string) => {
    const qs = licenseKey ? `?license_key=${encodeURIComponent(licenseKey)}` : '';
    return fetchJson<AccessStatus>(`/access/status${qs}`);
  },
  verifyLicenseKey: (license_key: string) =>
    fetchJson<AccessStatus>('/access/verify-key', {
      method: 'POST',
      body: JSON.stringify({ license_key }),
    }),
  adminLogin: (password: string) =>
    fetchJson<{ authenticated: boolean; token?: string; message: string }>('/access/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  getAdminLicenses: () => fetchJson<ClientLicense[]>('/access/admin/licenses'),
  createAdminLicense: (payload: {
    client_name: string;
    expires_in_days?: number | null;
    notes?: string;
    allowed_features?: Record<string, boolean>;
  }) =>
    fetchJson<ClientLicense>('/access/admin/licenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  revokeAdminLicense: (licenseId: string) =>
    fetchJson<ClientLicense>(`/access/admin/licenses/${licenseId}/revoke`, {
      method: 'POST',
    }),
  restoreAdminLicense: (licenseId: string) =>
    fetchJson<ClientLicense>(`/access/admin/licenses/${licenseId}/restore`, {
      method: 'POST',
    }),
  deleteAdminLicense: (licenseId: string) =>
    fetchJson<{ message: string }>(`/access/admin/licenses/${licenseId}`, {
      method: 'DELETE',
    }),
  getAdminSystemConfig: () =>
    fetchJson<SystemAccessConfig>('/access/admin/system-config'),
  toggleGlobalLock: (is_locked: boolean, lock_message?: string) =>
    fetchJson<{ is_global_locked: boolean; lock_message: string; message: string }>(
      '/access/admin/global-lock',
      {
        method: 'POST',
        body: JSON.stringify({ is_locked, lock_message }),
      }
    ),
  updateRemoteConfig: (enabled: boolean, url: string) =>
    fetchJson<{ remote_kill_switch_enabled: boolean; remote_kill_switch_url: string; message: string }>(
      '/access/admin/remote-config',
      {
        method: 'POST',
        body: JSON.stringify({ enabled, url }),
      }
    ),
  testRemoteUrl: (url: string) =>
    fetchJson<{ success: boolean; message: string }>('/access/admin/remote-test', {
      method: 'POST',
      body: JSON.stringify({ enabled: true, url }),
    }),
  changeAdminPassword: (current_password: string, new_password: string) =>
    fetchJson<{ message: string; new_token: string }>('/access/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),
};
