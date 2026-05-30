/**
 * ============================================
 * OCR 服务层
 * 封装火山引擎 OCR API 调用，支持真实 API + 模拟 OCR 降级
 * ============================================
 */

import type { OCRResult, OCRTextBlock } from '../types';
import { detectDocumentType, extractStructuredData } from '../utils/ocrParser';
import { mockOCRProcess } from './mockOCR';
import { fileToBase64, compressImage } from '../utils/helpers';
import { signVolcengineRequest } from '../utils/volcengineSign';

// ==================== 配置 ====================

/** 从环境变量或 localStorage 获取配置 */
function getOCRConfig() {
  // 优先从构建时注入的环境变量读取
  const envAK = import.meta.env.VITE_VOLC_AK;
  const envSK = import.meta.env.VITE_VOLC_SK;
  const envRegion = import.meta.env.VITE_VOLC_REGION || 'cn-north-1';

  if (envAK && envSK) {
    return {
      accessKeyId: envAK,
      secretAccessKey: envSK,
      region: envRegion,
      endpoint: 'https://visual.volcengineapi.com',
    };
  }

  // 兜底：从 localStorage 读取（用户手动配置）
  const saved = localStorage.getItem('ocr_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

/** 保存配置到 localStorage */
export function setOCRConfig(config: { accessKeyId: string; secretAccessKey: string; region?: string }) {
  localStorage.setItem('ocr_config', JSON.stringify({
    ...config,
    region: config.region || 'cn-north-1',
    endpoint: 'https://visual.volcengineapi.com',
  }));
}

// ==================== 火山引擎 OCR API ====================

/** 获取图片尺寸 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 调用火山引擎通用文字识别 (OCRNormal)
 * 文档: https://www.volcengine.com/docs/6790/117777
 */
async function callVolcengineOCR(imageBase64: string, imgWidth: number, imgHeight: number): Promise<OCRResult> {
  const config = getOCRConfig();
  if (!config) {
    throw new Error('OCR 配置未设置');
  }

  const endpoint = config.endpoint || 'https://visual.volcengineapi.com';
  const region = config.region || 'cn-north-1';
  const service = 'visual';

  // 构建请求 body
  const requestBody = JSON.stringify({
    image_base64: imageBase64,
  });

  // 签名参数
  const signHeaders = signVolcengineRequest({
    method: 'POST',
    uri: '/',
    query: {
      Action: 'OCRNormal',
      Version: '2021-08-23',
    },
    body: requestBody,
    headers: {
      'content-type': 'application/json',
      host: 'visual.volcengineapi.com',
    },
    ak: config.accessKeyId,
    sk: config.secretAccessKey,
    region,
    service,
  });

  const url = `${endpoint}/?Action=OCRNormal&Version=2021-08-23`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'visual.volcengineapi.com',
      ...signHeaders,
    },
    body: requestBody,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json() as VolcengineOCRResponse;

  // 检查 API 错误
  if (result.ResponseMetadata?.Error) {
    const err = result.ResponseMetadata.Error;
    throw new Error(`[${err.Code}] ${err.Message}`);
  }

  return parseVolcengineResponse(result, imgWidth, imgHeight);
}

// ==================== 火山引擎响应类型 ====================

interface VolcengineOCRResponse {
  ResponseMetadata?: {
    RequestId: string;
    Action: string;
    Version: string;
    Service: string;
    Region: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
  Result?: {
    texts?: Array<{
      content: string;
      confidence: number;
      location: {
        top: number;
        left: number;
        height: number;
        width: number;
      };
    }>;
  };
}

// ==================== 响应解析 ====================

function parseVolcengineResponse(response: VolcengineOCRResponse, imgWidth: number, imgHeight: number): OCRResult {
  const texts = response.Result?.texts ?? [];

  const textBlocks: OCRTextBlock[] = texts.map(t => {
    const { top, left, height, width } = t.location;
    return {
      text: t.content,
      confidence: t.confidence,
      bbox: [
        Math.max(0, Math.min(1, left / imgWidth)),
        Math.max(0, Math.min(1, top / imgHeight)),
        Math.max(0, Math.min(1, (left + width) / imgWidth)),
        Math.max(0, Math.min(1, (top + height) / imgHeight)),
      ] as [number, number, number, number],
    };
  });

  const fullText = textBlocks.map(b => b.text).join('\n');
  const confidence = textBlocks.length > 0
    ? Math.round((textBlocks.reduce((s, b) => s + b.confidence, 0) / textBlocks.length) * 100) / 100
    : 0;

  return {
    textBlocks,
    fullText,
    tables: [],
    confidence,
    processingTime: 0,
    documentType: detectDocumentType(fullText),
  };
}

// ==================== 主 OCR 处理流程 ====================

export interface OCROptions {
  useMock?: boolean;
  forceMock?: boolean;
}

/**
 * 执行 OCR 识别
 * 优先使用火山引擎真实 API，失败则降级到模拟 OCR
 */
export async function performOCR(file: File, options: OCROptions = {}): Promise<OCRResult> {
  const startTime = Date.now();

  // 强制使用模拟模式
  if (options.forceMock || options.useMock) {
    return mockOCRProcess(file, startTime);
  }

  // 检查是否有真实 OCR 配置
  const config = getOCRConfig();
  if (!config) {
    console.log('[OCR] 未配置火山引擎密钥，使用模拟 OCR');
    return mockOCRProcess(file, startTime);
  }

  try {
    // 1. 压缩图片（控制大小，提高上传速度）
    const compressedBlob = await compressImage(file, 1920, 0.8);
    const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });

    // 2. 获取图片尺寸（用于 bbox 归一化）
    const { width, height } = await getImageDimensions(compressedFile);

    // 3. 转为 base64
    const base64 = await fileToBase64(compressedFile);

    // 4. 调用火山引擎 OCR
    console.log('[OCR] 调用火山引擎 OCR...');
    const result = await callVolcengineOCR(base64, width, height);
    result.processingTime = Date.now() - startTime;

    console.log(`[OCR] 成功，识别 ${result.textBlocks.length} 个文本块，置信度 ${result.confidence}`);
    return result;

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // 区分不同类型的错误
    if (errMsg.includes('CORS') || errMsg.includes('NetworkError')) {
      console.warn('[OCR] CORS/网络错误，降级到模拟 OCR:', errMsg);
    } else if (errMsg.includes('Failed to fetch')) {
      console.warn('[OCR] 请求失败（可能被 CORS 拦截），降级到模拟 OCR');
    } else {
      console.warn('[OCR] 真实 OCR 失败，降级到模拟 OCR:', errMsg);
    }

    return mockOCRProcess(file, startTime);
  }
}

/**
 * 从 OCR 结果生成结构化数据
 */
export function parseOCRResult(ocrResult: OCRResult) {
  const documentType = ocrResult.documentType ?? detectDocumentType(ocrResult.fullText);
  const structuredData = extractStructuredData(ocrResult);

  return {
    documentType,
    structuredData,
  };
}

/** 检查当前是否配置了真实 OCR */
export function hasRealOCRConfig(): boolean {
  return !!getOCRConfig();
}
