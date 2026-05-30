/**
 * ============================================
 * OCR 服务层
 * 通过后端代理调用火山引擎 OCR，支持降级到模拟 OCR
 * ============================================
 */

import type { OCRResult, OCRTextBlock } from '../types';
import { detectDocumentType, extractStructuredData } from '../utils/ocrParser';
import { mockOCRProcess } from './mockOCR';
import { compressImage } from '../utils/helpers';

// ==================== 工具函数 ====================

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

function parseVolcengineResponse(
  response: VolcengineOCRResponse,
  imgWidth: number,
  imgHeight: number
): OCRResult {
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

// ==================== 后端 OCR 调用 ====================

/**
 * 调用后端 OCR 代理服务
 */
async function callBackendOCR(file: File): Promise<OCRResult> {
  // 获取图片尺寸（用于 bbox 归一化）
  const { width, height } = await getImageDimensions(file);

  // 压缩图片
  const compressedBlob = await compressImage(file, 1920, 0.8);
  const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });

  // 构建 FormData
  const formData = new FormData();
  formData.append('image', compressedFile);

  // 调用后端 API（通过 Nginx 反向代理）
  const response = await fetch('/api/ocr', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Backend OCR error: ${response.status} ${text}`);
  }

  const result = await response.json() as VolcengineOCRResponse;

  // 检查 API 返回的业务错误
  if (result.ResponseMetadata?.Error) {
    const err = result.ResponseMetadata.Error;
    throw new Error(`[${err.Code}] ${err.Message}`);
  }

  return parseVolcengineResponse(result, width, height);
}

// ==================== 主 OCR 处理流程 ====================

export interface OCROptions {
  useMock?: boolean;
  forceMock?: boolean;
}

/**
 * 执行 OCR 识别
 * 优先调用后端代理，失败则降级到模拟 OCR
 */
export async function performOCR(file: File, options: OCROptions = {}): Promise<OCRResult> {
  const startTime = Date.now();

  // 强制使用模拟模式
  if (options.forceMock || options.useMock) {
    return mockOCRProcess(file, startTime);
  }

  try {
    console.log('[OCR] Calling backend API...');
    const result = await callBackendOCR(file);
    result.processingTime = Date.now() - startTime;
    console.log(
      `[OCR] Success: ${result.textBlocks.length} texts, confidence ${result.confidence}, time ${result.processingTime}ms`
    );
    return result;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn('[OCR] Backend failed, falling back to mock OCR:', errMsg);
    return mockOCRProcess(file, startTime);
  }
}

/**
 * 从 OCR 结果生成结构化数据
 */
export function parseOCRResult(ocrResult: OCRResult) {
  const documentType = ocrResult.documentType ?? detectDocumentType(ocrResult.fullText);
  const structuredData = extractStructuredData(ocrResult);
  return { documentType, structuredData };
}

/**
 * 检查后端 OCR 是否可用
 * （后端代理模式下始终返回 true，实际可用性由请求结果决定）
 */
export function hasRealOCRConfig(): boolean {
  return true;
}
