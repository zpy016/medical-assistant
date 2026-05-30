/**
 * ============================================
 * 演示数据初始化
 * 使用"病历和诊断单示例"文件夹中的真实病历数据
 * 构建一个完整的就诊时间线用于功能演示
 * ============================================
 */

import type { Patient, MedicalRecord, VisitEvent, DocumentType } from '../types';
import * as db from '../db';
import { generateId } from './helpers';
import { generateMockOCRForDemo } from '../services/mockOCR';

/**
 * 初始化演示数据
 */
export async function initDemoData() {
  // 创建示例患者
  const patient: Patient = {
    id: generateId(),
    name: '张芃越',
    gender: 'male',
    age: 37,
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.addPatient(patient);

  // 构建就诊时间线数据
  const demoRecords = await buildDemoRecords(patient.id);

  // 按日期分组为就诊事件
  const visitMap = new Map<string, MedicalRecord[]>();
  for (const record of demoRecords) {
    const date = record.structuredData?.visitDate ?? '2025-02-17';
    if (!visitMap.has(date)) visitMap.set(date, []);
    visitMap.get(date)!.push(record);
  }

  for (const [date, records] of visitMap) {
    const diagnoses = new Set<string>();
    records.forEach(r => r.structuredData?.diagnosis?.forEach(d => diagnoses.add(d)));

    const event: VisitEvent = {
      id: generateId(),
      patientId: patient.id,
      date,
      hospital: records[0].structuredData?.hospital,
      department: records[0].structuredData?.department,
      visitType: records[0].structuredData?.visitType ?? 'emergency',
      diagnosis: Array.from(diagnoses),
      records,
      createdAt: records[0].createdAt,
    };
    await db.addVisitEvent(event);
  }
}

async function buildDemoRecords(patientId: string): Promise<MedicalRecord[]> {
  const records: MedicalRecord[] = [];

  // === 就诊1: 2025-02-17 北京世纪坛医院 急诊 ===
  // 对应图片: IMG_7954(急诊病历), IMG_7955(处方), IMG_7951/7952/7953(票据)

  // 急诊病历
  const record1Ocr = await generateMockOCRForDemo('IMG_7954_急诊病历.jpg');
  records.push({
    id: generateId(),
    patientId,
    originalImage: '/demo/medical_record.jpg',
    ocrResult: record1Ocr,
    structuredData: {
      patientName: '张芃越',
      gender: '男',
      age: 37,
      hospital: '首都医科大学附属北京世纪坛医院',
      department: '急诊内科',
      visitDate: '2025-02-17',
      visitTime: '22:00',
      visitType: 'emergency',
      chiefComplaint: '发热1天',
      presentIllness: '37.7℃，恶心，未呕吐，无腹泻，无腹痛，无咳嗽无流涕喷嚏',
      diagnosis: ['发热', '感染性发热'],
      allergies: '无',
      notes: '按时复查、复诊，病情变化及时就诊',
    },
    documentType: 'medical_record',
    status: 'confirmed',
    createdAt: Date.now() - 86400000 * 120,
    updatedAt: Date.now() - 86400000 * 120,
    uploadedAt: Date.now() - 86400000 * 120,
  });

  // 处方笺
  const record2Ocr = await generateMockOCRForDemo('IMG_7955_处方.jpg');
  records.push({
    id: generateId(),
    patientId,
    originalImage: '/demo/prescription.jpg',
    ocrResult: record2Ocr,
    structuredData: {
      patientName: '张芃越',
      gender: '男',
      age: 37,
      hospital: '首都医科大学附属北京世纪坛医院',
      department: '急诊科',
      visitDate: '2025-02-17',
      visitType: 'emergency',
      diagnosis: ['发热', '感染性发热'],
      medications: [
        { name: '头孢羟氨苄片', specification: '0.25gx12片/盒', dosage: '0.5g', frequency: '早、晚各一次', route: '口服', quantity: '1盒', price: 20.58 },
        { name: '酚麻美敏片', specification: 'x20片/盒', dosage: '1片', frequency: '早、中、晚餐后、睡前', route: '口服', quantity: '1盒', price: 13.47 },
      ],
      totalAmount: 34.05,
    },
    documentType: 'prescription',
    status: 'confirmed',
    createdAt: Date.now() - 86400000 * 120 + 1000,
    updatedAt: Date.now() - 86400000 * 120 + 1000,
    uploadedAt: Date.now() - 86400000 * 120 + 1000,
  });

  // 收费票据1 - 诊疗费
  const record3Ocr = await generateMockOCRForDemo('IMG_7951_票据.jpg');
  records.push({
    id: generateId(),
    patientId,
    originalImage: '/demo/receipt1.jpg',
    ocrResult: record3Ocr,
    structuredData: {
      patientName: '张芃越',
      hospital: '首都医科大学附属北京世纪坛医院',
      visitDate: '2025-02-17',
      visitType: 'emergency',
      totalAmount: 70.00,
      paymentMethod: '医保个人账户支付',
    },
    documentType: 'receipt',
    status: 'confirmed',
    createdAt: Date.now() - 86400000 * 120 + 2000,
    updatedAt: Date.now() - 86400000 * 120 + 2000,
    uploadedAt: Date.now() - 86400000 * 120 + 2000,
  });

  // 收费票据2 - 检查费
  const record4Ocr = await generateMockOCRForDemo('IMG_7952_票据.jpg');
  records.push({
    id: generateId(),
    patientId,
    originalImage: '/demo/receipt2.jpg',
    ocrResult: record4Ocr,
    structuredData: {
      patientName: '张芃越',
      hospital: '首都医科大学附属北京世纪坛医院',
      visitDate: '2025-02-17',
      visitType: 'emergency',
      totalAmount: 57.26,
      paymentMethod: '医保个人账户支付',
    },
    documentType: 'receipt',
    status: 'confirmed',
    createdAt: Date.now() - 86400000 * 120 + 3000,
    updatedAt: Date.now() - 86400000 * 120 + 3000,
    uploadedAt: Date.now() - 86400000 * 120 + 3000,
  });

  // 收费票据3 - 西药费
  const record5Ocr = await generateMockOCRForDemo('IMG_7953_票据.jpg');
  records.push({
    id: generateId(),
    patientId,
    originalImage: '/demo/receipt3.jpg',
    ocrResult: record5Ocr,
    structuredData: {
      patientName: '张芃越',
      hospital: '首都医科大学附属北京世纪坛医院',
      visitDate: '2025-02-17',
      visitType: 'emergency',
      totalAmount: 34.05,
      paymentMethod: '医保个人账户支付',
    },
    documentType: 'receipt',
    status: 'confirmed',
    createdAt: Date.now() - 86400000 * 120 + 4000,
    updatedAt: Date.now() - 86400000 * 120 + 4000,
    uploadedAt: Date.now() - 86400000 * 120 + 4000,
  });

  // === 就诊2: 2026-01-14 北京协和医院 急诊 ===
  // 对应图片: IMG_8610(血常规检验报告)

  const record6Ocr = await generateMockOCRForDemo('IMG_8610_检验报告.jpg');
  records.push({
    id: generateId(),
    patientId,
    originalImage: '/demo/lab_report.jpg',
    ocrResult: record6Ocr,
    structuredData: {
      patientName: '张芃越',
      gender: '男',
      age: 38,
      hospital: '北京协和医院',
      department: '急诊外科',
      visitDate: '2026-01-14',
      visitTime: '20:49',
      visitType: 'emergency',
      diagnosis: ['便血'],
      testItems: [
        { name: '白细胞', nameEn: 'WBC', result: '9.25', unit: '×10^9/L', referenceRange: '3.5-9.5', isAbnormal: false },
        { name: '淋巴细胞百分比', nameEn: 'LY%', result: '16.3', unit: '%', referenceRange: '20-40', isAbnormal: true, abnormalDirection: 'low' },
        { name: '中性粒细胞百分比', nameEn: 'NEUT%', result: '77.4', unit: '%', referenceRange: '50-75', isAbnormal: true, abnormalDirection: 'high' },
        { name: '红细胞', nameEn: 'RBC', result: '4.52', unit: '×10^12/L', referenceRange: '4-5.5', isAbnormal: false },
        { name: '血红蛋白', nameEn: 'HGB', result: '135', unit: 'g/L', referenceRange: '120-160', isAbnormal: false },
        { name: '血小板', nameEn: 'PLT', result: '164', unit: '×10^9/L', referenceRange: '100-350', isAbnormal: false },
        { name: '红细胞体积分布宽度', nameEn: 'RDW-S', result: '37.8', unit: 'fl', referenceRange: '39-46', isAbnormal: true, abnormalDirection: 'low' },
      ],
    },
    documentType: 'lab_report',
    status: 'confirmed',
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 15,
    uploadedAt: Date.now() - 86400000 * 15,
  });

  // 保存所有记录
  for (const record of records) {
    await db.addRecord(record);
  }

  return records;
}
