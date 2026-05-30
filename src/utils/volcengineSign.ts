/**
 * ============================================
 * 火山引擎 OpenAPI 签名工具 (Signature V4)
 * 使用 js-sha256 进行 HMAC-SHA256 计算
 * ============================================
 */

import { sha256 } from 'js-sha256';

/** 计算 SHA256 哈希 */
function hexHash(data: string): string {
  return sha256(data);
}

/** HMAC-SHA256 计算，返回 number[] */
function hmacSha256(key: string | number[], data: string): number[] {
  return sha256.hmac.array(key, data);
}

/** number[] 转十六进制字符串 */
function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** URL 编码（遵循 RFC 3986） */
function encodeURIComponentRFC3986(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export interface SignParams {
  method: string;
  uri: string;
  query: Record<string, string>;
  body: string;
  headers: Record<string, string>;
  ak: string;
  sk: string;
  region: string;
  service: string;
}

/**
 * 为火山引擎 OpenAPI 请求计算签名
 *
 * 参考文档：https://www.volcengine.com/docs/6369/67269
 */
export function signVolcengineRequest(params: SignParams): Record<string, string> {
  const { method, uri, query, body, headers, ak, sk, region, service } = params;

  const now = new Date();
  // UTC 时间格式: YYYYMMDD'T'HHMMSS'Z'
  const xDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const shortDate = xDate.slice(0, 8);

  // ========== 1. 构建 Canonical Request ==========

  // 1.1 Canonical URI
  const canonicalUri = uri || '/';

  // 1.2 Canonical Query String — 按 key 排序，URL 编码
  const sortedQueryKeys = Object.keys(query).sort();
  const canonicalQueryString = sortedQueryKeys
    .map(k => `${encodeURIComponentRFC3986(k)}=${encodeURIComponentRFC3986(query[k])}`)
    .join('&');

  // 1.3 Canonical Headers — 小写 name，trim value，按 name 排序
  const signedHeadersMap: Record<string, string> = {
    host: headers['host'] || 'visual.volcengineapi.com',
    'x-date': xDate,
  };
  if (headers['content-type']) {
    signedHeadersMap['content-type'] = headers['content-type'];
  }

  const canonicalHeaders = Object.entries(signedHeadersMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v.trim()}`)
    .join('\n') + '\n';

  // 1.4 Signed Headers
  const signedHeaders = Object.keys(signedHeadersMap)
    .sort((a, b) => a.localeCompare(b))
    .join(';');

  // 1.5 Hashed Payload
  const hashedPayload = hexHash(body);

  // 组装 Canonical Request
  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join('\n');

  // ========== 2. 构建 String to Sign ==========
  const algorithm = 'HMAC-SHA256';
  const credentialScope = `${shortDate}/${region}/${service}/request`;
  const stringToSign = [
    algorithm,
    xDate,
    credentialScope,
    hexHash(canonicalRequest),
  ].join('\n');

  // ========== 3. 计算签名 ==========
  // kDate = HMAC("VOLC" + SecretKey, Date)
  const dateKey = hmacSha256('VOLC' + sk, shortDate);
  // kRegion = HMAC(kDate, Region)
  const dateRegionKey = hmacSha256(dateKey, region);
  // kService = HMAC(kRegion, Service)
  const dateRegionServiceKey = hmacSha256(dateRegionKey, service);
  // kSigning = HMAC(kService, "request")
  const signingKey = hmacSha256(dateRegionServiceKey, 'request');
  // Signature = HexEncode(HMAC(kSigning, StringToSign))
  const signature = bytesToHex(hmacSha256(signingKey, stringToSign));

  // ========== 4. 构建 Authorization Header ==========
  const authorization = `${algorithm} Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'X-Date': xDate,
    'Authorization': authorization,
  };
}
