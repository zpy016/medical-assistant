/** 就诊类型 */
export type VisitType = 'outpatient' | 'inpatient' | 'emergency' | 'physical';

/** 就诊事件 */
export interface VisitEvent {
  id: string;
  date: string;
  hospital: string;
  department: string;
  visitType: VisitType;
  diagnosis: string[];
  icd10Codes: string[];
  medications: string[];
  labResults: LabResult[];
  images: string[];
  notes: string;
  abnormalFlags: string[];
  createdAt: string;
  updatedAt: string;
}

/** 检验结果 */
export interface LabResult {
  name: string;
  value: string;
  unit?: string;
  reference?: string;
  isAbnormal: boolean;
}

/** 患者 */
export interface Patient {
  id: string;
  name: string;
  age?: number;
  gender?: 'male' | 'female';
  relationship?: string;
  avatar?: string;
  isDefault: boolean;
}

/** 家庭成员 */
export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  permission: 'view' | 'edit';
  invitedAt: string;
}

/** OCR文本块 */
export interface TextBlock {
  text: string;
  confidence: number;
  vertices: Array<{ x: number; y: number }>;
}

/** OCR结果 */
export interface OCRResult {
  text: string;
  blocks: TextBlock[];
  imageUrl: string;
}

/** 结构化数据 */
export interface StructuredData {
  patientName?: string;
  hospital?: string;
  department?: string;
  date?: string;
  diagnosis?: string[];
  icd10Codes?: string[];
  medications?: string[];
  labResults?: LabResult[];
  visitType?: VisitType;
  doctorName?: string;
  symptoms?: string[];
  [key: string]: unknown;
}

/** TabBar 页面路径 */
export const TAB_PAGES = ['/pages/index/index', '/pages/upload/index', '/pages/profile/index'];

/** 就诊类型配置 */
export const VISIT_TYPE_CONFIG: Record<VisitType, { label: string; color: string; chipClass: string }> = {
  outpatient: { label: '门诊', color: '#22c55e', chipClass: 'chip-green' },
  inpatient: { label: '住院', color: '#3b82f6', chipClass: 'chip-blue' },
  emergency: { label: '急诊', color: '#ef4444', chipClass: 'chip-red' },
  physical: { label: '体检', color: '#06b6d4', chipClass: 'chip-cyan' }
};

/** ICD-10 条目 */
export interface ICD10Entry {
  code: string;
  name: string;
  aliases: string[];
  category: string;
}

// ==================== P1 Types ====================

/** 检验分析结果 */
export interface TestItemAnalysis {
  isAbnormal: boolean;
  direction: 'high' | 'low' | null;
  severity: 'mild' | 'moderate' | 'severe' | null;
  numericValue: number | null;
  numericMin: number | null;
  numericMax: number | null;
}

/** 复查提醒 */
export interface FollowUpReminder {
  id: string;
  patientId: string;
  recordId: string;
  testItemName: string;
  abnormalValue: string;
  referenceRange: string;
  abnormalDirection: 'high' | 'low';
  followUpDate: string;
  reminderDays: number;
  isCompleted: boolean;
  completedAt?: number;
  notes?: string;
  createdAt: number;
}

/** 疫苗状态 */
export type VaccineStatus = 'pending' | 'completed' | 'overdue' | 'skipped';

/** 疫苗接种记录 */
export interface VaccinationRecord {
  id: string;
  patientId: string;
  vaccineId: string;
  vaccineName: string;
  doseNumber: number;
  scheduledDate: string;
  actualDate?: string;
  status: VaccineStatus;
  vaccinationSite?: string;
  batchNumber?: string;
  reaction?: string;
  category: 'national' | 'optional';
  createdAt: number;
  updatedAt: number;
}

/** 服药频率 */
export type MedicationFrequency =
  | 'once_daily'
  | 'twice_daily'
  | 'three_times'
  | 'four_times'
  | 'before_bed'
  | 'every_other_day'
  | 'weekly'
  | 'as_needed'
  | 'custom';

/** 用药提醒时间 */
export interface MedicationReminderTime {
  hour: number;
  minute: number;
  label: string;
}

/** 药物 */
export interface MedicationReminder {
  id: string;
  patientId: string;
  name: string;
  specification?: string;
  dosage?: string;
  frequency: MedicationFrequency;
  times: MedicationReminderTime[];
  startDate: string;
  endDate?: string;
  route?: string;
  notes?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/** 服药打卡记录 */
export interface MedicationLog {
  id: string;
  medicationId: string;
  patientId: string;
  scheduledTime: string; // YYYY-MM-DD HH:mm
  takenAt?: number;
  status: 'taken' | 'missed' | 'skipped' | 'pending';
  notes?: string;
}

export const FREQUENCY_LABELS: Record<MedicationFrequency, string> = {
  once_daily: '每日1次',
  twice_daily: '每日2次',
  three_times: '每日3次',
  four_times: '每日4次',
  before_bed: '睡前',
  every_other_day: '隔日1次',
  weekly: '每周1次',
  as_needed: '按需',
  custom: '自定义',
};

export const SEVERITY_LABELS: Record<string, string> = {
  severe: '严重',
  moderate: '中度',
  mild: '轻度',
};

export const SEVERITY_COLORS: Record<string, string> = {
  severe: '#ef4444',
  moderate: '#f59e0b',
  mild: '#f59e0b',
};
