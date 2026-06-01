/**
 * ============================================
 * 就医助手 - 核心类型定义
 * 架构设计考虑：类型层与UI层解耦，便于后续复用到小程序和App
 * ============================================
 */

// ==================== 基础类型 ====================

/** 文档类型 */
export type DocumentType =
  | 'medical_record'      // 门诊/住院病历
  | 'lab_report'          // 检验报告（血常规、生化等）
  | 'imaging_report'      // 影像报告（CT、MRI、X光等）
  | 'prescription'        // 处方笺
  | 'receipt'             // 收费票据/收据
  | 'discharge_summary'   // 出院小结
  | 'pathology'           // 病理报告
  | 'insurance'           // 保险单据
  | 'other';              // 其他

/** 就诊类型 */
export type VisitType =
  | 'outpatient'   // 门诊
  | 'inpatient'    // 住院
  | 'emergency'    // 急诊
  | 'physical';    // 体检

/** 就诊状态 */
export type RecordStatus =
  | 'pending'      // 待确认
  | 'confirmed'    // 已确认
  | 'corrected';   // 已修正

// ==================== 核心数据结构 ====================

/** 患者信息 */
export interface Patient {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'unknown';
  birthDate?: string;         // YYYY-MM-DD
  age?: number;
  idCard?: string;
  phone?: string;
  avatar?: string;
  isDefault: boolean;
  isChild?: boolean;          // 是否儿童（用于疫苗管理）
  createdAt: number;
  updatedAt: number;
}

/** OCR识别出的原始文本块 */
export interface OCRTextBlock {
  text: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2] 相对坐标 0-1
}

/** OCR识别结果 */
export interface OCRResult {
  textBlocks: OCRTextBlock[];
  fullText: string;
  tables?: OCRTable[];
  documentType?: DocumentType;
  confidence: number;
  processingTime: number;
}

/** OCR表格 */
export interface OCRTable {
  headers: string[];
  rows: string[][];
  bbox: [number, number, number, number];
}

/** 结构化字段 - 从OCR结果中提取的关键信息 */
export interface StructuredData {
  // 基本信息
  patientName?: string;
  gender?: string;
  age?: number;
  patientId?: string;

  // 就诊信息
  hospital?: string;
  department?: string;
  visitDate?: string;         // YYYY-MM-DD
  visitTime?: string;         // HH:mm
  visitType?: VisitType;
  doctorName?: string;

  // 诊断信息
  chiefComplaint?: string;    // 主诉
  presentIllness?: string;    // 现病史
  diagnosis?: string[];       // 诊断（支持多诊断）
  icd10Codes?: string[];      // ICD-10编码

  // 检查检验
  testItems?: TestItem[];     // 检验项目列表
  imagingFindings?: string;   // 影像所见
  imagingConclusion?: string; // 影像结论

  // 处方用药
  medications?: Medication[]; // 药品列表

  // 费用信息
  totalAmount?: number;
  paymentMethod?: string;
  insuranceInfo?: string;

  // 其他
  notes?: string;
  allergies?: string;
}

/** 检验项目 */
export interface TestItem {
  name: string;
  nameEn?: string;
  result: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  abnormalDirection?: 'high' | 'low';
}

/** 药品信息 */
export interface Medication {
  name: string;
  specification?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  quantity?: string;
  price?: number;
}

/** 医疗记录（单份文档） */
export interface MedicalRecord {
  id: string;
  patientId: string;

  // 原始图片
  originalImage: string;       // base64或blob URL
  thumbnail?: string;

  // OCR结果
  ocrResult?: OCRResult;

  // 结构化数据（用户确认后）
  structuredData?: StructuredData;

  // 分类信息
  documentType: DocumentType;
  visitType?: VisitType;

  // 状态
  status: RecordStatus;

  // 元数据
  createdAt: number;
  updatedAt: number;
  uploadedAt: number;

  // 扩展字段（预留Phase 2/3）
  aiInterpretation?: string;   // AI解读结果
  tags?: string[];
  isStarred?: boolean;
}

/** 就诊事件（同一天同一医院的文档聚合） */
export interface VisitEvent {
  id: string;
  patientId: string;
  date: string;                // YYYY-MM-DD
  hospital?: string;
  department?: string;
  visitType: VisitType;
  diagnosis?: string[];
  icd10Codes?: string[];
  records: MedicalRecord[];
  summary?: string;
  createdAt: number;
}

/** 家庭成员关系 */
export interface FamilyMember {
  id: string;
  userId: string;              // 当前用户ID
  patientId: string;           // 关联的患者ID
  relation: string;            // 关系：父亲、母亲、配偶、子女等
  permission: 'view' | 'edit'; // 权限
  invitedAt: number;
  acceptedAt?: number;
}

/** 应用设置 */
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'normal' | 'large' | 'extra-large';
  enableAIInterpretation: boolean;
  enableAutoBackup: boolean;
  dataExportFormat: 'json' | 'csv';
  ocrEngine: 'volcengine' | 'local' | 'hybrid';
}

/** 上传任务 */
export interface UploadTask {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  ocrResult?: OCRResult;
  error?: string;
  createdAt: number;
}

/** 筛选条件 */
export interface FilterOptions {
  patientId?: string;
  documentTypes?: DocumentType[];
  visitTypes?: VisitType[];
  hospitals?: string[];
  departments?: string[];
  dateRange?: { start?: string; end?: string };
  searchQuery?: string;
}

// ==================== OCR服务相关 ====================

/** 火山引擎OCR配置 */
export interface VolcengineOCRConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint: string;
}

/** OCR请求参数 */
export interface OcrRequestParams {
  imageBase64?: string;
  imageUrl?: string;
  documentType?: DocumentType;
  outputTable?: boolean;
  outputCharInfo?: boolean;
}

// ==================== UI相关 ====================

/** 导航项 */
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

// ==================== P1-03: 体检异常标记 + 复查提醒 ====================

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

// ==================== P1-05: 疫苗管理 ====================

/** 疫苗接种记录 */
export interface VaccinationRecord {
  id: string;
  patientId: string;
  vaccineId: string;
  vaccineName: string;
  doseNumber: number;
  scheduledDate: string;
  actualDate?: string;
  status: 'pending' | 'completed' | 'overdue' | 'skipped';
  vaccinationSite?: string;
  batchNumber?: string;
  manufacturer?: string;
  reaction?: string;
  imageUrl?: string;
  category: 'national' | 'optional';
  createdAt: number;
  updatedAt: number;
}

// ==================== P1-01: 用药提醒 + 依从性追踪 ====================

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

/** 依从性周报 */
export interface AdherenceWeek {
  weekStart: string;
  weekEnd: string;
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  adherenceRate: number;
  dailyBreakdown: {
    date: string;
    scheduled: number;
    taken: number;
    rate: number;
  }[];
}

/** 统计概览 */
export interface HealthOverview {
  totalRecords: number;
  totalVisits: number;
  hospitals: string[];
  departments: string[];
  recentAbnormalTests: number;
  lastVisitDate?: string;
}

// ==================== 家人共享（跨用户）====================

/** 共享患者 */
export interface SharedPatient {
  id: string;
  user_id: string;
  invited_user_id: string;
  patient_id: string;
  relation: string;
  permission: 'view' | 'edit';
  status: 'pending' | 'accepted' | 'rejected';
  invited_at: number;
  accepted_at?: number;
  inviter_name?: string;
  inviter_phone?: string;
  patient_name?: string;
  patient_gender?: string;
  patient_birth_date?: string;
}

/** 共享邀请 */
export interface SharedInvitation {
  id: string;
  inviterName: string;
  inviterPhone: string;
  patientName: string;
  relation: string;
  permission: 'view' | 'edit';
  invitedAt: number;
}
