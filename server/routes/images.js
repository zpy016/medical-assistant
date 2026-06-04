/**
 * 图片存储路由（本地磁盘版）
 * POST /api/images/upload    - 上传图片到本地磁盘
 * POST /api/images/presign   - 生成带签名的临时访问 URL
 * GET  /api/images/access/:key?expires=&sign= - 验证签名并返回图片
 * DELETE /api/images/:key    - 删除本地图片
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const { uploadImage, getPresignedUrl, verifyAccessSign, deleteImage, getFileInfo } = require('../services/tos');
const { logImageAccess } = require('../database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
}

/**
 * POST /api/images/upload
 */
router.post('/upload', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const userId = req.userId;
    const file = req.file;
    const objectKey = `u_${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname) || '.jpg'}`;

    await uploadImage(objectKey, file.buffer, file.mimetype);

    logImageAccess({
      userId,
      action: 'upload',
      objectKey,
      ip: getClientIp(req),
    });

    res.json({
      success: true,
      objectKey,
      size: file.buffer.length,
      contentType: file.mimetype,
    });
  } catch (error) {
    console.error('[Images Upload] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/images/presign
 * 为 objectKey 生成带签名的临时访问 URL
 */
router.post('/presign', authMiddleware, async (req, res) => {
  try {
    const { objectKey, expires } = req.body;
    if (!objectKey) {
      return res.status(400).json({ error: 'objectKey is required' });
    }

    const url = getPresignedUrl(objectKey, expires || 3600);

    logImageAccess({
      userId: req.userId,
      action: 'presign',
      objectKey,
      ip: getClientIp(req),
    });

    res.json({ success: true, url, expires: expires || 3600 });
  } catch (error) {
    console.error('[Images Presign] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/images/access/:key
 * 验证签名并返回图片流（供 img 标签直接访问）
 */
router.get('/access/:key', (req, res) => {
  try {
    const objectKey = decodeURIComponent(req.params.key);
    const { expires, sign } = req.query;

    if (!expires || !sign) {
      return res.status(403).json({ error: 'Missing signature' });
    }

    if (!verifyAccessSign(objectKey, expires, sign)) {
      return res.status(403).json({ error: 'Invalid or expired signature' });
    }

    const fileInfo = getFileInfo(objectKey);
    if (!fileInfo) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.setHeader('Content-Type', fileInfo.contentType);
    res.setHeader('Content-Length', fileInfo.size);
    res.setHeader('Cache-Control', 'private, max-age=300');
    fs.createReadStream(fileInfo.path).pipe(res);
  } catch (error) {
    console.error('[Images Access] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/images/:key
 */
router.delete('/:key', authMiddleware, async (req, res) => {
  try {
    const objectKey = decodeURIComponent(req.params.key);
    await deleteImage(objectKey);

    logImageAccess({
      userId: req.userId,
      action: 'delete',
      objectKey,
      ip: getClientIp(req),
    });

    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    console.error('[Images Delete] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
