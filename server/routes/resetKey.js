/**
 * 管理员重置密钥管理路由
 * POST /api/admin/reset-keys     — 创建密钥
 * GET  /api/admin/reset-keys     — 查看所有密钥
 * DELETE /api/admin/reset-keys/:id — 删除/撤销密钥
 */

const express = require('express');
const { adminMiddleware } = require('../middleware/adminAuth');
const {
  createResetKey,
  listResetKeys,
  revokeResetKey,
  deleteResetKey,
} = require('../database');

const router = express.Router();

// 生成随机密钥码 RESET-XXXXXX
function generateKeyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RESET-${code}`;
}

// ==================== 创建密钥 ====================

router.post('/', adminMiddleware, (req, res) => {
  try {
    const { userId, expiresInHours } = req.body;
    const keyCode = generateKeyCode();
    const now = Date.now();
    const expiresAt = expiresInHours ? now + expiresInHours * 3600 * 1000 : null;

    createResetKey({
      id: `rk_${now.toString(36)}_${Math.random().toString(36).substr(2, 5)}`,
      keyCode,
      userId: userId || null,
      createdBy: req.userId,
      createdAt: now,
      expiresAt,
    });

    res.status(201).json({
      success: true,
      data: { keyCode, expiresAt: expiresAt || null },
    });
  } catch (error) {
    console.error('[ResetKey Create] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 查看所有密钥 ====================

router.get('/', adminMiddleware, (req, res) => {
  try {
    const keys = listResetKeys();
    res.json({ success: true, data: keys });
  } catch (error) {
    console.error('[ResetKey List] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 撤销/删除密钥 ====================

router.delete('/:id', adminMiddleware, (req, res) => {
  try {
    deleteResetKey(req.params.id);
    res.json({ success: true, message: 'Key deleted' });
  } catch (error) {
    console.error('[ResetKey Delete] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
