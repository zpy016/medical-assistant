/**
 * 超级管理员后台路由
 * P2-06: 用户账户管理 + 运营数据统计
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { adminMiddleware } = require('../middleware/adminAuth');
const { generateToken } = require('../middleware/auth');
const {
  findUserByPhone,
  findUserById,
  listUsers,
  getUserStats,
  getSystemStats,
  getDailyStats,
  getMonthlyNewUsers,
  updateUserStatus,
  updateUserDeletedAt,
  deleteUserAndData,
  createAdminLog,
  getAdminLogs,
  recordUserActivity,
  exportUserData,
} = require('../database');

const router = express.Router();

// ==================== 管理员登录 ====================

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const user = findUserByPhone(phone);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Account disabled' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    recordUserActivity(user.id, 'admin_login');

    res.json({
      token,
      admin: { id: user.id, phone: user.phone, name: user.name },
    });
  } catch (error) {
    console.error('[Admin Login] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 用户管理（受 adminMiddleware 保护）====================

// 用户列表
router.get('/users', adminMiddleware, (req, res) => {
  try {
    const { page = 1, pageSize = 20, search, status, role } = req.query;
    const result = listUsers({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      search,
      status,
      role,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Admin Users] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 用户详情
router.get('/users/:id', adminMiddleware, (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 脱敏：不返回密码哈希
    const { password_hash, ...userInfo } = user;
    const stats = getUserStats(req.params.id);

    res.json({
      success: true,
      data: {
        ...userInfo,
        stats,
      },
    });
  } catch (error) {
    console.error('[Admin UserDetail] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 修改用户状态
router.patch('/users/:id/status', adminMiddleware, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'disabled', 'pending_deletion'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    updateUserStatus(req.params.id, status);

    // 记录管理员操作日志
    createAdminLog({
      adminId: req.userId,
      action: status === 'active' ? 'enable' : status === 'disabled' ? 'disable' : 'mark_delete',
      targetUserId: req.params.id,
      details: JSON.stringify({ previousStatus: user.status, newStatus: status }),
    });

    res.json({ success: true, message: `User status updated to ${status}` });
  } catch (error) {
    console.error('[Admin Status] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 立即删除用户（绕过7天宽限期，用于违规账号）
router.delete('/users/:id', adminMiddleware, (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 记录日志
    createAdminLog({
      adminId: req.userId,
      action: 'force_delete',
      targetUserId: req.params.id,
      details: JSON.stringify({ phone: user.phone, name: user.name }),
    });

    deleteUserAndData(req.params.id);
    res.json({ success: true, message: 'User and all data permanently deleted' });
  } catch (error) {
    console.error('[Admin Delete] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 数据修复授权申请
router.post('/users/:id/repair-request', adminMiddleware, (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    createAdminLog({
      adminId: req.userId,
      action: 'data_repair_request',
      targetUserId: req.params.id,
      details: req.body.reason || 'Data repair requested',
    });

    // TODO: 向用户发送授权申请通知（需接入微信模板消息或短信）
    res.json({
      success: true,
      message: 'Repair request logged. User authorization required before data access.',
    });
  } catch (error) {
    console.error('[Admin Repair] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 运营数据统计 ====================

// 运营概览
router.get('/stats/overview', adminMiddleware, (req, res) => {
  try {
    const stats = getSystemStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Admin Stats] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 日活跃趋势
router.get('/stats/trends', adminMiddleware, (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trends = getDailyStats(days);
    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('[Admin Trends] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 月新增用户
router.get('/stats/new-users', adminMiddleware, (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const data = getMonthlyNewUsers(months);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[Admin NewUsers] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 功能使用率（基于 user_activity 表统计）
router.get('/stats/features', adminMiddleware, (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const db = require('../database').db;
    const rows = db.prepare(`
      SELECT action, COUNT(*) as count
      FROM user_activity
      WHERE date >= date('now', '-${days} days')
      GROUP BY action
      ORDER BY count DESC
    `).all();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Admin Features] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 操作日志 ====================

router.get('/logs', adminMiddleware, (req, res) => {
  try {
    const { page = 1, pageSize = 50, targetUserId } = req.query;
    const logs = getAdminLogs({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      targetUserId,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('[Admin Logs] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
