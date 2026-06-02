/**
 * 火山引擎 TOS (对象存储) 服务封装
 * 负责图片上传、预签名URL生成、删除
 */

const { TOS } = require('@volcengine/tos-sdk');

// TOS 配置
const TOS_REGION = process.env.TOS_REGION || 'cn-beijing';
const TOS_ENDPOINT = process.env.TOS_ENDPOINT || `tos-${TOS_REGION}.volces.com`;
const TOS_BUCKET = process.env.TOS_BUCKET || '';
const VOLC_AK = process.env.VOLC_AK || '';
const VOLC_SK = process.env.VOLC_SK || '';

let client = null;

function getClient() {
  if (!client) {
    if (!VOLC_AK || !VOLC_SK || !TOS_BUCKET) {
      throw new Error('TOS not configured: missing VOLC_AK, VOLC_SK or TOS_BUCKET');
    }
    client = new TOS({
      accessKeyId: VOLC_AK,
      accessKeySecret: VOLC_SK,
      region: TOS_REGION,
      endpoint: TOS_ENDPOINT,
      secure: true,
    });
  }
  return client;
}

/**
 * 上传图片到 TOS
 * @param {string} objectKey - 对象键，如 records/2024/01/abc123.jpg
 * @param {Buffer} buffer - 图片二进制数据
 * @param {string} contentType - MIME 类型
 * @returns {Promise<{ objectKey: string, etag: string }>}
 */
async function uploadImage(objectKey, buffer, contentType = 'image/jpeg') {
  const tos = getClient();
  const res = await tos.putObject({
    bucket: TOS_BUCKET,
    key: objectKey,
    body: buffer,
    contentType,
    // 服务端加密
    serverSideEncryption: 'AES256',
  });
  return {
    objectKey,
    etag: res['x-tos-version-id'] || res['x-tos-hash-crc64ecma'] || '',
  };
}

/**
 * 生成预签名 URL（用于前端查看原图）
 * @param {string} objectKey
 * @param {number} expires - 有效期秒数，默认 3600
 * @returns {string} 预签名 URL
 */
function getPresignedUrl(objectKey, expires = 3600) {
  const tos = getClient();
  return tos.getPreSignedUrl({
    bucket: TOS_BUCKET,
    key: objectKey,
    method: 'GET',
    expires,
  });
}

/**
 * 删除 TOS 对象
 * @param {string} objectKey
 */
async function deleteImage(objectKey) {
  const tos = getClient();
  await tos.deleteObject({
    bucket: TOS_BUCKET,
    key: objectKey,
  });
}

/**
 * 检查 TOS 是否已配置
 */
function isConfigured() {
  return !!(VOLC_AK && VOLC_SK && TOS_BUCKET);
}

module.exports = {
  uploadImage,
  getPresignedUrl,
  deleteImage,
  isConfigured,
};
