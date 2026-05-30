/**
 * ============================================
 * OCR结果解析器 - 将原始OCR文本转换为结构化数据
 * 核心模块：决定OCR准确率体验的关键环节
 * 设计为纯函数，便于单元测试和跨平台复用
 * ============================================
 */

import type { DocumentType, StructuredData, OCRResult, TestItem, Medication } from '../types';
import { parseDateFromText } from './helpers';
import { extractICD10Codes } from './icd10';

// ==================== 文档类型自动识别 ====================

/**
 * 根据OCR文本内容自动判断文档类型
 */
export function detectDocumentType(text: string): DocumentType {
  const lower = text.toLowerCase();

  // 检验报告特征
  if (/检验报告|检验结果|血常规|尿常规|生化|肝功能|肾功能|血糖|血脂|肿瘤标志物|参考范围|参考值/.test(text)) {
    return 'lab_report';
  }

  // 影像报告特征
  if (/影像诊断|CT诊断|MR诊断|X线|超声诊断|放射科|影像科|检查部位|影像表现|诊断意见/.test(text)) {
    return 'imaging_report';
  }

  // 处方特征
  if (/处方笺|处方|Rp|药品名称|规格|剂量|用法|用量|口服|静脉滴注|皮下注射/.test(text)) {
    return 'prescription';
  }

  // 票据特征
  if (/收费票据|门诊收费|住院收费|金额|合计|医保报销|自付|收费项目|单价|数量/.test(text)) {
    return 'receipt';
  }

  // 出院小结
  if (/出院小结|出院记录|入院日期|出院日期|住院天数|入院诊断|出院诊断/.test(text)) {
    return 'discharge_summary';
  }

  // 病理报告
  if (/病理诊断|病理报告|HE染色|免疫组化|镜下所见|病理所见|病理科/.test(text)) {
    return 'pathology';
  }

  // 保险
  if (/保险单|保单|保险合同|保费|保额|受益人|投保人|被保险人/.test(text)) {
    return 'insurance';
  }

  // 默认病历
  return 'medical_record';
}

// ==================== 结构化信息提取 ====================

/**
 * 从OCR全文中提取结构化字段
 * 这是第一阶段的核心解析逻辑，后续可接入LLM增强
 */
export function extractStructuredData(ocrResult: OCRResult): StructuredData {
  const text = ocrResult.fullText;
  const data: StructuredData = {};

  // 提取姓名
  data.patientName = extractField(text, [
    /姓名[：:]\s*([^\s\n]{2,10})/,
    /患者姓名[：:]\s*([^\s\n]{2,10})/,
    / Name[：:]\s*([^\s\n]{2,10})/i,
  ]);

  // 提取性别
  const genderMatch = text.match(/性别[：:]\s*(男|女)/);
  if (genderMatch) data.gender = genderMatch[1];

  // 提取年龄
  const ageMatch = text.match(/年龄[：:]\s*(\d+)/) || text.match(/(\d+)\s*岁/);
  if (ageMatch) data.age = parseInt(ageMatch[1]);

  // 提取医院
  data.hospital = extractField(text, [
    /([\u4e00-\u9fa5]{2,}(?:医院|卫生院|诊所|医疗中心))/,
    /([\u4e00-\u9fa5]{2,}(?:大学附属|市|区|县)[\u4e00-\u9fa5]*医院)/,
  ]);

  // 提取科室
  data.department = extractField(text, [
    /科室[：:]\s*([^\s\n]{2,20})/,
    /就诊科室[：:]\s*([^\s\n]{2,20})/,
    /科别[：:]\s*([^\s\n]{2,20})/,
  ]);

  // 提取就诊日期
  data.visitDate = parseDateFromText(text) ?? undefined;

  // 提取主诉
  data.chiefComplaint = extractField(text, [
    /主诉[：:]\s*([^\n]{2,100})/,
  ]);

  // 提取现病史
  data.presentIllness = extractField(text, [
    /现病史[：:]\s*([^\n]{2,200})/,
  ]);

  // 提取诊断
  data.diagnosis = extractDiagnosis(text);

  // 提取 ICD-10 编码
  if (data.diagnosis && data.diagnosis.length > 0) {
    const icdResult = extractICD10Codes(data.diagnosis);
    data.icd10Codes = icdResult.codes;
  }

  // 提取过敏史
  data.allergies = extractField(text, [
    /药物过敏史[：:]\s*([^\n]{2,50})/,
    /过敏史[：:]\s*([^\n]{2,50})/,
  ]);

  // 提取备注
  data.notes = extractField(text, [
    /备注[：:]\s*([^\n]{2,200})/,
    /医嘱[：:]\s*([^\n]{2,200})/,
  ]);

  // 提取就诊类型
  data.visitType = detectVisitType(text);

  // 根据文档类型提取特定字段
  const docType = ocrResult.documentType ?? detectDocumentType(text);

  if (docType === 'lab_report') {
    data.testItems = extractTestItems(text, ocrResult);
  }

  if (docType === 'prescription') {
    data.medications = extractMedications(text);
  }

  if (docType === 'receipt') {
    data.totalAmount = extractTotalAmount(text);
  }

  if (docType === 'imaging_report') {
    data.imagingFindings = extractField(text, [
      /影像表现[：:]\s*([\s\S]{10,500}?)(?=影像诊断|诊断意见|检查结论|$)/,
      /所见[：:]\s*([\s\S]{10,500}?)(?=诊断|结论|$)/,
    ]);
    data.imagingConclusion = extractField(text, [
      /影像诊断[：:]\s*([^\n]{2,200})/,
      /诊断意见[：:]\s*([^\n]{2,200})/,
      /检查结论[：:]\s*([^\n]{2,200})/,
      /诊断[：:]\s*([^\n]{2,200})/,
    ]);
  }

  return data;
}

// ==================== 字段提取辅助函数 ====================

function extractField(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function extractDiagnosis(text: string): string[] | undefined {
  const diagnoses: string[] = [];

  // 模式1: 诊断：xxx
  const diagMatch = text.match(/诊断[：:]\s*([^\n]{2,200})/);
  if (diagMatch) {
    // 可能包含多个诊断，用逗号、分号或换行分隔
    const parts = diagMatch[1].split(/[,，;；、]/).map(s => s.trim()).filter(s => s.length > 1);
    diagnoses.push(...parts);
  }

  // 模式2: 初步诊断
  const prelimMatch = text.match(/初步诊断[：:]\s*([^\n]{2,200})/);
  if (prelimMatch) {
    const parts = prelimMatch[1].split(/[,，;；、]/).map(s => s.trim()).filter(s => s.length > 1);
    diagnoses.push(...parts);
  }

  // 模式3: 出院诊断
  const dischargeMatch = text.match(/出院诊断[：:]\s*([^\n]{2,200})/);
  if (dischargeMatch) {
    const parts = dischargeMatch[1].split(/[,，;；、]/).map(s => s.trim()).filter(s => s.length > 1);
    diagnoses.push(...parts);
  }

  return diagnoses.length > 0 ? [...new Set(diagnoses)] : undefined;
}

// ==================== 检验项目提取 ====================

function extractTestItems(text: string, ocrResult: OCRResult): TestItem[] | undefined {
  const items: TestItem[] = [];

  // 方法1: 从OCR表格中提取
  if (ocrResult.tables && ocrResult.tables.length > 0) {
    for (const table of ocrResult.tables) {
      const headers = table.headers.map(h => h.trim());
      const nameIdx = headers.findIndex(h => /项目|名称|指标/.test(h));
      const resultIdx = headers.findIndex(h => /结果|数值/.test(h));
      const unitIdx = headers.findIndex(h => /单位/.test(h));
      const refIdx = headers.findIndex(h => /参考|范围|正常/.test(h));

      if (nameIdx >= 0 && resultIdx >= 0) {
        for (const row of table.rows) {
          const name = row[nameIdx]?.trim();
          const result = row[resultIdx]?.trim();
          if (name && result && name !== '项目名称') {
            const item: TestItem = {
              name,
              result,
              unit: unitIdx >= 0 ? row[unitIdx]?.trim() : undefined,
              referenceRange: refIdx >= 0 ? row[refIdx]?.trim() : undefined,
            };
            // 判断异常
            item.isAbnormal = detectAbnormal(item);
            items.push(item);
          }
        }
      }
    }
  }

  // 方法2: 从文本中逐行提取（表格识别失败时的降级方案）
  if (items.length === 0) {
    const lines = text.split('\n');
    for (const line of lines) {
      // 匹配模式: 项目名称 结果 单位 参考范围
      const match = line.match(/([\u4e00-\u9fa5\w\/\(\)]+)\s+([\d.]+)\s*([\u4e00-\u9fa5\/\^\w%]*)\s*([\d.\-～~]+.*)?/);
      if (match && match[1].length >= 2) {
        const name = match[1].trim();
        const result = match[2].trim();
        const unit = match[3]?.trim() || undefined;
        const referenceRange = match[4]?.trim() || undefined;

        // 过滤掉表头行
        if (!/项目|名称|结果|单位|参考/.test(name)) {
          const item: TestItem = { name, result, unit, referenceRange };
          item.isAbnormal = detectAbnormal(item);
          items.push(item);
        }
      }
    }
  }

  return items.length > 0 ? items : undefined;
}

/**
 * 判断指标是否异常
 */
function detectAbnormal(item: TestItem): boolean {
  if (!item.referenceRange || !item.result) return false;

  const resultStr = item.result.replace(/[↑↓HHL]/g, '').trim();
  const numResult = parseFloat(resultStr);
  if (isNaN(numResult)) return false;

  // 解析参考范围
  const rangeMatch = item.referenceRange.match(/([\d.]+)\s*[-～~]\s*([\d.]+)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (numResult < min) {
      item.abnormalDirection = 'low';
      return true;
    }
    if (numResult > max) {
      item.abnormalDirection = 'high';
      return true;
    }
  }

  // 检查结果中是否有异常标记
  if (/[↑H]|偏高|升高|阳性/.test(item.result)) {
    item.abnormalDirection = 'high';
    return true;
  }
  if (/[↓L]|偏低|降低/.test(item.result)) {
    item.abnormalDirection = 'low';
    return true;
  }

  return false;
}

// ==================== 药品提取 ====================

function extractMedications(text: string): Medication[] | undefined {
  const medications: Medication[] = [];

  // 常见药品名称匹配
  const lines = text.split('\n');
  for (const line of lines) {
    // 匹配: 药品名 规格 剂量 用法
    const match = line.match(/([\u4e00-\u9fa5\w]+(?:片|胶囊|颗粒|注射液|口服液|滴眼液|软膏|喷剂|散)?)\s*(\d+\.?\d*\s*[mgμgIU片粒支瓶盒]+)?\s*(\d+\.?\d*\s*(?:mg|g|ml|片|粒))?\s*(口服|静脉滴注|皮下注射|肌内注射|外用|含服)?/);
    if (match && match[1] && match[1].length >= 2) {
      medications.push({
        name: match[1].trim(),
        specification: match[2]?.trim(),
        dosage: match[3]?.trim(),
        route: match[4]?.trim(),
      });
    }
  }

  // 处方表格提取
  const prescriptionMatch = text.match(/药品名称.*?\n([\s\S]*?)(?=合计|医师|$)/);
  if (prescriptionMatch && medications.length === 0) {
    const drugLines = prescriptionMatch[1].split('\n');
    for (const line of drugLines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && parts[0].length >= 2 && !/药品|名称/.test(parts[0])) {
        medications.push({
          name: parts[0],
          specification: parts[1],
          dosage: parts.slice(2).join(' '),
        });
      }
    }
  }

  return medications.length > 0 ? medications : undefined;
}

// ==================== 就诊类型检测 ====================

function detectVisitType(text: string): import('../types').VisitType {
  if (/急诊/.test(text)) return 'emergency';
  if (/住院|入院|出院小结|住院收费/.test(text)) return 'inpatient';
  if (/体检|健康体检|入职体检|年度体检/.test(text)) return 'physical';
  return 'outpatient';
}

// ==================== 金额提取 ====================

function extractTotalAmount(text: string): number | undefined {
  const patterns = [
    /合计[：:]\s*(\d+\.?\d*)/,
    /总金额[：:]\s*(\d+\.?\d*)/,
    /金额合计[（大写）]*[：:]\s*\D*[(（]小写[）)]?\s*(\d+\.?\d*)/,
    /总计[：:]\s*(\d+\.?\d*)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  return undefined;
}
