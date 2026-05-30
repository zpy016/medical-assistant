/**
 * ============================================
 * IndexedDB 数据库层 - Dexie封装
 * 设计原则：数据层与UI完全解耦，所有存储操作通过此模块完成
 * 便于后续迁移到服务端数据库或微信小程序Storage
 * ============================================
 */

import Dexie, { type Table } from 'dexie';
import type { Patient, MedicalRecord, VisitEvent, FamilyMember, AppSettings } from '../types';

export class MedicalDB extends Dexie {
  patients!: Table<Patient, string>;
  records!: Table<MedicalRecord, string>;
  visitEvents!: Table<VisitEvent, string>;
  familyMembers!: Table<FamilyMember, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('MedicalAssistantDB');
    this.version(1).stores({
      patients: 'id, name, isDefault, createdAt',
      records: 'id, patientId, documentType, status, createdAt, [patientId+documentType]',
      visitEvents: 'id, patientId, date, hospital, [patientId+date]',
      familyMembers: 'id, userId, patientId',
      settings: '++id',
    });
  }
}

export const db = new MedicalDB();

// ==================== Patient CRUD ====================

export async function getAllPatients(): Promise<Patient[]> {
  return db.patients.orderBy('createdAt').toArray();
}

export async function getDefaultPatient(): Promise<Patient | undefined> {
  return db.patients.where('isDefault').equals(1).first();
}

export async function getPatientById(id: string): Promise<Patient | undefined> {
  return db.patients.get(id);
}

export async function addPatient(patient: Omit<Patient, 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = Date.now();
  const newPatient: Patient = {
    ...patient,
    createdAt: now,
    updatedAt: now,
  };
  await db.patients.put(newPatient);
  return newPatient.id;
}

export async function updatePatient(id: string, changes: Partial<Patient>): Promise<void> {
  await db.patients.update(id, { ...changes, updatedAt: Date.now() });
}

export async function setDefaultPatient(id: string): Promise<void> {
  await db.patients.toCollection().modify(p => { p.isDefault = p.id === id; });
}

// ==================== Record CRUD ====================

export async function getAllRecords(patientId?: string): Promise<MedicalRecord[]> {
  if (patientId) {
    return db.records.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  }
  return db.records.orderBy('createdAt').reverse().toArray();
}

export async function getRecordById(id: string): Promise<MedicalRecord | undefined> {
  return db.records.get(id);
}

export async function addRecord(record: Omit<MedicalRecord, 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = Date.now();
  const newRecord: MedicalRecord = {
    ...record,
    createdAt: now,
    updatedAt: now,
  };
  await db.records.put(newRecord);
  return newRecord.id;
}

export async function updateRecord(id: string, changes: Partial<MedicalRecord>): Promise<void> {
  await db.records.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteRecord(id: string): Promise<void> {
  await db.records.delete(id);
}

// ==================== Visit Event CRUD ====================

export async function getAllVisitEvents(patientId?: string): Promise<VisitEvent[]> {
  if (patientId) {
    return db.visitEvents.where('patientId').equals(patientId).reverse().sortBy('date');
  }
  return db.visitEvents.orderBy('date').reverse().toArray();
}

export async function addVisitEvent(event: VisitEvent): Promise<void> {
  await db.visitEvents.put(event);
}

export async function updateVisitEvent(id: string, changes: Partial<VisitEvent>): Promise<void> {
  await db.visitEvents.update(id, changes);
}

// ==================== Family Members ====================

export async function getFamilyMembers(userId: string): Promise<FamilyMember[]> {
  return db.familyMembers.where('userId').equals(userId).toArray();
}

export async function addFamilyMember(member: Omit<FamilyMember, 'invitedAt'>): Promise<string> {
  const newMember: FamilyMember = {
    ...member,
    invitedAt: Date.now(),
  };
  await db.familyMembers.put(newMember);
  return newMember.id;
}

export async function updateFamilyMember(id: string, changes: Partial<FamilyMember>): Promise<void> {
  await db.familyMembers.update(id, changes);
}

export async function removeFamilyMember(id: string): Promise<void> {
  await db.familyMembers.delete(id);
}

// ==================== Settings ====================

export async function getSettings(): Promise<AppSettings | undefined> {
  return db.settings.toCollection().first();
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put(settings);
}

// ==================== 数据导出 ====================

export async function exportAllData(): Promise<{
  patients: Patient[];
  records: MedicalRecord[];
  visitEvents: VisitEvent[];
  exportedAt: string;
}> {
  const [patients, records, visitEvents] = await Promise.all([
    db.patients.toArray(),
    db.records.toArray(),
    db.visitEvents.toArray(),
  ]);
  return {
    patients,
    records,
    visitEvents,
    exportedAt: new Date().toISOString(),
  };
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.patients.clear(),
    db.records.clear(),
    db.visitEvents.clear(),
    db.familyMembers.clear(),
  ]);
}
