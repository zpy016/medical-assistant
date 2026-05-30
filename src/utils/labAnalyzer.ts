/**
 * ============================================
 * 检验数值分析引擎
 * 解析参考范围、判断异常、计算偏离程度、生成趋势
 * ============================================
 */

import type { TestItem, TestItemAnalysis, MedicalRecord } from '../types';

/**
 * 从参考范围字符串中解析数值边界
 * 支持格式："3.9-6.1"、"< 5.0"、"> 10"、"阴性"、"阳性"、"正常"
 */
function parseReferenceRange(range: string): { min: number | null; max: number | null; type: 'range' | 'lt' | 'gt' | 'enum' } {
  if (!range || range.trim() === '') {
    return { min: null, max: null, type: 'range' };
  }

  const clean = range.trim().replace(/\s/g, '');

  // 范围格式：3.9-6.1、3.9~6.1
  const rangeMatch = clean.match(/^(-?\d+\.?\d*)[-~](-?\d+\.?\d*)$/);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2]),
      type: 'range',
    };
  }

  // 小于：<5.0、≤5.0
  const ltMatch = clean.match(/^[<≤](-?\d+\.?\d*)$/);
  if (ltMatch) {
    return { min: null, max: parseFloat(ltMatch[1]), type: 'lt' };
  }

  // 大于：>10、≥10
  const gtMatch = clean.match(/^[>≥](-?\d+\.?\d*)$/);
  if (gtMatch) {
    return { min: parseFloat(gtMatch[1]), max: null, type: 'gt' };
  }

  // 枚举值：阴性/阳性/正常/异常等
  return { min: null, max: null, type: 'enum' };
}

/**
 * 从结果字符串中提取数值
 */
function extractNumericValue(result: string): number | null {
  if (!result) return null;

  // 匹配开头的数字（支持小数、负数）
  const match = result.toString().match(/^(-?\d+\.?\d*)/);
  if (match) {
    const val = parseFloat(match[1]);
    if (!isNaN(val)) return val;
  }

  return null;
}

/**
 * 分析单个检验项目是否异常
 */
export function analyzeTestItem(item: TestItem): TestItemAnalysis {
  const result = item.result?.toString().trim() ?? '';
  const refRange = item.referenceRange?.toString().trim() ?? '';

  const numericValue = extractNumericValue(result);
  const ref = parseReferenceRange(refRange);

  // 无法解析数值时，回退到简单的字符串匹配
  if (numericValue === null || ref.type === 'enum') {
    // 对于枚举类型，检查是否包含"阴性""正常"等关键词
    const normalKeywords = ['阴性', '正常', '未见', '无', '未检出', '-', '—'];
    const abnormalKeywords = ['阳性', '异常', '见', '有'];

    const isNormal = normalKeywords.some(k => result.includes(k));
    const isAbnormal = abnormalKeywords.some(k => result.includes(k));

    // 如果以 ↑↓ 箭头标记，直接判断
    if (result.includes('↑')) {
      return { isAbnormal: true, direction: 'high', severity: 'moderate', numericValue: null, numericMin: null, numericMax: null };
    }
    if (result.includes('↓')) {
      return { isAbnormal: true, direction: 'low', severity: 'moderate', numericValue: null, numericMin: null, numericMax: null };
    }

    return {
      isAbnormal: isAbnormal && !isNormal,
      direction: null,
      severity: isAbnormal ? 'moderate' : null,
      numericValue: null,
      numericMin: null,
      numericMax: null,
    };
  }

  let isAbnormal = false;
  let direction: 'high' | 'low' | null = null;
  let severity: 'mild' | 'moderate' | 'severe' | null = null;

  // 判断异常方向
  if (ref.type === 'range' && ref.min !== null && ref.max !== null) {
    if (numericValue < ref.min) {
      isAbnormal = true;
      direction = 'low';
    } else if (numericValue > ref.max) {
      isAbnormal = true;
      direction = 'high';
    }
  } else if (ref.type === 'lt' && ref.max !== null) {
    if (numericValue > ref.max) {
      isAbnormal = true;
      direction = 'high';
    }
  } else if (ref.type === 'gt' && ref.min !== null) {
    if (numericValue < ref.min) {
      isAbnormal = true;
      direction = 'low';
    }
  }

  // 计算偏离程度
  if (isAbnormal && ref.type === 'range' && ref.min !== null && ref.max !== null) {
    const range = ref.max - ref.min;
    const center = (ref.min + ref.max) / 2;
    const deviation = Math.abs(numericValue - center) / (range / 2);

    if (deviation <= 1.5) severity = 'mild';
    else if (deviation <= 2.0) severity = 'moderate';
    else severity = 'severe';
  } else if (isAbnormal) {
    // 无法精确计算时，根据偏离比例估算
    const boundary = direction === 'high' ? ref.max ?? ref.min : ref.min ?? ref.max;
    if (boundary !== null && boundary !== 0) {
      const ratio = Math.abs(numericValue - boundary) / Math.abs(boundary);
      if (ratio <= 0.3) severity = 'mild';
      else if (ratio <= 0.6) severity = 'moderate';
      else severity = 'severe';
    } else {
      severity = 'moderate';
    }
  }

  return {
    isAbnormal,
    direction,
    severity,
    numericValue,
    numericMin: ref.min,
    numericMax: ref.max,
  };
}

/**
 * 获取检验项目的颜色编码
 */
export function getSeverityColor(severity: 'mild' | 'moderate' | 'severe' | null): string {
  switch (severity) {
    case 'severe': return '#dc2626'; // red-600
    case 'moderate': return '#ea580c'; // orange-600
    case 'mild': return '#ca8a04'; // yellow-600
    default: return '#6b7280'; // gray-500
  }
}

export function getSeverityLabel(severity: 'mild' | 'moderate' | 'severe' | null): string {
  switch (severity) {
    case 'severe': return '严重';
    case 'moderate': return '中度';
    case 'mild': return '轻度';
    default: return '正常';
  }
}

/**
 * 计算同一检验项目的历史趋势
 */
export function getTestItemTrend(
  records: MedicalRecord[],
  itemName: string
): { date: string; value: number; isAbnormal: boolean; recordId: string }[] {
  const trend: { date: string; value: number; isAbnormal: boolean; recordId: string }[] = [];

  for (const record of records) {
    const items = record.structuredData?.testItems ?? [];
    const item = items.find(i => i.name === itemName);
    if (!item) continue;

    const analysis = analyzeTestItem(item);
    if (analysis.numericValue !== null) {
      trend.push({
        date: record.structuredData?.visitDate ?? new Date(record.createdAt).toISOString().split('T')[0],
        value: analysis.numericValue,
        isAbnormal: analysis.isAbnormal,
        recordId: record.id,
      });
    }
  }

  return trend.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 生成复查建议间隔（天数）
 */
export function suggestFollowUpInterval(
  itemName: string,
  direction: 'high' | 'low',
  severity: 'mild' | 'moderate' | 'severe'
): number {
  // 常见检验项目的默认复查间隔
  const itemIntervals: Record<string, { mild: number; moderate: number; severe: number }> = {
    '血糖': { mild: 30, moderate: 14, severe: 7 },
    '空腹血糖': { mild: 30, moderate: 14, severe: 7 },
    '糖化血红蛋白': { mild: 90, moderate: 60, severe: 30 },
    '血压': { mild: 30, moderate: 14, severe: 7 },
    '白细胞': { mild: 30, moderate: 14, severe: 3 },
    '红细胞': { mild: 60, moderate: 30, severe: 14 },
    '血红蛋白': { mild: 60, moderate: 30, severe: 14 },
    '血小板': { mild: 30, moderate: 14, severe: 7 },
    '转氨酶': { mild: 30, moderate: 14, severe: 7 },
    'ALT': { mild: 30, moderate: 14, severe: 7 },
    'AST': { mild: 30, moderate: 14, severe: 7 },
    '肌酐': { mild: 30, moderate: 14, severe: 7 },
    '尿酸': { mild: 30, moderate: 14, severe: 7 },
    '胆固醇': { mild: 90, moderate: 60, severe: 30 },
    '甘油三酯': { mild: 90, moderate: 60, severe: 30 },
    '低密度脂蛋白': { mild: 90, moderate: 60, severe: 30 },
    '高密度脂蛋白': { mild: 90, moderate: 60, severe: 30 },
    '甲状腺功能': { mild: 90, moderate: 60, severe: 30 },
    'TSH': { mild: 90, moderate: 60, severe: 30 },
  };

  // 匹配项目名称（模糊匹配）
  for (const [key, intervals] of Object.entries(itemIntervals)) {
    if (itemName.includes(key)) {
      return intervals[severity];
    }
  }

  // 默认间隔
  const defaultIntervals = { mild: 30, moderate: 14, severe: 7 };
  return defaultIntervals[severity];
}

/**
 * 从所有病历中提取异常检验项目
 */
export function extractAbnormalTests(records: MedicalRecord[]): {
  recordId: string;
  recordDate: string;
  hospital?: string;
  item: TestItem;
  analysis: TestItemAnalysis;
}[] {
  const abnormalTests: {
    recordId: string;
    recordDate: string;
    hospital?: string;
    item: TestItem;
    analysis: TestItemAnalysis;
  }[] = [];

  for (const record of records) {
    const items = record.structuredData?.testItems ?? [];
    for (const item of items) {
      const analysis = analyzeTestItem(item);
      if (analysis.isAbnormal) {
        abnormalTests.push({
          recordId: record.id,
          recordDate: record.structuredData?.visitDate ?? new Date(record.createdAt).toISOString().split('T')[0],
          hospital: record.structuredData?.hospital,
          item,
          analysis,
        });
      }
    }
  }

  return abnormalTests.sort((a, b) => b.recordDate.localeCompare(a.recordDate));
}
