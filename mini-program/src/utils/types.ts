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
