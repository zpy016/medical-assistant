/**
 * ============================================
 * Zustand 全局状态管理
 * 按功能域组织状态，便于后续拆分为微状态或迁移到Redux
 * ============================================
 */

import { create } from 'zustand';
import type {
  Patient, MedicalRecord, VisitEvent, FilterOptions,
  UploadTask, DocumentType, RecordStatus, StructuredData, OCRResult, FamilyMember,
  SharedPatient, SharedInvitation,
} from '../types';
import * as db from '../db';
import { parseDateFromText, generateId, groupRecordsByVisit } from '../utils/helpers';

// ==================== State 定义 ====================

interface RecordState {
  // 数据
  patients: Patient[];
  currentPatientId: string | null;
  records: MedicalRecord[];
  visitEvents: VisitEvent[];
  familyMembers: FamilyMember[];
  sharedPatients: SharedPatient[];
  receivedInvitations: SharedInvitation[];
  sentInvitations: SharedInvitation[];
  uploadTasks: UploadTask[];

  // UI状态
  isLoading: boolean;
  selectedRecordId: string | null;
  filterOptions: FilterOptions;
  activeTab: 'timeline' | 'records' | 'upload' | 'profile';

  // Actions
  loadPatients: () => Promise<void>;
  loadRecords: (patientId?: string) => Promise<void>;
  loadVisitEvents: (patientId?: string) => Promise<void>;
  loadFamilyMembers: () => Promise<void>;
  setCurrentPatient: (id: string) => Promise<void>;
  addPatient: (patient: Omit<Patient, 'createdAt' | 'updatedAt'>) => Promise<void>;

  // 家人共享
  addFamilyMember: (member: Omit<FamilyMember, 'invitedAt'>) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  updateFamilyMemberPermission: (id: string, permission: FamilyMember['permission']) => Promise<void>;

  // 跨用户共享
  loadSharedPatients: () => Promise<void>;
  setSharedPatients: (patients: SharedPatient[]) => void;
  setReceivedInvitations: (invitations: SharedInvitation[]) => void;
  setSentInvitations: (invitations: SharedInvitation[]) => void;

  // 上传与OCR
  addUploadTask: (file: File) => string;
  removeUploadTask: (id: string) => void;
  updateTaskStatus: (id: string, status: UploadTask['status'], progress?: number) => void;
  setTaskOCRResult: (id: string, ocrResult: OCRResult) => void;
  setTaskObjectKey: (id: string, objectKey: string) => void;
  confirmRecord: (taskId: string, structuredData: StructuredData, documentType: DocumentType) => Promise<void>;

  // 记录管理
  deleteRecord: (id: string) => Promise<void>;
  updateRecordStatus: (id: string, status: RecordStatus) => Promise<void>;
  toggleStarRecord: (id: string) => Promise<void>;

  // 筛选
  setFilterOptions: (options: Partial<FilterOptions>) => void;
  resetFilters: () => void;

  // 导航
  setActiveTab: (tab: RecordState['activeTab']) => void;
  setSelectedRecordId: (id: string | null) => void;
}

// ==================== Store 实现 ====================

export const useRecordStore = create<RecordState>((set, get) => ({
  // 初始状态
  patients: [],
  currentPatientId: null,
  records: [],
  visitEvents: [],
  familyMembers: [],
  sharedPatients: [],
  receivedInvitations: [],
  sentInvitations: [],
  uploadTasks: [],
  isLoading: false,
  selectedRecordId: null,
  filterOptions: {},
  activeTab: 'timeline',

  // ---- 数据加载 ----

  loadPatients: async () => {
    const patients = await db.getAllPatients();
    set({ patients });
    // 自动选中默认患者
    const defaultPatient = patients.find(p => p.isDefault);
    if (defaultPatient && !get().currentPatientId) {
      set({ currentPatientId: defaultPatient.id });
    } else if (patients.length > 0 && !get().currentPatientId) {
      set({ currentPatientId: patients[0].id });
    }
  },

  loadRecords: async (patientId) => {
    const id = patientId ?? get().currentPatientId ?? undefined;
    const records = await db.getAllRecords(id);
    set({ records });
  },

  loadVisitEvents: async (patientId) => {
    const id = patientId ?? get().currentPatientId ?? undefined;
    const visitEvents = await db.getAllVisitEvents(id);
    set({ visitEvents });
  },

  loadFamilyMembers: async () => {
    const currentUserId = get().currentPatientId ?? 'default';
    const familyMembers = await db.getFamilyMembers(currentUserId);
    set({ familyMembers });
  },

  setCurrentPatient: async (id) => {
    set({ currentPatientId: id });
    await db.setDefaultPatient(id);
    await get().loadRecords(id);
    await get().loadVisitEvents(id);
  },

  addPatient: async (patient) => {
    const id = await db.addPatient(patient);
    await get().loadPatients();
    await get().setCurrentPatient(id);
  },

  // ---- 家人共享 ----

  addFamilyMember: async (member) => {
    await db.addFamilyMember(member);
    await get().loadFamilyMembers();
  },

  removeFamilyMember: async (id) => {
    await db.removeFamilyMember(id);
    await get().loadFamilyMembers();
  },

  updateFamilyMemberPermission: async (id, permission) => {
    await db.updateFamilyMember(id, { permission });
    await get().loadFamilyMembers();
  },

  // ---- 跨用户共享 ----

  loadSharedPatients: async () => {
    // 从 API 加载（不存储到 IndexedDB）
    const { getSharedPatients } = await import('../services/syncService');
    try {
      const result = await getSharedPatients();
      set({ sharedPatients: result.data || [] });
    } catch (e) {
      // 未登录或网络错误，忽略
    }
  },

  setSharedPatients: (patients) => set({ sharedPatients: patients }),
  setReceivedInvitations: (invitations) => set({ receivedInvitations: invitations }),
  setSentInvitations: (invitations) => set({ sentInvitations: invitations }),

  // ---- 上传与OCR ----

  addUploadTask: (file) => {
    const id = generateId();
    const previewUrl = URL.createObjectURL(file);
    const task: UploadTask = {
      id,
      file,
      previewUrl,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
    };
    set(state => ({ uploadTasks: [...state.uploadTasks, task] }));
    return id;
  },

  removeUploadTask: (id) => {
    set(state => ({
      uploadTasks: state.uploadTasks.filter(t => t.id !== id),
    }));
  },

  updateTaskStatus: (id, status, progress) => {
    set(state => ({
      uploadTasks: state.uploadTasks.map(t =>
        t.id === id ? { ...t, status, progress: progress ?? t.progress } : t
      ),
    }));
  },

  setTaskOCRResult: (id, ocrResult) => {
    set(state => ({
      uploadTasks: state.uploadTasks.map(t =>
        t.id === id ? { ...t, ocrResult, status: 'completed', progress: 100 } : t
      ),
    }));
  },

  setTaskObjectKey: (id, objectKey) => {
    set(state => ({
      uploadTasks: state.uploadTasks.map(t =>
        t.id === id ? { ...t, objectKey } : t
      ),
    }));
  },
  confirmRecord: async (taskId, structuredData, documentType) => {
    const task = get().uploadTasks.find(t => t.id === taskId);
    if (!task) return;

    const patientId = get().currentPatientId ?? 'default';

    // 创建医疗记录
    const record: MedicalRecord = {
      id: generateId(),
      patientId,
      originalImage: task.objectKey || task.previewUrl,
      ocrResult: task.ocrResult,
      structuredData,
      documentType,
      status: 'confirmed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      uploadedAt: Date.now(),
    };

    await db.addRecord(record);

    // 更新就诊事件
    const visitDate = structuredData.visitDate ?? parseDateFromText(task.ocrResult?.fullText ?? '') ?? new Date().toISOString().split('T')[0];
    const existingEvents = await db.getAllVisitEvents(patientId);
    const matchingEvent = existingEvents.find(e =>
      e.date === visitDate &&
      e.hospital === structuredData.hospital
    );

    if (matchingEvent) {
      await db.updateVisitEvent(matchingEvent.id, {
        records: [...matchingEvent.records, record],
      });
    } else {
      const newEvent: VisitEvent = {
        id: generateId(),
        patientId,
        date: visitDate,
        hospital: structuredData.hospital,
        department: structuredData.department,
        visitType: structuredData.visitType ?? 'outpatient',
        diagnosis: structuredData.diagnosis,
        icd10Codes: structuredData.icd10Codes,
        records: [record],
        createdAt: Date.now(),
      };
      await db.addVisitEvent(newEvent);
    }

    // 移除上传任务
    set(state => ({
      uploadTasks: state.uploadTasks.filter(t => t.id !== taskId),
    }));

    // 刷新数据
    await get().loadRecords();
    await get().loadVisitEvents();
  },

  // ---- 记录管理 ----

  deleteRecord: async (id) => {
    await db.deleteRecord(id);
    await get().loadRecords();
    await get().loadVisitEvents();
  },

  updateRecordStatus: async (id, status) => {
    await db.updateRecord(id, { status });
    await get().loadRecords();
  },

  toggleStarRecord: async (id) => {
    const record = get().records.find(r => r.id === id);
    if (record) {
      await db.updateRecord(id, { isStarred: !record.isStarred });
      await get().loadRecords();
    }
  },

  // ---- 筛选 ----

  setFilterOptions: (options) => {
    set(state => ({
      filterOptions: { ...state.filterOptions, ...options },
    }));
  },

  resetFilters: () => {
    set({ filterOptions: {} });
  },

  // ---- 导航 ----

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setSelectedRecordId: (id) => {
    set({ selectedRecordId: id });
  },
}));
