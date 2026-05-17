const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

type CheckResult = { taken: boolean; message?: string };

class ApiClient {
  private checkCache = new Map<string, { result: CheckResult; expiresAt: number }>();
  private static CACHE_TTL_MS = 30_000;

  constructor() {}

  private getCachedCheck(key: string): CheckResult | null {
    const entry = this.checkCache.get(key);
    if (entry && Date.now() < entry.expiresAt) return entry.result;
    this.checkCache.delete(key);
    return null;
  }

  private setCachedCheck(key: string, result: CheckResult): void {
    this.checkCache.set(key, { result, expiresAt: Date.now() + ApiClient.CACHE_TTL_MS });
  }

  getAuthToken(): string | null {
    return sessionStorage.getItem('jwt_token');
  }

  decodeJwt(token: string): any | null {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  private getAuthUserId(): string | null {
    const token = this.getAuthToken();
    if (!token) return null;
    const payload = this.decodeJwt(token);
    if (!payload) return null;
    const userId = payload.userId ?? payload.userID ?? payload.sub ?? payload.uid;
    return userId != null ? String(userId) : null;
  }

  private getHeaders(includeAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'X-Client-Info': 'portal-app',
      'Apikey': SUPABASE_ANON_KEY,
    };

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['X-User-Token'] = token;
      }
    }

    return headers;
  }

  async login(username: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`http://localhost:8090/profiler/user/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const raw = await response.json();

      // Backend always returns HTTP 200; check responseCode in body for actual result
      const responseCode = String(raw?.responseCode ?? '');
      if (responseCode !== '2000') {
        return { error: raw?.message ?? 'Login failed', message: raw?.message };
      }

      const data = raw?.data;
      if (!data) return { error: 'Login failed' };

      if (data.token) {
        sessionStorage.setItem('jwt_token', data.token);
      }
      const decodedId = this.getAuthUserId();
      const rawRole = Array.isArray(data.roles) && data.roles.length > 0 ? data.roles[0].name.toLowerCase() : 'student';
      const normalizedUser = {
        id: decodedId ?? '',
        username: data.username ?? username,
        email: data.email ?? '',
        role: rawRole,
        fullName: data.fullName ?? data.full_name ?? null,
      };
      sessionStorage.setItem('user', JSON.stringify(normalizedUser));

      return { data };
    } catch (error) {
      return { error: 'Network error. Please try again.' };
    }
  }

  async signup(username: string, email: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`http://localhost:8090/profiler/user/signup`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'FAIL' || (data.responseCode && data.responseCode !== 2000)) {
        return { error: data.message || data.error || 'Signup failed' };
      }

      if (data.token) {
        sessionStorage.setItem('jwt_token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
      }

      return { data };
    } catch (error) {
      return { error: 'Network error. Please try again.' };
    }
  }

  async getPortalInfo(portalName: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `http://localhost:8090/profiler/portal/getPortalInfo?portalName=${encodeURIComponent(portalName)}`,
        {
          method: 'GET'
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error };
      }

      return { data };
    } catch (error) {
      return { error: 'Failed to fetch portal information' };
    }
  }

  async createFolder(folderData: {
  portalName: string;
  name: string;
  description?: string;
  isUniversal?: boolean;
  price?: number;
  accessDurationInDays?: number;
  parentFolderId?: number;
  createdByUserId?: number;
  userIds?: number[];
}): Promise<ApiResponse> {
  try {
    const token = this.getAuthToken();
    const userId = this.getAuthUserId();

    const response = await fetch(`http://localhost:8091/content/createFolder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'userId': userId } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(folderData),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error ?? 'Failed to create folder', message: data.message };
    }

    return { data };
  } catch (err) {
    return { error: 'Network error. Could not create folder' };
  }
}

async getUserByEmail(email: string): Promise<ApiResponse<number>> {
  try {
    const response = await fetch(
      `http://localhost:8090/profiler/user/getUserByEmail?email=${encodeURIComponent(email)}`,
      {
        method: 'POST',
        headers: this.getHeaders(true),
      }
    );
    const data = await response.json();
    if (!response.ok) return { error: data.message || 'Failed to fetch user by email' };
    return { data: data.data }; // userId as number
  } catch (err) {
    return { error: 'Network error' };
  }
}

  async getPortalFolders(portalId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const userId = this.getAuthUserId();
      const response = await fetch(
        `http://localhost:8091/content/getPortalFolders?portalId=${encodeURIComponent(portalId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(userId ? { 'userId': userId } : {}),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error };
      }

      return { data };
    } catch (error) {
      return { error: 'Failed to fetch folders' };
    }
  }

  async getFolderDetails(folderId: number): Promise<ApiResponse> {
  try {
    const token = this.getAuthToken();
    const userId = this.getAuthUserId();

    const response = await fetch(
      `http://localhost:8091/content/getFolderDetails?folderId=${folderId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'userId': userId } : {}),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error ?? 'Failed to fetch folder details', message: data.message };
    }

    return { data };
  } catch (err) {
    return { error: 'Network error. Could not fetch folder details' };
  }
}

async folderAccessUpdate(folderId: number, userIds: number[]): Promise<ApiResponse> {
  try {
    const userId = this.getAuthUserId();
    const token = this.getAuthToken();
    const response = await fetch(`http://localhost:8091/content/folderAccessUpdate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'userId': userId } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ folderId, userIds })
    });
    const data = await response.json();
    if (!response.ok) {
      return { error: data.error || 'Failed to update folder access', message: data.message };
    }
    return { data };
  } catch (err) {
    return { error: 'Network error. Could not update folder access' };
  }
}

  async getFolderAccessUsers(folderId: number): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const userId = this.getAuthUserId();
      const response = await fetch(`http://localhost:8091/content/folder/${folderId}/access-users`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(userId ? { 'userId': userId } : {}),
        },
      });
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw?.message || 'Failed to fetch access users' };
      return { data: Array.isArray(raw.data) ? raw.data : [] };
    } catch {
      return { error: 'Network error' };
    }
  }

  async revokeFolderAccess(folderId: number, userId: number): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const authUserId = this.getAuthUserId();
      const response = await fetch(`http://localhost:8091/content/folder/${folderId}/access/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(authUserId ? { 'userId': authUserId } : {}),
        },
      });
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw?.message || 'Failed to revoke access' };
      return { data: true };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getUsersByIds(ids: number[]): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch('http://localhost:8090/profiler/user/by-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(ids),
      });
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw?.message || 'Failed to fetch users' };
      return { data: Array.isArray(raw.data) ? raw.data : [] };
    } catch {
      return { error: 'Network error' };
    }
  }

  async createUser(data: { username: string; email: string; password: string; fullName?: string }): Promise<ApiResponse> {
    try {
      const response = await fetch('http://localhost:8090/profiler/user/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const raw = await response.json();
      if (raw.responseCode && raw.responseCode !== 2000) return { error: raw.message || 'Failed to create user' };
      if (!response.ok) return { error: raw.message || 'Failed to create user' };
      return { data: raw };
    } catch {
      return { error: 'Network error' };
    }
  }

  async createPortal(data: {
    portalName: string;
    adminId: number;
    isActive: boolean;
    createrId: number;
  }): Promise<ApiResponse> {
    try {
      const response = await fetch('http://localhost:8090/profiler/portal/createPortal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, isActive: String(data.isActive) }),
      });
      const raw = await response.json();
      if (!response.ok) return { error: raw.message || 'Failed to create portal' };
      if (raw.responseCode && raw.responseCode !== 2000) return { error: raw.message || 'Failed to create portal' };
      return { data: raw };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getAdminPortals(): Promise<ApiResponse> {
    try {
      const response = await fetch('http://localhost:8090/profiler/admin/portals', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch portals' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async setPortalAdmin(portalId: number, userId: number): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `http://localhost:8090/profiler/admin/portal/${portalId}/setAdmin/${userId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to set admin' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async checkEmail(email: string): Promise<CheckResult> {
    const cached = this.getCachedCheck(`email:${email}`);
    if (cached) return cached;
    try {
      const response = await fetch(
        `http://localhost:8090/profiler/user/checkEmail?email=${encodeURIComponent(email)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      const data = await response.json();
      const result: CheckResult = (data.status === 'FAIL' || data.responseCode == 5400)
        ? { taken: true, message: data.message }
        : { taken: false };
      this.setCachedCheck(`email:${email}`, result);
      return result;
    } catch {
      return { taken: false };
    }
  }

  async checkUsername(username: string): Promise<CheckResult> {
    const cached = this.getCachedCheck(`username:${username}`);
    if (cached) return cached;
    try {
      const response = await fetch(
        `http://localhost:8090/profiler/user/checkUsername?username=${encodeURIComponent(username)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      const data = await response.json();
      const result: CheckResult = (data.status === 'FAIL' || data.responseCode == 5400)
        ? { taken: true, message: data.message }
        : { taken: false };
      this.setCachedCheck(`username:${username}`, result);
      return result;
    } catch {
      return { taken: false };
    }
  }

  async deleteFolder(folderId: number): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const userId = this.getAuthUserId();
      const response = await fetch(
        `http://localhost:8091/content/deleteFolder?folderId=${folderId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(userId ? { 'userId': userId } : {}),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to delete folder' };
      return { data };
    } catch {
      return { error: 'Network error. Could not delete folder' };
    }
  }

  logout(): void {
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('user');
  }

  async createContent(content: {
    folderId: number;
    type: string;
    title: string;
    description?: string;
    fileUrl?: string;
    textContent?: string | null;
    mimeType?: string;
    duration?: string | null;
    pageCount?: number | null;
    resolution?: string | null;
    thumbnailUrl?: string | null;
  }): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const userId = this.getAuthUserId();

      const payload = {
        ...content,
        requestingUserId: userId ? Number(userId) : undefined,
      };

      const response = await fetch(`http://localhost:8091/content/createContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'userId': userId } : {}),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error ?? 'Failed to create content', message: data.message };
      }

      return { data };
    } catch (err) {
      return { error: 'Network error. Could not create content' };
    }
  }

  getStoredUser(): any {
    const userStr = sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // ─── Student onboarding ──────────────────────────────────────────────────

  async onboardStudent(data: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
    course?: string;
    specialization?: string;
    year?: string;
    semester?: string;
    phone?: string;
    portalId?: string;
  }): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch('http://localhost:8090/profiler/user/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw?.message || 'Failed to onboard student' };
      return { data: raw.data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async searchStudents(q: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8090/profiler/user/search?q=${encodeURIComponent(q)}`,
        {
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        }
      );
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw?.message || 'Search failed' };
      return { data: Array.isArray(raw.data) ? raw.data : [] };
    } catch {
      return { error: 'Network error' };
    }
  }

  async enrollStudentToPortal(userId: number, portalId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8090/profiler/user/enroll?userId=${userId}&portalId=${portalId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        }
      );
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw?.message || 'Enroll failed' };
      return { data: true };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getPortalStudents(portalId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8090/profiler/portal/${portalId}/students`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch students' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getUserProfile(userId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8090/profiler/user/profile/${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch profile' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async updateUserProfile(userId: string, profileData: Record<string, any>): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8090/profiler/user/profile/update/${userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(profileData),
        }
      );
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw?.message || 'Failed to update profile' };
      return { data: raw.data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // ─── News ────────────────────────────────────────────────────────────────

  async createNews(data: {
    portalId: string;
    folderId?: string | null;
    scope?: 'PORTAL' | 'FOLDER' | 'SUBFOLDER';
    title: string;
    body: string;
    isPinned?: boolean;
  }): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const userId = this.getAuthUserId();
      const payload = {
        ...data,
        scope: data.scope ?? (data.folderId ? 'FOLDER' : 'PORTAL'),
      };
      const response = await fetch('http://localhost:8090/profiler/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(userId ? { 'userId': userId } : {}),
        },
        body: JSON.stringify(payload),
      });
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw.message || 'Failed to post news' };
      return { data: raw.data ?? raw };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getNews(params: { portalId: string; folderId?: string }): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const qs = new URLSearchParams({ portalId: params.portalId });
      if (params.folderId) qs.set('folderId', params.folderId);
      const response = await fetch(
        `http://localhost:8090/profiler/news?${qs}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw.message || 'Failed to fetch news' };
      return { data: Array.isArray(raw.data) ? raw.data : [] };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getStudentNews(portalId: string, folderIds: string[]): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const qs = new URLSearchParams({ portalId });
      if (folderIds.length > 0) qs.set('folderIds', folderIds.join(','));
      const response = await fetch(
        `http://localhost:8090/profiler/news/student?${qs}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw.message || 'Failed to fetch news' };
      return { data: Array.isArray(raw.data) ? raw.data : [] };
    } catch {
      return { error: 'Network error' };
    }
  }

  async deleteNews(newsId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const userId = this.getAuthUserId();
      const response = await fetch(`http://localhost:8090/profiler/news/${newsId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(userId ? { 'userId': userId } : {}),
        },
      });
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw.message || 'Failed to delete news' };
      return { data: true };
    } catch {
      return { error: 'Network error' };
    }
  }

  // ─── Video progress ──────────────────────────────────────────────────────

  async upsertVideoProgress(data: {
    studentId: string;
    contentId: string;
    folderId: string;
    watchedSeconds: number;
    totalSeconds: number;
  }): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const percentWatched = data.totalSeconds > 0
        ? Math.min(100, (data.watchedSeconds / data.totalSeconds) * 100)
        : 0;
      const response = await fetch('http://localhost:8091/content/video-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...data, percentWatched, completed: percentWatched >= 90 }),
      });
      const raw = await response.json();
      if (!response.ok) return { error: raw.message || 'Failed to save progress' };
      return { data: raw };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getVideoProgress(studentId: string, folderId?: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const path = folderId
        ? `http://localhost:8091/content/video-progress/${studentId}/folder/${folderId}`
        : `http://localhost:8091/content/video-progress/${studentId}`;
      const response = await fetch(path, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      });
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch progress' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // ─── Attendance ──────────────────────────────────────────────────────────

  async getMyAttendance(studentId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8090/profiler/attendance/${studentId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch attendance' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getFolderAttendance(folderId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8090/profiler/attendance/folder/${folderId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch attendance' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async markAttendance(records: {
    studentId: string;
    folderId: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
  }[]): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch('http://localhost:8090/profiler/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ records }),
      });
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to mark attendance' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // ─── Fee records ─────────────────────────────────────────────────────────

  async getStudentFees(studentId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8090/profiler/fee/${studentId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch fees' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async upsertFeeRecord(data: {
    studentId: string;
    portalId: string;
    academicYear: string;
    totalAmount: number;
    paidAmount: number;
    dueDate?: string;
    paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
    paymentNotes?: string;
  }): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch('http://localhost:8090/profiler/fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      const raw = await response.json();
      if (!response.ok) return { error: raw.message || 'Failed to save fee record' };
      return { data: raw };
    } catch {
      return { error: 'Network error' };
    }
  }

  // ─── Assignments ─────────────────────────────────────────────────────────

  async getFolderAssignments(folderId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8091/content/assignment/folder/${folderId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch assignments' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async createAssignment(data: {
    folderId: string;
    title: string;
    description?: string;
    assignmentType?: 'LINK' | 'TEXT' | 'EXAM';
    fileUrl?: string;
    textContent?: string;
    examCode?: string;
    dueDate?: string;
  }): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const userId = this.getAuthUserId();
      const response = await fetch('http://localhost:8091/content/assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(userId ? { 'userId': userId } : {}),
        },
        body: JSON.stringify(data),
      });
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw.message || 'Failed to create assignment' };
      return { data: raw.data ?? raw };
    } catch {
      return { error: 'Network error' };
    }
  }

  async submitAssignment(assignmentId: string, data: {
    submissionType?: 'TEXT' | 'FILE' | 'EXAM';
    fileUrl?: string;
    textResponse?: string;
    examLink?: string;
  }): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const userId = this.getAuthUserId();
      const response = await fetch('http://localhost:8091/content/assignment/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(userId ? { 'userId': userId } : {}),
        },
        body: JSON.stringify({ assignmentId, ...data }),
      });
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw.message || 'Failed to submit assignment' };
      return { data: raw.data ?? raw };
    } catch {
      return { error: 'Network error' };
    }
  }

  async deleteAssignment(assignmentId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const userId = this.getAuthUserId();
      const response = await fetch(`http://localhost:8091/content/assignment/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(userId ? { 'userId': userId } : {}),
        },
      });
      const raw = await response.json();
      const rc = String(raw?.responseCode ?? '');
      if (rc !== '2000') return { error: raw.message || 'Failed to delete assignment' };
      return { data: true };
    } catch {
      return { error: 'Network error' };
    }
  }

  // ─── Folder exams ────────────────────────────────────────────────────────

  async getFolderExams(folderId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8091/content/folder/${folderId}/exams`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch exams' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async assignExamToFolder(data: {
    folderId: string;
    examCode: string;
    examTitle: string;
    availableFrom?: string;
    availableUntil?: string;
    instructions?: string;
  }): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch('http://localhost:8091/content/folder-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      const raw = await response.json();
      if (!response.ok) return { error: raw.message || 'Failed to assign exam' };
      return { data: raw };
    } catch {
      return { error: 'Network error' };
    }
  }

  async generateExamLink(data: {
    examCode: string;
    userName: string;
    userEmail: string;
    validForMinutes?: number;
  }): Promise<ApiResponse<{ link: string; expiresAt?: string; validFrom?: string }>> {
    try {
      const token = this.getAuthToken();
      const response = await fetch('http://localhost:8090/profiler/api/exam/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          examCode:        data.examCode,
          userName:        data.userName,
          userEmail:       data.userEmail,
          validForMinutes: data.validForMinutes ?? 180,
        }),
      });
      const raw = await response.json();
      if (!response.ok) return { error: raw.error || raw.message || 'Failed to generate exam link' };
      return { data: raw };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getExamResults(folderId: string, folderExamId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8091/content/exam/results/folder/${folderId}?folderExamId=${folderExamId}`,
        {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch exam results' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  // ─── Folder owners (sub-admin assignment) ────────────────────────────────

  async getFolderOwners(folderId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8091/content/folder/${folderId}/owners`,
        {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch owners' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async addFolderOwner(folderId: string, userId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch('http://localhost:8091/content/folder-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ folderId, userId }),
      });
      const raw = await response.json();
      if (!response.ok) return { error: raw.message || 'Failed to add owner' };
      return { data: raw };
    } catch {
      return { error: 'Network error' };
    }
  }

  async removeFolderOwner(folderId: string, userId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8091/content/folder-owner/${folderId}/${userId}`,
        {
          method: 'DELETE',
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to remove owner' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }

  async getPortalSubAdmins(portalId: string): Promise<ApiResponse> {
    try {
      const token = this.getAuthToken();
      const response = await fetch(
        `http://localhost:8090/profiler/portal/${portalId}/sub-admins`,
        {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        }
      );
      const data = await response.json();
      if (!response.ok) return { error: data.message || 'Failed to fetch sub-admins' };
      return { data };
    } catch {
      return { error: 'Network error' };
    }
  }
}

export const apiClient = new ApiClient();
