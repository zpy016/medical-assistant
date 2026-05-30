/**
 * ============================================
 * IndexedDB 数据库层 - Dexie封装
 * 设计原则：数据层与UI完全解耦，所有存储操作通过此模块完成
 * 便于后续迁移到服务端数据库或微信小程序Storage
 * ============================================
 */

import Dexie, { type Table } from 'dexie';
import type { Patient, MedicalRecord, VisitEvent, FamilyMember, AppSettings, FollowUpReminder, MedicationReminder, MedicationLog, VaccinationRecord } from '../types';

export class MedicalDB extends Dexie {
  patients!: Table<Patient, string>;
  records!: Table<MedicalRecord, string>;
  visitEvents!: Table<VisitEvent, string>;
  familyMembers!: Table<FamilyMember, string>;
  settings!: Table<AppSettings, string>;
  followUpReminders!: Table<FollowUpReminder, string>;
  medications!: Table<MedicationReminder, string>;
  medicationLogs!: Table<MedicationLog, string>;
  vaccinationRecords!: Table<VaccinationRecord, string>;

  constructor() {
    super('MedicalAssistantDB');
    this.version(4).stores({
      patients: 'id, name, isDefault, createdAt',
      records: 'id, patientId, documentType, status, createdAt, [patientId+documentType]',
      visitEvents: 'id, patientId, date, hospital, [patientId+date]',
      familyMembers: 'id, userId, patientId',
      settings: '++id',
      followUpReminders: 'id, patientId, recordId, isCompleted, followUpDate, [patientId+isCompleted]',
      medications: 'id, patientId, isActive, createdAt',
      medicationLogs: 'id, medicationId, patientId, scheduledTime, status, [patientId+scheduledTime]',
      vaccinationRecords: 'id, patientId, vaccineId, scheduledDate, status, category, [patientId+status]',
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
    db.followUpReminders.clear(),
  ]);
}

// ==================== Follow Up Reminders ====================

export async function getFollowUpReminders(patientId?: string): Promise<FollowUpReminder[]> {
  if (patientId) {
    return db.followUpReminders.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  }
  return db.followUpReminders.orderBy('createdAt').reverse().toArray();
}

export async function getPendingFollowUps(patientId?: string): Promise<FollowUpReminder[]> {
  let collection = db.followUpReminders.where('isCompleted').equals(0);
  if (patientId) {
    collection = collection.and(r => r.patientId === patientId);
  }
  return collection.sortBy('followUpDate');
}

export async function addFollowUpReminder(reminder: Omit<FollowUpReminder, 'createdAt'>): Promise<void> {
  await db.followUpReminders.put({ ...reminder, createdAt: Date.now() });
}

export async function updateFollowUpReminder(id: string, changes: Partial<FollowUpReminder>): Promise<void> {
  await db.followUpReminders.update(id, changes);
}

export async function completeFollowUpReminder(id: string): Promise<void> {
  await db.followUpReminders.update(id, { isCompleted: true, completedAt: Date.now() });
}

export async function deleteFollowUpReminder(id: string): Promise<void> {
  await db.followUpReminders.delete(id);
}

// ==================== Medications ====================

export async function getMedications(patientId?: string): Promise<MedicationReminder[]> {
  if (patientId) {
    return db.medications.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  }
  return db.medications.orderBy('createdAt').reverse().toArray();
}

export async function addMedication(medication: Omit<MedicationReminder, 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = Date.now();
  await db.medications.put({ ...medication, createdAt: now, updatedAt: now });
}

export async function updateMedication(id: string, changes: Partial<MedicationReminder>): Promise<void> {
  await db.medications.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteMedication(id: string): Promise<void> {
  await db.medications.delete(id);
  await db.medicationLogs.where('medicationId').equals(id).delete();
}

// ==================== Medication Logs ====================

export async function getMedicationLogs(patientId: string, startDate?: string, endDate?: string): Promise<MedicationLog[]> {
  let collection = db.medicationLogs.where('patientId').equals(patientId);
  if (startDate && endDate) {
    collection = collection.and(l => l.scheduledTime >= startDate && l.scheduledTime <= endDate);
  }
  return collection.toArray();
}

export async function getTodayLogs(patientId: string): Promise<MedicationLog[]> {
  const today = new Date().toISOString().split('T')[0];
  return db.medicationLogs
    .where('patientId').equals(patientId)
    .and(l => l.scheduledTime.startsWith(today))
    .toArray();
}

export async function addMedicationLog(log: MedicationLog): Promise<void> {
  await db.medicationLogs.put(log);
}

export async function logMedicationTaken(logId: string): Promise<void> {
  await db.medicationLogs.update(logId, { status: 'taken', takenAt: Date.now() });
}

export async function logMedicationMissed(logId: string): Promise<void> {
  await db.medicationLogs.update(logId, { status: 'missed' });
}

// ==================== Vaccination Records ====================

export async function getVaccinationRecords(patientId: string): Promise<VaccinationRecord[]> {
  return db.vaccinationRecords.where('patientId').equals(patientId).sortBy('scheduledDate');
}

export async function addVaccinationRecord(record: Omit<VaccinationRecord, 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = Date.now();
  await db.vaccinationRecords.put({ ...record, createdAt: now, updatedAt: now });
}

export async function updateVaccinationRecord(id: string, changes: Partial<VaccinationRecord>): Promise<void> {
  await db.vaccinationRecords.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteVaccinationRecord(id: string): Promise<void> {
  await db.vaccinationRecords.delete(id);
}

export async function generateVaccinationPlan(patientId: string, birthDate: string): Promise<void> {
  const { generateVaccinationPlan: genPlan } = await import('../data/vaccineSchedule');
  const plan = genPlan(birthDate);
  const now = Date.now();

  const records: VaccinationRecord[] = plan.map(p => ({
    id: crypto.randomUUID(),
    patientId,
    vaccineId: p.vaccineId,
    vaccineName: p.vaccineName,
    doseNumber: p.doseNumber,
    scheduledDate: p.scheduledDate,
    status: new Date(p.scheduledDate) < new Date() ? 'overdue' : 'pending',
    category: p.category,
    createdAt: now,
    updatedAt: now,
  }));

  await db.vaccinationRecords.bulkPut(records);
}

export async function generateMedicationLogs(medication: MedicationReminder): Promise<void> {
  // 为药物生成未来7天的打卡记录
  const logs: MedicationLog[] = [];
  const today = new Date();

  for (let day = 0; day < 7; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    // 检查是否超出结束日期
    if (medication.endDate && dateStr > medication.endDate) continue;
    if (dateStr < medication.startDate) continue;

    for (const time of medication.times) {
      const scheduledTime = `${dateStr} ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
      logs.push({
        id: crypto.randomUUID(),
        medicationId: medication.id,
        patientId: medication.patientId,
        scheduledTime,
        status: 'pending',
      });
    }
  }

  await db.medicationLogs.bulkPut(logs);
}
