/**
 * 用户认证路由
 * POST /api/auth/register
 * POST /api/auth/login
 * GET /api/auth/me
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { createUser, findUserByPhone, findUserById } = require('../database');

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
    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
