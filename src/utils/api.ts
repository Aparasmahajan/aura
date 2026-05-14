const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

type CheckResult = { taken: boolean; message?: string };

class ApiClient {
  private baseUrl: string;
  private checkCache = new Map<string, { result: CheckResult; expiresAt: number }>();
  private static CACHE_TTL_MS = 30_000;

  constructor() {
    this.baseUrl = `${SUPABASE_URL}/functions/v1`;
  }

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
        body: JSON.stringify({ username, password }),
      });

      const raw = await response.json();

      if (!response.ok) {
        return { error: raw.error, message: raw.message };
      }

      const data = raw?.data ?? raw;

      if (data && (data.token || data.username || data.email)) {
        if (data.token) {
          sessionStorage.setItem('jwt_token', data.token);
        }
        const decodedId = this.getAuthUserId();
        const roleName = Array.isArray(data?.roles) && data.roles.length > 0 ? data.roles[0].name.toLowerCase() : 'user';
        const normalizedUser = {
          id: decodedId ?? '',
          username: data?.username ?? username,
          email: data?.email ?? '',
          role: roleName,
        };
        sessionStorage.setItem('user', JSON.stringify(normalizedUser));
      }

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
        `http://localhost:9091/content/deleteFolder?folderId=${folderId}`,
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
}

export const apiClient = new ApiClient();
