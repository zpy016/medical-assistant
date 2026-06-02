/**
 * 图片存储路由
 * POST /api/images/upload    - 上传图片到 TOS
 * POST /api/images/presign   - 生成预签名 URL
 * DELETE /api/images/:key    - 删除 TOS 对象
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { uploadImage, getPresignedUrl, deleteImage, isConfigured } = require('../services/tos');
const { logImageAccess } = require('../database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 获取客户端 IP
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
}

/**
 * POST /api/images/upload
 * 上传图片到 TOS，返回 objectKey
 */
router.post('/upload', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: 'TOS not configured' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const userId = req.userId;
    const file = req.file;
    const ext = path.extname(file.originalname) || '.jpg';
    const objectKey = `records/${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;

    const result = await uploadImage(objectKey, file.buffer, file.mimetype);

    // 审计日志
    logImageAccess({
      userId,
      action: 'upload',
      objectKey: result.objectKey,
      ip: getClientIp(req),
    });

    res.json({
      success: true,
      objectKey: result.objectKey,
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
 * 为 objectKey 生成预签名 URL
 */
router.post('/presign', authMiddleware, async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: 'TOS not configured' });
    }

    const { objectKey, expires } = req.body;
    if (!objectKey) {
      return res.status(400).json({ error: 'objectKey is required' });
    }

    const url = getPresignedUrl(objectKey, expires || 3600);

    // 审计日志
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
 * DELETE /api/images/:key
 * 删除 TOS 对象
 */
router.delete('/:key', authMiddleware, async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: 'TOS not configured' });
    }

    const objectKey = decodeURIComponent(req.params.key);
    await deleteImage(objectKey);

    // 审计日志
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
