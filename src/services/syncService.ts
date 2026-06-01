/**
 * 数据同步服务
 * 本地 IndexedDB ↔ 云端 SQLite 数据同步
 */

import { db } from '../db';

// ==================== Token 管理 ====================

export function getAuthToken(): string | null {
  return localStorage.getItem('medical_auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('medical_auth_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('medical_auth_token');
  localStorage.removeItem('medical_user');
}

export function isLoggedIn(): boolean {
  return !!getAuthToken();
}

export function getCurrentUser(): { id: string; phone: string; name?: string } | null {
  const raw = localStorage.getItem('medical_user');
  return raw ? JSON.parse(raw) : null;
}

// ==================== 同步 API ====================

interface SyncData {
  patients: unknown[];
  records: unknown[];
  visitEvents: unknown[];
  familyMembers: unknown[];
}

/** 上传本地数据到云端 */
export async function uploadToCloud(data: SyncData): Promise<{ success: boolean; message?: string }> {
  const token = getAuthToken();
  if (!token) throw new Error('Not logged in');

  const response = await fetch('/api/sync/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }

  return response.json();
}

/** 从云端下载数据 */
export async function downloadFromCloud(): Promise<SyncData> {
  const token = getAuthToken();
  if (!token) throw new Error('Not logged in');

  const response = await fetch('/api/sync/download', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Download failed');
  }

  const result = await response.json();
  return result.data;
}

/** 检查云端数据状态 */
export async function checkCloudStatus(): Promise<{
  patients: number;
  records: number;
  visitEvents: number;
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Not logged in');

  const response = await fetch('/api/sync/status', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Status check failed');
  }

  const result = await response.json();
  return result.cloudData;
}

// ==================== 全量同步 ====================

/**
 * 将本地所有数据导出并上传到云端
 */
export async function syncUpload(): Promise<void> {
  const [patients, records, visitEvents, familyMembers] = await Promise.all([
    db.patients.toArray(),
    db.records.toArray(),
    db.visitEvents.toArray(),
    db.familyMembers.toArray(),
  ]);

  await uploadToCloud({ patients, records, visitEvents, familyMembers });
}

/**
 * 从云端下载数据并覆盖本地
 * 注意：这会覆盖本地数据！建议先让用户确认
 */
export async function syncDownload(): Promise<void> {
  const cloudData = await downloadFromCloud();

  // 清空本地数据
  await Promise.all([
    db.patients.clear(),
    db.records.clear(),
    db.visitEvents.clear(),
    db.familyMembers.clear(),
  ]);

  // 写入云端数据
  await Promise.all([
    cloudData.patients.length > 0 ? db.patients.bulkAdd(cloudData.patients as never[]) : Promise.resolve(),
    cloudData.records.length > 0 ? db.records.bulkAdd(cloudData.records as never[]) : Promise.resolve(),
    cloudData.visitEvents.length > 0 ? db.visitEvents.bulkAdd(cloudData.visitEvents as never[]) : Promise.resolve(),
    cloudData.familyMembers.length > 0 ? db.familyMembers.bulkAdd(cloudData.familyMembers as never[]) : Promise.resolve(),
  ]);
}

/**
 * 自动同步：有网时上传，无网时跳过
 */
export async function autoSync(): Promise<{ uploaded: boolean; message: string }> {
  if (!navigator.onLine) {
    return { uploaded: false, message: '离线状态，跳过同步' };
  }
  if (!isLoggedIn()) {
    return { uploaded: false, message: '未登录，跳过同步' };
  }

  try {
    await syncUpload();
    return { uploaded: true, message: '同步成功' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { uploaded: false, message: `同步失败: ${msg}` };
  }
}

// ==================== 家人共享 API ====================

const API_BASE = '';

async function familyFetch(path: string, options?: RequestInit) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/family${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function inviteFamilyMember(phone: string, patientId: string, relation: string, permission: 'view' | 'edit') {
  return familyFetch('/invite', { method: 'POST', body: JSON.stringify({ phone, patientId, relation, permission }) });
}

export async function getSentInvitations() {
  return familyFetch('/sent');
}

export async function getReceivedInvitations() {
  return familyFetch('/received');
}

export async function acceptInvitation(id: string) {
  return familyFetch(`/accept/${id}`, { method: 'POST' });
}

export async function rejectInvitation(id: string) {
  return familyFetch(`/reject/${id}`, { method: 'POST' });
}

export async function cancelInvitation(id: string) {
  return familyFetch(`/${id}`, { method: 'DELETE' });
}

export async function getSharedPatients() {
  return familyFetch('/shared-patients');
}

export async function getSharedPatientData(patientId: string) {
  return familyFetch(`/shared-data/${patientId}`);
}
