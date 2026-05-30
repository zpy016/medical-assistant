import { create } from 'zustand';
import { VisitEvent, Patient, FamilyMember } from '../utils/types';
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
        familyMembers: state.familyMembers
      });
    } catch (e) {
      console.error('Save storage error:', e);
    }
  }
}));
