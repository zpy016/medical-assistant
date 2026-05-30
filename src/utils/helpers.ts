/**
 * ============================================
 * 通用工具函数
 * 纯函数，无副作用，可在任何平台（Web/小程序/App）复用
 * ============================================
 */

import { format, parseISO, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { MedicalRecord, VisitEvent, DocumentType, VisitType } from '../types';

// ==================== ID生成 ====================

export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== 日期处理 ====================

/**
 * 从文本中解析日期
 * 支持格式：YYYY-MM-DD, YYYY/MM/DD, YYYY年MM月DD日, YYYYMMDD
 */
export function parseDateFromText(text: string): string | null {
  if (!text) return null;

  const patterns = [
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    /(\d{4})(\d{2})(\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      const day = parseInt(match[3]);
      if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

/**
 * 格式化日期显示
 */
export function formatDate(dateStr: string | number, fmt = 'yyyy-MM-dd'): string {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (!isValid(date)) return '-';
    return format(date, fmt, { locale: zhCN });
  } catch {
    return '-';
  }
}

export function formatDateTime(dateStr: string | number): string {
  return formatDate(dateStr, 'yyyy-MM-dd HH:mm');
}

export function formatRelativeDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}

// ==================== 文档类型工具 ====================

export const DOCUMENT_TYPE_CONFIG: Record<DocumentType, { label: string; icon: string; color: string; bgColor: string }> = {
  medical_record: { label: '病历', icon: 'FileText', color: '#0d9488', bgColor: '#f0fdfa' },
  lab_report: { label: '检验报告', icon: 'FlaskConical', color: '#3b82f6', bgColor: '#eff6ff' },
  imaging_report: { label: '影像报告', icon: 'Scan', color: '#8b5cf6', bgColor: '#faf5ff' },
  prescription: { label: '处方', icon: 'Pill', color: '#f97316', bgColor: '#fff7ed' },
  receipt: { label: '票据', icon: 'Receipt', color: '#22c55e', bgColor: '#f0fdf4' },
  discharge_summary: { label: '出院小结', icon: 'FileCheck', color: '#06b6d4', bgColor: '#ecfeff' },
  pathology: { label: '病理报告', icon: 'Microscope', color: '#ec4899', bgColor: '#fdf2f8' },
  insurance: { label: '保险单据', icon: 'Shield', color: '#6366f1', bgColor: '#eef2ff' },
  other: { label: '其他', icon: 'File', color: '#6b7280', bgColor: '#f9fafb' },
};

export const VISIT_TYPE_CONFIG: Record<VisitType, { label: string; color: string }> = {
  outpatient: { label: '门诊', color: '#0d9488' },
  inpatient: { label: '住院', color: '#3b82f6' },
  emergency: { label: '急诊', color: '#ef4444' },
  physical: { label: '体检', color: '#22c55e' },
};

export function getDocumentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_CONFIG[type]?.label ?? '其他';
}

export function getVisitTypeLabel(type: VisitType): string {
  return VISIT_TYPE_CONFIG[type]?.label ?? '门诊';
}

// ==================== 记录聚合 ====================

/**
 * 将记录按就诊事件分组
 */
export function groupRecordsByVisit(records: MedicalRecord[]): VisitEvent[] {
  const groups = new Map<string, MedicalRecord[]>();

  for (const record of records) {
    const date = record.structuredData?.visitDate ?? parseDateFromText(record.ocrResult?.fullText ?? '') ?? '未知日期';
    const hospital = record.structuredData?.hospital ?? '未知医院';
    const key = `${date}_${hospital}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(record);
  }

  return Array.from(groups.entries()).map(([key, recs]) => {
    const [date, hospital] = key.split('_');
    const diagnoses = new Set<string>();
    recs.forEach(r => r.structuredData?.diagnosis?.forEach(d => diagnoses.add(d)));

    return {
      id: generateId(),
      patientId: recs[0].patientId,
      date,
      hospital: hospital === '未知医院' ? undefined : hospital,
      department: recs[0].structuredData?.department,
      visitType: recs[0].structuredData?.visitType ?? 'outpatient',
      diagnosis: Array.from(diagnoses),
      records: recs,
      createdAt: recs[0].createdAt,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

// ==================== 文件处理 ====================

/**
 * 文件转base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 去掉data:image/xxx;base64,前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 压缩图片
 */
export function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // 白色背景（处理透明PNG）
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ==================== 数据导出 ====================

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function convertToCSV(records: MedicalRecord[]): string {
  const headers = ['日期', '医院', '科室', '类型', '诊断', '状态'];
  const rows = records.map(r => [
    r.structuredData?.visitDate ?? '-',
    r.structuredData?.hospital ?? '-',
    r.structuredData?.department ?? '-',
    getDocumentTypeLabel(r.documentType),
    r.structuredData?.diagnosis?.join('; ') ?? '-',
    r.status === 'confirmed' ? '已确认' : r.status === 'corrected' ? '已修正' : '待确认',
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// ==================== 防抖节流 ====================

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
