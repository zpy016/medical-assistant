/**
 * 用户认证路由
 * POST /api/auth/register
 * POST /api/auth/login
 * GET /api/auth/me
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { createUser, findUserByPhone, findUserById, updateUserLastActive, updateUserDeletedAt, updateUserStatus, exportUserData, recordUserActivity, findResetKeyByCode, updateResetKeyUsed, updateUserPassword } = require('../database');

const router = express.Router();
const SALT_ROUNDS = 10;

// 注册
router.post('/register', async (req, res) => {
  try {
    const { phone, password, name } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // 检查用户是否已存在
    const existing = findUserByPhone(phone);
    if (existing) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = `user_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;

    createUser(userId, phone, passwordHash, name);
    const token = generateToken(userId);

    res.status(201).json({
      token,
      user: { id: userId, phone, name: name || null },
    });
  } catch (error) {
    console.error('[Auth] Register error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const user = findUserByPhone(phone);
    if (!user) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: { id: user.id, phone: user.phone, name: user.name },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = findUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // 检查账户状态
    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Account disabled' });
    }
    if (user.status === 'pending_deletion') {
      return res.status(403).json({ error: 'Account pending deletion' });
    }

    // 更新最后活跃时间
    updateUserLastActive(req.userId);
    recordUserActivity(req.userId, 'login');

    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 注销账号（申请删除，进入7天宽限期）
router.delete('/account', authMiddleware, (req, res) => {
  try {
    const user = findUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    updateUserDeletedAt(req.userId, Date.now());
    recordUserActivity(req.userId, 'account_deletion_requested');

    res.json({
      success: true,
      message: 'Account deletion requested. You have 7 days to cancel. After 7 days, all data will be permanently deleted.',
      gracePeriodEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[Auth Delete] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 取消注销
router.post('/account/cancel-delete', authMiddleware, (req, res) => {
  try {
    const user = findUserById(req.userId);
    if (!user || user.status !== 'pending_deletion') {
      return res.status(400).json({ error: 'No pending deletion found' });
    }

    updateUserDeletedAt(req.userId, null);
    recordUserActivity(req.userId, 'account_deletion_cancelled');

    res.json({ success: true, message: 'Account deletion cancelled. Your account is active again.' });
  } catch (error) {
    console.error('[Auth CancelDelete] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 导出全部数据（JSON）
router.get('/export', authMiddleware, (req, res) => {
  try {
    const data = exportUserData(req.userId);
    recordUserActivity(req.userId, 'data_export');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="medical-export-${req.userId}-${Date.now()}.json"`);
    res.json({
      success: true,
      exportDate: new Date().toISOString(),
      data,
    });
  } catch (error) {
    console.error('[Auth Export] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 导出全部数据（CSV - 仅病历摘要）
router.get('/export/csv', authMiddleware, (req, res) => {
  try {
    const { records, patients } = exportUserData(req.userId);
    recordUserActivity(req.userId, 'data_export_csv');

    // 生成 CSV
    const headers = ['日期', '医院', '科室', '类型', '诊断', '患者'];
    const rows = records.map(r => {
      const patient = patients.find((p) => p.id === r.patientId);
      const sd = r.structuredData || {};
      return [
        sd.visitDate || r.createdAt || '',
        sd.hospital || '',
        sd.department || '',
        r.documentType || '',
        (sd.diagnosis || []).join('、'),
        patient?.name || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="medical-records-${req.userId}-${Date.now()}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel
  } catch (error) {
    console.error('[Auth ExportCSV] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 验证重置密钥
router.post('/verify-reset-key', (req, res) => {
  try {
    const { keyCode } = req.body;
    if (!keyCode) {
      return res.status(400).json({ error: 'Key code is required' });
    }

    const key = findResetKeyByCode(keyCode);
    if (!key) {
      return res.status(404).json({ error: 'Invalid key code' });
    }
    if (key.status !== 'active') {
      return res.status(400).json({ error: `Key is ${key.status}` });
    }
    if (key.expires_at && Date.now() > key.expires_at) {
      return res.status(400).json({ error: 'Key has expired' });
    }

    res.json({ success: true, valid: true });
  } catch (error) {
    console.error('[Auth VerifyKey] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 用密钥重置密码
router.post('/reset-password', async (req, res) => {
  try {
    const { keyCode, newPassword } = req.body;
    if (!keyCode || !newPassword) {
      return res.status(400).json({ error: 'Key code and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const key = findResetKeyByCode(keyCode);
    if (!key || key.status !== 'active') {
      return res.status(400).json({ error: 'Invalid or used key code' });
    }
    if (key.expires_at && Date.now() > key.expires_at) {
      return res.status(400).json({ error: 'Key has expired' });
    }

    // 如果密钥绑定了特定用户
    let targetUserId = key.user_id;
    if (!targetUserId) {
      // 通用密钥：需要用户先登录或提供手机号
      return res.status(400).json({ error: 'Please provide your phone number with a generic key' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    updateUserPassword(targetUserId, passwordHash);
    // 密钥可复用，不标记为 used
    // updateResetKeyUsed(key.id, targetUserId, Date.now());

    res.json({ success: true, message: 'Password reset successfully. Please login with your new password.' });
  } catch (error) {
    console.error('[Auth ResetPassword] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 已登录用户修改密码
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = findUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Old password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    updateUserPassword(req.userId, passwordHash);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('[Auth ChangePassword] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
