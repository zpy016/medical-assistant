/**
 * 家人共享路由（跨用户共享）
 * 支持邀请/接受/拒绝/取消流程
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  createFamilyMember,
  getFamilyMembersByUser,
  getFamilyMembersByInvitedUser,
  updateFamilyMemberStatus,
  deleteFamilyMember,
  findUserById,
  findUserByPhone,
  getSharedPatientData,
  getFamilyMembersByInvitedUserWithDetails,
  getAcceptedFamilyMembersByInvitedUser,
} = require('../database');

const router = express.Router();

// ==================== 发送邀请 ====================

router.post('/invite', authMiddleware, (req, res) => {
  try {
    const { invitedUserId, phone, patientId, relation, permission } = req.body;
    if (!patientId || !relation) {
      return res.status(400).json({ error: 'patientId and relation are required' });
    }
    if (!invitedUserId && !phone) {
      return res.status(400).json({ error: 'invitedUserId or phone is required' });
    }

    // 通过手机号查找用户
    let targetUserId = invitedUserId;
    if (!targetUserId && phone) {
      const user = findUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: 'User with this phone number not found. Please ask them to register first.' });
      }
      targetUserId = user.id;
    }

    // 不能邀请自己
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot invite yourself' });
    }

    // 检查被邀请用户是否存在
    const invitedUser = findUserById(targetUserId);
    if (!invitedUser) {
      return res.status(404).json({ error: 'Invited user not found' });
    }

    const memberId = `fm_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
    createFamilyMember({
      id: memberId,
      userId: req.userId,
      invitedUserId: targetUserId,
      patientId,
      relation,
      permission: permission || 'view',
      status: 'pending',
      invitedAt: Date.now(),
    });

    res.status(201).json({
      success: true,
      data: { id: memberId, invitedUserId: targetUserId, patientId, relation, status: 'pending' },
    });
  } catch (error) {
    console.error('[Family Invite] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 我发出的邀请 ====================

router.get('/sent', authMiddleware, (req, res) => {
  try {
    const members = getFamilyMembersByUser(req.userId);
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('[Family Sent] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 我收到的邀请 ====================

router.get('/received', authMiddleware, (req, res) => {
  try {
    const members = getFamilyMembersByInvitedUserWithDetails(req.userId);
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('[Family Received] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 接受邀请 ====================

router.post('/accept/:id', authMiddleware, (req, res) => {
  try {
    // 校验：被邀请者是否为自己
    const members = getFamilyMembersByInvitedUser(req.userId);
    const member = members.find(m => m.id === req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    updateFamilyMemberStatus(req.params.id, 'accepted', Date.now());
    res.json({ success: true, message: 'Invitation accepted' });
  } catch (error) {
    console.error('[Family Accept] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 拒绝邀请 ====================

router.post('/reject/:id', authMiddleware, (req, res) => {
  try {
    const members = getFamilyMembersByInvitedUser(req.userId);
    const member = members.find(m => m.id === req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    updateFamilyMemberStatus(req.params.id, 'rejected', Date.now());
    res.json({ success: true, message: 'Invitation rejected' });
  } catch (error) {
    console.error('[Family Reject] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 取消/删除邀请 ====================

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const success = deleteFamilyMember(req.params.id, req.userId);
    if (!success) {
      return res.status(404).json({ error: 'Family member not found or no permission' });
    }
    res.json({ success: true, message: 'Family member removed' });
  } catch (error) {
    console.error('[Family Delete] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 获取共享给我的患者列表 ====================

router.get('/shared-patients', authMiddleware, (req, res) => {
  try {
    const members = getAcceptedFamilyMembersByInvitedUser(req.userId);
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('[Family SharedPatients] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 获取特定共享患者的完整数据 ====================

router.get('/shared-data/:patientId', authMiddleware, (req, res) => {
  try {
    const data = getSharedPatientData(req.userId, req.params.patientId);
    if (!data) {
      return res.status(403).json({ error: 'No access to this patient data' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('[Family SharedData] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
