import { create } from 'zustand';
import {
  VisitEvent, Patient, FamilyMember,
  MedicationReminder, VaccinationRecord, FollowUpReminder, MedicationLog
} from '../utils/types';
import * as storage from '../utils/storage';

interface RecordState {
  // 数据
  visitEvents: VisitEvent[];
  patients: Patient[];
  familyMembers: FamilyMember[];
  currentPatientId: string | null;
  isLoading: boolean;
  isSynced: boolean;
  lastSyncAt: string | null;

  // P1 数据
  medications: MedicationReminder[];
  vaccinationRecords: VaccinationRecord[];
  followUpReminders: FollowUpReminder[];
  medicationLogs: MedicationLog[];

  // 筛选
  filterVisitTypes: string[];
  filterHospitals: string[];
  filterDepartments: string[];
  filterTimeRange: '3m' | '6m' | '1y' | 'all';
  searchQuery: string;

  // Actions
  setVisitEvents: (events: VisitEvent[]) => void;
  addVisitEvent: (event: VisitEvent) => void;
  updateVisitEvent: (id: string, updates: Partial<VisitEvent>) => void;
  deleteVisitEvent: (id: string) => void;
  setPatients: (patients: Patient[]) => void;
  setCurrentPatient: (id: string) => void;
  setFamilyMembers: (members: FamilyMember[]) => void;
  addFamilyMember: (member: FamilyMember) => void;
  removeFamilyMember: (id: string) => void;
  setFilters: (filters: Partial<Pick<RecordState, 'filterVisitTypes' | 'filterHospitals' | 'filterDepartments' | 'filterTimeRange' | 'searchQuery'>>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setSynced: (synced: boolean) => void;
  setLastSyncAt: (time: string | null) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;

  // P1 Actions
  setMedications: (medications: MedicationReminder[]) => void;
  addMedication: (med: MedicationReminder) => void;
  updateMedication: (id: string, updates: Partial<MedicationReminder>) => void;
  deleteMedication: (id: string) => void;
  setVaccinationRecords: (records: VaccinationRecord[]) => void;
  addVaccinationRecord: (record: VaccinationRecord) => void;
  updateVaccinationRecord: (id: string, updates: Partial<VaccinationRecord>) => void;
  setFollowUpReminders: (reminders: FollowUpReminder[]) => void;
  addFollowUpReminder: (reminder: FollowUpReminder) => void;
  completeFollowUpReminder: (id: string) => void;
  setMedicationLogs: (logs: MedicationLog[]) => void;
  addMedicationLog: (log: MedicationLog) => void;
}

const STORAGE_KEY = 'record_store';

export const useRecordStore = create<RecordState>((set, get) => ({
  // 初始状态
  visitEvents: [],
  patients: [],
  familyMembers: [],
  currentPatientId: null,
  isLoading: false,
  isSynced: false,
  lastSyncAt: null,
  medications: [],
  vaccinationRecords: [],
  followUpReminders: [],
  medicationLogs: [],
  filterVisitTypes: [],
  filterHospitals: [],
  filterDepartments: [],
  filterTimeRange: 'all',
  searchQuery: '',

  setVisitEvents: (events) => set({ visitEvents: events }),

  addVisitEvent: (event) => {
    set((state) => ({
      visitEvents: [event, ...state.visitEvents]
    }));
    get().saveToStorage();
  },

  updateVisitEvent: (id, updates) => {
    set((state) => ({
      visitEvents: state.visitEvents.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
      )
    }));
    get().saveToStorage();
  },

  deleteVisitEvent: (id) => {
    set((state) => ({
      visitEvents: state.visitEvents.filter((e) => e.id !== id)
    }));
    get().saveToStorage();
  },

  setPatients: (patients) => set({ patients }),

  setCurrentPatient: (id) => {
    set({ currentPatientId: id });
    storage.setItem('current_patient_id', id);
  },

  setFamilyMembers: (members) => set({ familyMembers: members }),

  addFamilyMember: (member) => {
    set((state) => ({
      familyMembers: [...state.familyMembers, member]
    }));
    get().saveToStorage();
  },

  removeFamilyMember: (id) => {
    set((state) => ({
      familyMembers: state.familyMembers.filter((m) => m.id !== id)
    }));
    get().saveToStorage();
  },

  setFilters: (filters) => set((state) => ({ ...state, ...filters })),

  clearFilters: () => set({
    filterVisitTypes: [],
    filterHospitals: [],
    filterDepartments: [],
    filterTimeRange: 'all',
    searchQuery: ''
  }),

  setLoading: (loading) => set({ isLoading: loading }),

  setSynced: (synced) => set({ isSynced: synced }),

  setLastSyncAt: (time) => set({ lastSyncAt: time }),

  loadFromStorage: () => {
    try {
      const data = storage.getItem<Partial<RecordState>>(STORAGE_KEY);
      if (data) {
        set({
          visitEvents: data.visitEvents || [],
          patients: data.patients || [],
          familyMembers: data.familyMembers || [],
          medications: data.medications || [],
          vaccinationRecords: data.vaccinationRecords || [],
          followUpReminders: data.followUpReminders || [],
          medicationLogs: data.medicationLogs || [],
          currentPatientId: storage.getItem('current_patient_id') || null
        });
      }
    } catch (e) {
      console.error('Load storage error:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      storage.setItem(STORAGE_KEY, {
        visitEvents: state.visitEvents,
        patients: state.patients,
        familyMembers: state.familyMembers,
        medications: state.medications,
        vaccinationRecords: state.vaccinationRecords,
        followUpReminders: state.followUpReminders,
        medicationLogs: state.medicationLogs
      });
    } catch (e) {
      console.error('Save storage error:', e);
    }
  },

  // P1 Actions
  setMedications: (medications) => set({ medications }),

  addMedication: (med) => {
    set((state) => ({ medications: [...state.medications, med] }));
    get().saveToStorage();
  },

  updateMedication: (id, updates) => {
    set((state) => ({
      medications: state.medications.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
      )
    }));
    get().saveToStorage();
  },

  deleteMedication: (id) => {
    set((state) => ({
      medications: state.medications.filter((m) => m.id !== id)
    }));
    get().saveToStorage();
  },

  setVaccinationRecords: (records) => set({ vaccinationRecords: records }),

  addVaccinationRecord: (record) => {
    set((state) => ({ vaccinationRecords: [...state.vaccinationRecords, record] }));
    get().saveToStorage();
  },

  updateVaccinationRecord: (id, updates) => {
    set((state) => ({
      vaccinationRecords: state.vaccinationRecords.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
      )
    }));
    get().saveToStorage();
  },

  setFollowUpReminders: (reminders) => set({ followUpReminders: reminders }),

  addFollowUpReminder: (reminder) => {
    set((state) => ({ followUpReminders: [...state.followUpReminders, reminder] }));
    get().saveToStorage();
  },

  completeFollowUpReminder: (id) => {
    set((state) => ({
      followUpReminders: state.followUpReminders.map((r) =>
        r.id === id ? { ...r, isCompleted: true, completedAt: Date.now() } : r
      )
    }));
    get().saveToStorage();
  },

  setMedicationLogs: (logs) => set({ medicationLogs: logs }),

  addMedicationLog: (log) => {
    set((state) => ({ medicationLogs: [...state.medicationLogs, log] }));
    get().saveToStorage();
  }
}));
