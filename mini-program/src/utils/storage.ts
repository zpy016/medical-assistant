import Taro from '@tarojs/taro';

const PREFIX = 'medical_';

export function getItem<T>(key: string, defaultValue?: T): T | undefined {
  try {
    const value = Taro.getStorageSync(PREFIX + key);
    return value !== undefined ? value : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    Taro.setStorageSync(PREFIX + key, value);
  } catch (e) {
    console.error('Storage set error:', e);
  }
}

export function removeItem(key: string): void {
  try {
    Taro.removeStorageSync(PREFIX + key);
  } catch (e) {
    console.error('Storage remove error:', e);
  }
}

export function clear(): void {
  try {
    Taro.clearStorageSync();
  } catch (e) {
    console.error('Storage clear error:', e);
  }
}

// Token 管理
export function getToken(): string | undefined {
  return getItem<string>('token');
}

export function setToken(token: string): void {
  setItem('token', token);
}

export function removeToken(): void {
  removeItem('token');
}

// 当前患者
export function getCurrentPatient() {
  return getItem('current_patient');
}

export function setCurrentPatient(patient: unknown) {
  setItem('current_patient', patient);
}
