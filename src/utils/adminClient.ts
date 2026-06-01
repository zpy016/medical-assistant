/**
 * 管理员后台 API 客户端
 */

// ==================== 认证 ====================

const ADMIN_TOKEN_KEY = 'medical_admin_token';

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken();
}

async function adminFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 || response.status === 403) {
    clearAdminToken();
    window.location.href = '/admin/login';
    throw new Error('Admin session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== 管理员登录 ====================

export interface AdminLoginRequest {
  phone: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  admin: { id: string; phone: string; name: string | null };
}

export async function adminLogin(request: AdminLoginRequest): Promise<AdminLoginResponse> {
  const result = await adminFetch<AdminLoginResponse>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  setAdminToken(result.token);
  return result;
}

// ==================== 用户管理 ====================

export interface UserListItem {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  role: string;
  last_active_at: number | null;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface UserListResponse {
  success: boolean;
  data: {
    users: UserListItem[];
    total: number;
    page: number;
    pageSize: number;
  };
}

export async function getUserList(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<UserListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  return adminFetch<UserListResponse>(`/api/admin/users?${query}`);
}

export interface UserDetail {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  role: string;
  last_active_at: number | null;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
  stats: {
    patientCount: number;
    recordCount: number;
    medicationCount: number;
    visitEventCount: number;
    familyMemberCount: number;
    lastUpload: number | null;
  };
}

export async function getUserDetail(userId: string): Promise<{ success: boolean; data: UserDetail }> {
  return adminFetch(`/api/admin/users/${userId}`);
}

export async function updateUserStatus(userId: string, status: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

// ==================== 运营统计 ====================

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  pendingDeletion: number;
  totalRecords: number;
  totalPatients: number;
  todayNewUsers: number;
  todayActive: number;
}

export async function getSystemStats(): Promise<{ success: boolean; data: SystemStats }> {
  return adminFetch('/api/admin/stats/overview');
}

export interface DailyStat {
  date: string;
  dau: number;
}

export async function getDailyStats(days = 30): Promise<{ success: boolean; data: DailyStat[] }> {
  return adminFetch(`/api/admin/stats/trends?days=${days}`);
}

export interface MonthlyNewUser {
  month: string;
  count: number;
}

export async function getMonthlyNewUsers(months = 6): Promise<{ success: boolean; data: MonthlyNewUser[] }> {
  return adminFetch(`/api/admin/stats/new-users?months=${months}`);
}

export interface FeatureUsage {
  action: string;
  count: number;
}

export async function getFeatureUsage(days = 30): Promise<{ success: boolean; data: FeatureUsage[] }> {
  return adminFetch(`/api/admin/stats/features?days=${days}`);
}

// ==================== 操作日志 ====================

export interface AdminLog {
  id: number;
  admin_id: string;
  action: string;
  target_user_id: string;
  details: string | null;
  created_at: number;
}

export async function getAdminLogs(params?: {
  page?: number;
  pageSize?: number;
  targetUserId?: string;
}): Promise<{ success: boolean; data: AdminLog[] }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.targetUserId) query.set('targetUserId', params.targetUserId);
  return adminFetch(`/api/admin/logs?${query}`);
}

// ==================== 管理员重置用户密码 ====================

export async function adminResetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/api/admin/users/${userId}/reset-password`, {
    method: 'PATCH',
    body: JSON.stringify({ newPassword }),
  });
}

// ==================== 重置密钥管理 ====================

export interface ResetKey {
  id: string;
  key_code: string;
  user_id: string | null;
  created_by: string;
  created_at: number;
  expires_at: number | null;
  used_at: number | null;
  used_by: string | null;
  status: string;
}

export async function createResetKey(params?: { userId?: string; expiresInHours?: number }): Promise<{ success: boolean; data: { keyCode: string; expiresAt: number | null } }> {
  return adminFetch('/api/admin/reset-keys', {
    method: 'POST',
    body: JSON.stringify(params || {}),
  });
}

export async function getResetKeys(): Promise<{ success: boolean; data: ResetKey[] }> {
  return adminFetch('/api/admin/reset-keys');
}

export async function deleteResetKey(id: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/api/admin/reset-keys/${id}`, {
    method: 'DELETE',
  });
}
