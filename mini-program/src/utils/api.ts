import Taro from '@tarojs/taro';
import { getToken, removeToken } from './storage';

// 后端 API 基地址（小程序需要配置合法域名，开发时可开启不校验）
const API_BASE = 'http://69.5.21.128:8050/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
  header?: Record<string, string>;
  auth?: boolean;
}

export async function request<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', data, header = {}, auth = true } = options;

  const requestHeader: Record<string, string> = {
    'Content-Type': 'application/json',
    ...header
  };

  if (auth) {
    const token = getToken();
    if (token) {
      requestHeader['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const res = await Taro.request({
      url: API_BASE + url,
      method,
      data,
      header: requestHeader,
      timeout: 30000
    });

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return res.data as T;
    }

    if (res.statusCode === 401) {
      // Token 过期，清除并跳转登录
      removeToken();
      Taro.navigateTo({ url: '/pages/login/index' });
      throw new Error('登录已过期，请重新登录');
    }

    throw new Error((res.data as { error?: string })?.error || `请求失败: ${res.statusCode}`);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('网络请求失败');
  }
}

// 上传文件
export async function uploadFile(
  filePath: string,
  url: string = '/ocr'
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const token = getToken();
    Taro.uploadFile({
      url: API_BASE + url,
      filePath,
      name: 'image',
      header: token ? { 'Authorization': `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(res.data));
          } catch {
            resolve(res.data);
          }
        } else {
          reject(new Error(`上传失败: ${res.statusCode}`));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '上传失败'))
    });
  });
}

// Auth API
export function login(phone: string, password: string) {
  return request<{ token: string; user: { id: number; name: string; phone: string } }>('/auth/login', {
    method: 'POST',
    data: { phone, password },
    auth: false
  });
}

export function register(phone: string, password: string, name?: string) {
  return request<{ token: string; user: { id: number; name: string } }>('/auth/register', {
    method: 'POST',
    data: { phone, password, name },
    auth: false
  });
}

// Sync API
export function syncPush(data: Record<string, unknown>) {
  return request('/sync/push', { method: 'POST', data });
}

export function syncPull() {
  return request('/sync/pull');
}

export function syncStatus() {
  return request('/sync/status');
}

