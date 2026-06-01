/**
 * 管理员权限中间件
 * 在 authMiddleware 基础上增加角色校验
 */

const { authMiddleware } = require('./auth');
const { findUserById } = require('../database');

function adminMiddleware(req, res, next) {
  // 先走普通JWT认证
  authMiddleware(req, res, (err) => {
    if (err) return next(err);

    const user = findUserById(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }

    req.userRole = user.role;
    next();
  });
}

module.exports = { adminMiddleware };
