/**
 * AI 功能前端客户端
 * 调用后端 /api/ai/* 接口
 */



export interface AIReportAnalysisRequest {
  patientInfo?: {
    name?: string;
    age?: number;
    gender?: string;
  };
  testItems: Array<{
    name: string;
    value: string;
    unit?: string;
    reference?: string;
    date?: string;
  }>;
  recordType?: string;
}

export interface AIReportAnalysisResult {
  overallAssessment: string;
  abnormalItems: Array<{
    name: string;
    value: string;
    reference: string;
    interpretation: string;
    severity: 'normal' | 'mild' | 'moderate' | 'severe';
    suggestion: string;
  }>;
  healthAdvice: string[];
  followUpSuggestions: Array<{
    item: string;
    interval: string;
    reason: string;
  }>;
  disclaimer: string;
}

export interface AIVisitPrepRequest {
  patientInfo?: Record<string, unknown>;
  medicalRecords?: Array<{
    date?: string;
    type?: string;
    content?: string;
    summary?: string;
  }>;
  currentSymptoms?: string;
  targetDepartment?: string;
}

export interface AIVisitPrepResult {
  visitType: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  documents: Array<{
    name: string;
    description: string;
    priority: 'must' | 'should' | 'optional';
  }>;
  questions: Array<{
    category: string;
    questions: string[];
  }>;
  symptomsToDescribe: string[];
  notes: string[];
  disclaimer: string;
}

export interface AICaseSummaryRequest {
  patientInfo?: Record<string, unknown>;
  records: Array<{
    date: string;
    type?: string;
    hospital?: string;
    department?: string;
    diagnoses?: string[];
    medications?: string[];
    content?: string;
    summary?: string;
    testItems?: Array<{ name: string; value: string; unit?: string }>;
  }>;
}

export interface AICaseSummaryResult {
  patientOverview: string;
  timeline: Array<{
    date: string;
    type: string;
    summary: string;
    keyFindings: string[];
    diagnoses: string[];
    treatments: string[];
  }>;
  conditionTrend: string;
  activeDiagnoses: string[];
  medications: Array<{
    name: string;
    dosage: string;
    purpose: string;
  }>;
  recommendations: string[];
  disclaimer: string;
}

interface AIResponse<T> {
  success: boolean;
  data: T;
  meta: {
    model: string;
    duration: number;
    timestamp: string;
  };
}

const API_BASE = '';

async function postAI<T>(endpoint: string, body: unknown): Promise<AIResponse<T>> {
  const token = localStorage.getItem('medical_auth_token');
  const userId = localStorage.getItem('medical_user_id') || 'anonymous';

  const response = await fetch(`/api/ai/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'X-User-Id': userId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * AI 报告解读
 */
export async function analyzeReport(
  request: AIReportAnalysisRequest
): Promise<AIReportAnalysisResult> {
  const result = await postAI<AIReportAnalysisResult>('report-analysis', request);
  return result.data;
}

/**
 * AI 就诊准备清单
 */
export async function generateVisitPrep(
  request: AIVisitPrepRequest
): Promise<AIVisitPrepResult> {
  const result = await postAI<AIVisitPrepResult>('visit-prep', request);
  return result.data;
}

/**
 * AI 病例摘要
 */
export async function generateCaseSummary(
  request: AICaseSummaryRequest
): Promise<AICaseSummaryResult> {
  const result = await postAI<AICaseSummaryResult>('case-summary', request);
  return result.data;
}
