/**
 * 数据同步路由
 * POST /api/sync/upload   — 上传本地数据到云端
 * GET  /api/sync/download — 下载云端数据到本地
 * POST /api/sync/merge    — 合并本地和云端数据
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  createPatient, getPatientsByUser, updatePatientDefault,
  createRecord, getRecordsByUser, deleteRecord,
  createVisitEvent, getVisitEventsByUser,
  createFamilyMember, getFamilyMembersByUser, deleteFamilyMember,
} = require('../database');

const router = express.Router();

// 上传本地数据到云端（全量覆盖）
router.post('/upload', authMiddleware, (req, res) => {
  try {
    const userId = req.userId;
    const { patients, records, visitEvents, familyMembers } = req.body;

    // 简单策略：先删除旧数据，再插入新数据
    // 注意：生产环境应该用更精细的合并策略
    const db = require('../database').db;

    db.transaction(() => {
      // 清空旧数据
      db.prepare('DELETE FROM patients WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM records WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM visit_events WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM family_members WHERE user_id = ?').run(userId);

      // 插入患者
      if (patients && Array.isArray(patients)) {
        for (const p of patients) {
          createPatient({ ...p, userId });
        }
      }

      // 插入记录
      if (records && Array.isArray(records)) {
        for (const r of records) {
          createRecord({ ...r, userId });
        }
      }

      // 插入就诊事件
      if (visitEvents && Array.isArray(visitEvents)) {
        for (const e of visitEvents) {
          createVisitEvent({ ...e, userId });
        }
      }

      // 插入家庭成员
      if (familyMembers && Array.isArray(familyMembers)) {
        for (const m of familyMembers) {
          createFamilyMember({ ...m, userId });
        }
      }
    })();

    res.json({ success: true, message: 'Data uploaded successfully' });
  } catch (error) {
    console.error('[Sync] Upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 下载云端数据
router.get('/download', authMiddleware, (req, res) => {
  try {
    const userId = req.userId;
    const data = require('../database').exportUserData(userId);

    res.json({
      success: true,
      data: {
        patients: data.patients,
        records: data.records,
        visitEvents: data.visitEvents,
        familyMembers: data.familyMembers,
        downloadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Sync] Download error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 检查数据同步状态（返回云端记录数）
router.get('/status', authMiddleware, (req, res) => {
  try {
    const userId = req.userId;
    const db = require('../database').db;

    const patientCount = db.prepare('SELECT COUNT(*) as c FROM patients WHERE user_id = ?').get(userId).c;
    const recordCount = db.prepare('SELECT COUNT(*) as c FROM records WHERE user_id = ?').get(userId).c;
    const visitEventCount = db.prepare('SELECT COUNT(*) as c FROM visit_events WHERE user_id = ?').get(userId).c;

    res.json({
      success: true,
      cloudData: {
        patients: patientCount,
        records: recordCount,
        visitEvents: visitEventCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
