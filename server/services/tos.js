/**
 * 图片本地存储服务（替代 TOS）
 * 图片存储在服务器本地磁盘，通过带签名的临时 URL 访问
 * 未来可平滑迁移到 TOS：只需替换此文件，保持接口不变
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IMAGE_DIR = process.env.IMAGE_STORAGE_PATH || '/opt/medical-server/images';
const URL_SECRET = process.env.JWT_SECRET || 'medical-assistant-secret-key';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateFileKey(userId, originalName) {
  const ext = path.extname(originalName) || '.jpg';
  return `u_${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
}

function getFilePath(objectKey) {
  return path.join(IMAGE_DIR, objectKey);
}

/**
 * 上传图片到本地磁盘
 */
async function uploadImage(objectKey, buffer, contentType = 'image/jpeg') {
  const filePath = getFilePath(objectKey);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, buffer);
  return { objectKey, etag: '' };
}

/**
 * 生成带签名的临时访问 URL（替代 TOS 预签名 URL）
 * @param {string} objectKey
 * @param {number} expires - 有效期秒数
 * @returns {string} 带签名的本地访问 URL
 */
function getPresignedUrl(objectKey, expires = 3600) {
  const expiresAt = Math.floor(Date.now() / 1000) + expires;
  const sign = crypto
    .createHmac('sha256', URL_SECRET)
    .update(`${objectKey}:${expiresAt}`)
    .digest('hex');
  return `/api/images/access/${encodeURIComponent(objectKey)}?expires=${expiresAt}&sign=${sign}`;
}

/**
 * 验证访问签名
 */
function verifyAccessSign(objectKey, expires, sign) {
  const now = Math.floor(Date.now() / 1000);
  if (now > parseInt(expires, 10)) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', URL_SECRET)
    .update(`${objectKey}:${expires}`)
    .digest('hex');
  return sign === expected;
}

/**
 * 删除本地图片
 */
async function deleteImage(objectKey) {
  const filePath = getFilePath(objectKey);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * 检查文件是否存在
 */
function exists(objectKey) {
  return fs.existsSync(getFilePath(objectKey));
}

/**
 * 获取文件信息
 */
function getFileInfo(objectKey) {
  const filePath = getFilePath(objectKey);
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  const ext = path.extname(objectKey).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
  };
  return {
    path: filePath,
    size: stat.size,
    contentType: mimeMap[ext] || 'application/octet-stream',
  };
}

/**
 * 始终可用（本地磁盘）
 */
function isConfigured() {
  return true;
}

module.exports = {
  uploadImage,
  getPresignedUrl,
  verifyAccessSign,
  deleteImage,
  exists,
  getFileInfo,
  isConfigured,
  IMAGE_DIR,
};
