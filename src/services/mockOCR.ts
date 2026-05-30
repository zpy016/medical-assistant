/**
 * ============================================
 * 模拟OCR服务
 * 用于：
 * 1. 开发阶段无需真实API即可测试完整流程
 * 2. 演示环境展示产品功能
 * 3. 网络不可用时的降级方案
 * 4. 使用示例病历图片进行功能验证
 * ============================================
 */

import type { OCRResult, DocumentType } from '../types';
import { fileToBase64 } from '../utils/helpers';

/**
 * 根据文件名关键词模拟OCR结果
 * 使示例病历图片能展示对应类型的结构化数据
 */
export async function mockOCRProcess(file: File, startTime: number): Promise<OCRResult> {
  // 模拟处理延迟
  await delay(800 + Math.random() * 1200);

  const fileName = file.name.toLowerCase();

  // 根据文件名选择模拟数据
  if (fileName.includes('病历') || fileName.includes('record') || fileName.includes('7954')) {
    return createMockMedicalRecord(startTime);
  }
  if (fileName.includes('处方') || fileName.includes('prescription') || fileName.includes('7955')) {
    return createMockPrescription(startTime);
  }
  if (fileName.includes('检验') || fileName.includes('lab') || fileName.includes('blood') || fileName.includes('8610')) {
    return createMockLabReport(startTime);
  }
  if (fileName.includes('票据') || fileName.includes('receipt') || fileName.includes('发票') || fileName.includes('7951') || fileName.includes('7952') || fileName.includes('7953')) {
    return createMockReceipt(startTime);
  }
  if (fileName.includes('影像') || fileName.includes('ct') || fileName.includes('mri') || fileName.includes('xray')) {
    return createMockImagingReport(startTime);
  }

  // 默认通用病历
  return createMockMedicalRecord(startTime);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 模拟数据模板 ====================

function createMockMedicalRecord(startTime: number): OCRResult {
  const fullText = `首都医科大学附属北京世纪坛医院
急诊病历

姓名：张芃越    性别：男    年龄：37岁
科室：急诊内科    患者编号：0009410920

就诊日期：2025-02-17 22:00    病史陈述人：患者本人

主诉：发热1天

现病史：37.7℃，恶心，未呕吐，无腹泻，无腹痛，无咳嗽无流涕喷嚏。

既往史：
个人史、家族史：
药物过敏史：无
流行病学史：

体格检查：
T    ℃  P 86 次/分 R    次/分 BP    /   mmHg SPO2 98  %
神清一般可，心肺腹-

辅助检查：
检验：血常规+C反应蛋白
检查：
处置：
药品：
力欣奇片ZC/ 0.25gx12片/盒早、晚各一次/口服0.5g2
泰诺片ZE/x20片/盒早、中、晚餐后、睡前/口服1片4

转归：    □绿色通道 转归时间：
备注：按时复查、复诊，病情变化及时就诊。

医生签字：
1`;

  return {
    textBlocks: extractBlocksFromText(fullText),
    fullText,
    documentType: 'medical_record',
    confidence: 0.94,
    processingTime: Date.now() - startTime,
  };
}

function createMockPrescription(startTime: number): OCRResult {
  const fullText = `首都医科大学附属北京世纪坛医院急诊处方笺(西 药)
定点医疗机构编码：08110002    NO:00066985231

患者编号： 0009410920
姓名： 张芃越    性别/年龄： 男/37    工作单位： 无
收费类别： 医疗保险(在职)    就诊科室： 急诊科    病案号： 无
                                                    医嘱日期： 2025-02-17

诊断:发热 ， 感染性发热

药品名称(规格)    单次剂量    用法    日数  数量  单价  总价  报销类型
头孢羟氨苄片
ZC/ 0.25gx12片/盒    0.5g    早、晚各一次/口服    3    1盒  20.58  20.58  乙
酚麻美敏片
ZE/x20片/盒    1片    早、中、晚餐后、睡前/口服    3    1盒  13.47  13.47  乙

合计：  34.05    医师签字：

请到急诊西药房取药`;

  return {
    textBlocks: extractBlocksFromText(fullText),
    fullText,
    documentType: 'prescription',
    confidence: 0.96,
    processingTime: Date.now() - startTime,
  };
}

function createMockLabReport(startTime: number): OCRResult {
  const fullText = `北京协和医院

姓名：张芃越    年龄：38 岁    性别：男    ID号：47518674
科别：急诊外科    诊断：便血    样本：血    样本号：20260114BCB133

英文  中文名称          结果    单位      参考范围
1  WBC   白细胞            9.25    ×10^9/L   3.5-9.5
2  LY%   淋巴细胞百分比     16.3    %         20-40 ↓
3  MONO% 单核细胞百分比     5.5     %         3-8
4  NEUT% 中性粒细胞百分比   77.4    %         50-75
5  EOS%  嗜酸性粒细胞百分比 0.5     %         0.5-5
6  BASO% 嗜碱性粒细胞百分比 0.3     %         0-1
7  LY#   淋巴细胞绝对值     1.51    ×10^9/L   0.8-4
8  MONO# 单核细胞绝对值     0.51    ×10^9/L   0.12-0.8
9  NEUT# 中性粒细胞绝对值   7.15    ×10^9/L   2-7.5
10 EOS#  嗜酸性粒细胞绝对值 0.05    ×10^9/L   0.02-0.5
11 BASO# 嗜碱性粒细胞绝对值 0.03    ×10^9/L   0-0.1
12 RBC   红细胞            4.52    ×10^12/L  4-5.5
13 HGB   血红蛋白          135     g/L       120-160
14 HCT   红细胞压积        39.0    %         35-50
15 MCV   平均红细胞体积     86.3    fl        82-97
16 MCHC  平均红细胞血红蛋白浓度 346 g/L      320-360
17 MCH   平均红细胞血红蛋白量 29.9 pg        27-32
18 RDW-S 红细胞体积分布宽度 37.8    fl        39-46 ↓
19 RDW-C 红细胞体积分布宽度 11.9    %         0-15
20 PLT   血小板            164     ×10^9/L   100-350
21 PCT   血小板压积        0.16    %         0.11-0.28
22 PDW   血小板体积分布宽度 10.6    fl        9-17
23 MPV   平均血小板体积     9.8     fl        7-13
24 P-LCR 大血小板比率       23.1    %         13-43

申请医生：任博    检验者：王莎莎    审核者：王莎莎
采样时间：2026.01.14 20:49    接收时间：2026.01.14 21:10    报告时间：2026.01.14 21:14`;

  return {
    textBlocks: extractBlocksFromText(fullText),
    fullText,
    documentType: 'lab_report',
    confidence: 0.98,
    processingTime: Date.now() - startTime,
    tables: [{
      headers: ['序号', '英文', '中文名称', '结果', '单位', '参考范围'],
      rows: [
        ['1', 'WBC', '白细胞', '9.25', '×10^9/L', '3.5-9.5'],
        ['2', 'LY%', '淋巴细胞百分比', '16.3', '%', '20-40'],
        ['4', 'NEUT%', '中性粒细胞百分比', '77.4', '%', '50-75'],
        ['12', 'RBC', '红细胞', '4.52', '×10^12/L', '4-5.5'],
        ['13', 'HGB', '血红蛋白', '135', 'g/L', '120-160'],
        ['20', 'PLT', '血小板', '164', '×10^9/L', '100-350'],
      ],
      bbox: [0.05, 0.3, 0.95, 0.85],
    }],
  };
}

function createMockReceipt(startTime: number): OCRResult {
  const fullText = `北京市医疗门诊收费票据（电子）

票据代码:11060124
交款人统一社会信用代码:110104********3078
交款人:张芃越

项目名称              数量/单位    金额(元)  备注
西药费                1    项      34.05
头孢羟氨苄片
ZC/ 0.25gx12片/盒    1.0000 盒   20.58 有自付
酚麻美敏片
ZE/x20片/盒          1.0000 盒   13.47 有自付

金额合计(大写)叁拾肆元零伍分              (小写)34.05

业务流水号:sjtmz40000323525021717390    门诊号:0009410920    就诊日期:20250217
医疗机构类型:综合医院    医保类型:城镇职工    医保编号:10925421301S    性别:男
医保统筹基金支付:0.00    其他支付:0.00    个人账户支付:34.05    个人现金支付:0.00
个人自付:34.05    个人自费:0.00
自付一:30.65    门诊大额支付:0.00    大病保障支付:0.00    年度大病保障范围内:91.31
自付二:3.40    退休补充支付:0.00    医疗救助门诊支付:0.00    年度门诊大额支付:0.00
    残军补助支付:0.00    医保范围内:30.65    年度医保范围内:87.91
急诊    单位补充[原公疗]:0.00    医保交易流水号:081100020A250217015316医保已实时结算

收款单位(章):首都医科大学附属北京世纪坛医院    复核人:006273    收款人:006273`;

  return {
    textBlocks: extractBlocksFromText(fullText),
    fullText,
    documentType: 'receipt',
    confidence: 0.95,
    processingTime: Date.now() - startTime,
  };
}

function createMockImagingReport(startTime: number): OCRResult {
  const fullText = `北京协和医院
CT检查报告单

姓名：张芃越    性别：男    年龄：38岁    检查号：CT20260114001
科室：急诊外科    检查日期：2026-01-14

检查部位：胸部CT平扫

影像表现：
左肺下叶外基底段实性结节影，边缘可见毛刺，大小约 12mm × 10mm，较前相仿，周围多发磨玻璃灶；左侧胸腔内液体密度影，邻近肺组织膨隆不全，较前增多；纵隔内多发略肿大淋巴结影，部分较前变小；双侧肱骨头、多发...

影像诊断：
1. 左肺下叶结节，考虑恶性可能，建议进一步检查
2. 左侧胸腔积液，较前增多
3. 纵隔淋巴结肿大，部分较前缩小

报告医生：李医生    审核医生：王主任    报告时间：2026-01-14 16:30`;

  return {
    textBlocks: extractBlocksFromText(fullText),
    fullText,
    documentType: 'imaging_report',
    confidence: 0.93,
    processingTime: Date.now() - startTime,
  };
}

// ==================== 辅助函数 ====================

function extractBlocksFromText(text: string) {
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map((line, i) => ({
    text: line.trim(),
    confidence: 0.9 + Math.random() * 0.1,
    // 模拟位置，均匀分布
    bbox: [0.05, (i / lines.length) * 0.9, 0.95, ((i + 1) / lines.length) * 0.9] as [number, number, number, number],
  }));
}

/**
 * 为示例图片生成OCR结果
 * 用于初始化演示数据
 */
export async function generateMockOCRForDemo(fileName: string): Promise<OCRResult> {
  const mockFile = new File([], fileName, { type: 'image/jpeg' });
  return mockOCRProcess(mockFile, Date.now());
}
