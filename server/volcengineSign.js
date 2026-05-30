/**
 * 火山引擎 OpenAPI 签名工具 (Signature V4)
 * 纯 JS 实现，供后端使用
 * 逻辑与前端 src/utils/volcengineSign.ts 完全一致
 */

const { sha256 } = require('js-sha256');

function hexHash(data) {
  return sha256(data);
}

function hmacSha256(key, data) {
  return sha256.hmac.array(key, data);
}

function bytesToHex(bytes) {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function encodeURIComponentRFC3986(str) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * 为火山引擎 OpenAPI 请求计算签名
 * @param {Object} params
 */
function signVolcengineRequest(params) {
  const { method, uri, query, body, headers, ak, sk, region, service } = params;

  const now = new Date();
  const xDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const shortDate = xDate.slice(0, 8);

  // 1. Canonical URI
  const canonicalUri = uri || '/';

  // 2. Canonical Query String
  const sortedQueryKeys = Object.keys(query).sort();
  const canonicalQueryString = sortedQueryKeys
    .map(k => `${encodeURIComponentRFC3986(k)}=${encodeURIComponentRFC3986(query[k])}`)
    .join('&');

  // 3. Canonical Headers
  const signedHeadersMap = {
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

  // 4. Signed Headers
  const signedHeaders = Object.keys(signedHeadersMap)
    .sort((a, b) => a.localeCompare(b))
    .join(';');

  // 5. Hashed Payload
  const hashedPayload = hexHash(body);

  // Canonical Request
  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join('\n');

  // String to Sign
  const algorithm = 'HMAC-SHA256';
  const credentialScope = `${shortDate}/${region}/${service}/request`;
  const stringToSign = [
    algorithm,
    xDate,
    credentialScope,
    hexHash(canonicalRequest),
  ].join('\n');

  // 计算签名
  const dateKey = hmacSha256('VOLC' + sk, shortDate);
  const dateRegionKey = hmacSha256(dateKey, region);
  const dateRegionServiceKey = hmacSha256(dateRegionKey, service);
  const signingKey = hmacSha256(dateRegionServiceKey, 'request');
  const signature = bytesToHex(hmacSha256(signingKey, stringToSign));

  // Authorization
  const authorization = `${algorithm} Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'X-Date': xDate,
    'Authorization': authorization,
  };
}

module.exports = { signVolcengineRequest };
