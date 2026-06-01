import Taro from '@tarojs/taro';
import type { MedicationReminder, VaccinationRecord, FollowUpReminder, MedicationLog } from './types';

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

// P1 数据辅助
export function getMedications(): MedicationReminder[] {
  return getItem<MedicationReminder[]>('medications') || [];
}

export function setMedications(meds: MedicationReminder[]) {
  setItem('medications', meds);
}

export function getVaccinationRecords(): VaccinationRecord[] {
  return getItem<VaccinationRecord[]>('vaccination_records') || [];
}

export function setVaccinationRecords(records: VaccinationRecord[]) {
  setItem('vaccination_records', records);
}

export function getFollowUpReminders(): FollowUpReminder[] {
  return getItem<FollowUpReminder[]>('follow_up_reminders') || [];
}

export function setFollowUpReminders(reminders: FollowUpReminder[]) {
  setItem('follow_up_reminders', reminders);
}

export function getMedicationLogs(): MedicationLog[] {
  return getItem<MedicationLog[]>('medication_logs') || [];
}

export function setMedicationLogs(logs: MedicationLog[]) {
  setItem('medication_logs', logs);
}
