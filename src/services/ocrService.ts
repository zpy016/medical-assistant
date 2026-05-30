/**
 * ============================================
 * OCR 服务层
 * 封装火山引擎OCR API调用，同时提供降级方案（模拟OCR）
 * 所有网络请求集中在此层，便于后续接入真实API、缓存、重试等
 * ============================================
 */

import type { OcrRequestParams, OCRResult, VolcengineOCRConfig } from '../types';
import { detectDocumentType, extractStructuredData } from '../utils/ocrParser';
import { mockOCRProcess } from './mockOCR';
import { fileToBase64 } from '../utils/helpers';

// ==================== 配置 ====================

let ocrConfig: VolcengineOCRConfig | null = null;

export function setOCRConfig(config: VolcengineOCRConfig) {
  ocrConfig = config;
  localStorage.setItem('ocr_config', JSON.stringify(config));
}

export function getOCRConfig(): VolcengineOCRConfig | null {
  if (ocrConfig) return ocrConfig;
  const saved = localStorage.getItem('ocr_config');
  if (saved) {
    try {
      ocrConfig = JSON.parse(saved);
      return ocrConfig;
    } catch {
      return null;
    }
  }
  return null;
}

// ==================== 火山引擎 OCR API ====================

/**
 * 调用火山引擎OCR API
 * 
 * 火山引擎视觉智能OCR接入步骤：
 * 1. 在火山引擎控制台开通「视觉智能」服务
 * 2. 获取 AccessKey ID 和 Secret Access Key
 *    - 路径：右上角头像 → 密钥管理 → 新建密钥
 * 3. 开通具体的OCR能力（通用文字识别、表格识别等）
 * 4. 获取Endpoint（根据服务区域）：
 *    - 华北2(北京): visual.volcengineapi.com
 *    - 华东2(上海): visual.volcengineapi.com
 * 
 * API文档参考：
 * - 通用文字识别: https://www.volcengine.com/docs/6790/117777
 * - PDF/图片OCR: https://www.volcengine.com/docs/6790/117736
 * - 表格识别: https://www.volcengine.com/docs/6790/1336102
 * 
 * 鉴权方式：HMAC-SHA256签名
 * 必要Header:
 *   - X-Date: UTC时间，格式 YYYYMMDD'T'HHMMSS'Z'
 *   - Authorization: HMAC-SHA256 Credential={AK}/{ShortDate}/{Region}/{Service}/request, ...
 */

async function callVolcengineOCR(imageBase64: string): Promise<OCRResult> {
  const config = getOCRConfig();
  if (!config) {
    throw new Error('OCR配置未设置，请先在设置中配置火山引擎AK/SK');
  }

  // 构建请求参数
  const params: OcrRequestParams = {
    imageBase64,
    outputTable: true,
    outputCharInfo: true,
  };

  // 火山引擎通用OCR接口
  // 注意：实际调用需要完成HMAC-SHA256签名，这里展示调用逻辑
  // 由于前端直接调用需要处理签名（不推荐暴露SK），建议通过后端代理

  const endpoint = config.endpoint || 'https://visual.volcengineapi.com';

  // 构建签名（简化版，生产环境建议走后端代理）
  const now = new Date();
  const xDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const shortDate = xDate.slice(0, 8);

  const requestBody = {
    image_base64: imageBase64,
    // 可选参数
    output_table: true,
    output_char_info: true,
  };

  // 注意：以下签名逻辑为示意，实际需要使用SDK或后端代理
  // 前端直接暴露SK存在安全风险，强烈建议：
  // 方案A: 自建Node.js后端，前端 → 后端 → 火山引擎OCR
  // 方案B: 使用火山引擎函数计算/云函数作为代理

  try {
    const response = await fetch(`${endpoint}?Action=OCRPdf&Version=2021-08-23`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Date': xDate,
        // Authorization 需要HMAC-SHA256签名计算，此处省略完整签名逻辑
        // 生产环境请使用火山引擎SDK或后端代理
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OCR请求失败: ${response.status}`);
    }

    const result = await response.json();

    // 解析火山引擎返回格式
    return parseVolcengineOCRResponse(result);
  } catch (error) {
    console.error('火山引擎OCR调用失败:', error);
    throw error;
  }
}

/**
 * 解析火山引擎OCR返回结果
 */
function parseVolcengineOCRResponse(response: unknown): OCRResult {
  // 火山引擎OCR返回结构示例（需根据实际API调整）
  // {
  //   "ResponseMetadata": { ... },
  //   "Result": {
  //     "TextDetections": [
  //       { "Text": "...", "Confidence": 99.5, "Polygon": [...] }
  //     ],
  //     "Tables": [...]
  //   }
  // }

  const resp = response as Record<string, unknown>;
  const result = (resp.Result ?? resp.Data ?? {}) as Record<string, unknown>;

  const textDetections = (result.TextDetections ?? result.text_detections ?? []) as Array<{
    Text?: string;
    Confidence?: number;
    Polygon?: number[][];
    BBox?: number[];
  }>;

  const textBlocks = textDetections.map(td => ({
    text: td.Text ?? '',
    confidence: td.Confidence ?? 0,
    bbox: normalizeBBox(td.Polygon ?? td.BBox ?? [0, 0, 1, 1]),
  }));

  const fullText = textBlocks.map(b => b.text).join('\n');

  // 解析表格
  const tables = (result.Tables ?? result.tables ?? []) as Array<{
    Headers?: string[];
    Rows?: string[][];
    BBox?: number[];
  }>;

  return {
    textBlocks,
    fullText,
    tables: tables.map(t => ({
      headers: t.Headers ?? [],
      rows: t.Rows ?? [],
      bbox: normalizeBBox(t.BBox ?? [0, 0, 1, 1]),
    })),
    confidence: calculateOverallConfidence(textBlocks),
    processingTime: 0,
  };
}

function normalizeBBox(bbox: number[] | number[][]): [number, number, number, number] {
  if (Array.isArray(bbox[0])) {
    // Polygon格式 [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
    const points = bbox as number[][];
    const xs = points.map((p: number[]) => p[0]);
    const ys = points.map((p: number[]) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  // 已经是 [x1, y1, x2, y2]
  const arr = bbox as number[];
  return [arr[0] ?? 0, arr[1] ?? 0, arr[2] ?? 1, arr[3] ?? 1];
}

function calculateOverallConfidence(blocks: { confidence: number }[]): number {
  if (blocks.length === 0) return 0;
  const sum = blocks.reduce((acc, b) => acc + b.confidence, 0);
  return Math.round((sum / blocks.length) * 100) / 100;
}

// ==================== 主OCR处理流程 ====================

export interface OCROptions {
  useMock?: boolean;
  useBackend?: boolean;
  backendUrl?: string;
}

/**
 * 执行OCR识别
 * 优先顺序：1.真实API 2.后端代理 3.模拟OCR（降级）
 */
export async function performOCR(
  file: File,
  options: OCROptions = {}
): Promise<OCRResult> {
  const startTime = Date.now();

  // 方案1: 使用后端代理（推荐生产环境）
  if (options.useBackend && options.backendUrl) {
    return performOCRViaBackend(file, options.backendUrl);
  }

  // 方案2: 使用模拟OCR（开发/演示）
  if (options.useMock || !getOCRConfig()) {
    return mockOCRProcess(file, startTime);
  }

  // 方案3: 直接调用火山引擎API（需处理签名）
  try {
    const base64 = await fileToBase64(file);
    const result = await callVolcengineOCR(base64);
    result.processingTime = Date.now() - startTime;
    result.documentType = detectDocumentType(result.fullText);
    return result;
  } catch (error) {
    console.warn('真实OCR失败，降级到模拟OCR:', error);
    return mockOCRProcess(file, startTime);
  }
}

/**
 * 通过后端代理调用OCR
 * 推荐的生产环境方案：前端 → 自建后端 → 火山引擎OCR
 */
async function performOCRViaBackend(file: File, backendUrl: string): Promise<OCRResult> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${backendUrl}/api/ocr`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`后端OCR请求失败: ${response.status}`);
  }

  const result = await response.json() as OCRResult;
  return result;
}

/**
 * 从OCR结果生成结构化数据
 */
export function parseOCRResult(ocrResult: OCRResult) {
  const documentType = ocrResult.documentType ?? detectDocumentType(ocrResult.fullText);
  const structuredData = extractStructuredData(ocrResult);

  return {
    documentType,
    structuredData,
  };
}

// ==================== 后端代理部署指引 ====================

/**
 * 推荐的OCR后端代理方案（Node.js + Express）
 * 
 * ```javascript
 * // server.js
 * const express = require('express');
 * const multer = require('multer');
 * const { VisualService } = require('@volcengine/volc-sdk');
 * 
 * const app = express();
 * const upload = multer();
 * 
 * const visualService = new VisualService();
 * visualService.setAk(process.env.VOLC_AK);
 * visualService.setSk(process.env.VOLC_SK);
 * 
 * app.post('/api/ocr', upload.single('image'), async (req, res) => {
 *   try {
 *     const imageBase64 = req.file.buffer.toString('base64');
 *     const result = await visualService.ocrPdf({
 *       image_base64: imageBase64,
 *       output_table: true,
 *     });
 *     res.json(result);
 *   } catch (error) {
 *     res.status(500).json({ error: error.message });
 *   }
 * });
 * 
 * app.listen(3001);
 * ```
 * 
 * 部署选项：
 * 1. 火山引擎函数计算（FC）- 无服务器，按需付费
 * 2. 火山引擎云服务器（ECS）- 长期运行
 * 3. 自建服务器 + Nginx反向代理
 */
