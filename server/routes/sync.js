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
    const { patients, records, visitEvents, familyMembers, medications, medicationLogs, followUps, vaccinations } = req.body;

    const db = require('../database').db;

    db.transaction(() => {
      // 清空旧数据
      db.prepare('DELETE FROM patients WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM records WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM visit_events WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM family_members WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM medications WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM medication_logs WHERE patient_id IN (SELECT id FROM patients WHERE user_id = ?)').run(userId);
      db.prepare('DELETE FROM follow_up_reminders WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM vaccination_records WHERE patient_id IN (SELECT id FROM patients WHERE user_id = ?)').run(userId);

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

      // 插入用药提醒
      if (medications && Array.isArray(medications)) {
        const stmt = db.prepare(`
          INSERT INTO medications (id, user_id, patient_id, name, specification, dosage, frequency, times, start_date, end_date, route, notes, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const m of medications) {
          stmt.run(m.id, userId, m.patientId, m.name, m.specification || null, m.dosage || null,
            m.frequency, JSON.stringify(m.times), m.startDate, m.endDate || null,
            m.route || null, m.notes || null, m.isActive ? 1 : 0, m.createdAt, m.updatedAt);
        }
      }

      // 插入服药打卡
      if (medicationLogs && Array.isArray(medicationLogs)) {
        const stmt = db.prepare(`
          INSERT INTO medication_logs (id, medication_id, patient_id, scheduled_time, taken_at, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const l of medicationLogs) {
          stmt.run(l.id, l.medicationId, l.patientId, l.scheduledTime, l.takenAt || null, l.status, l.notes || null);
        }
      }

      // 插入复查提醒
      if (followUps && Array.isArray(followUps)) {
        const stmt = db.prepare(`
          INSERT INTO follow_up_reminders (id, user_id, patient_id, record_id, test_item_name, abnormal_value, reference_range, abnormal_direction, follow_up_date, reminder_days, is_completed, completed_at, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const f of followUps) {
          stmt.run(f.id, userId, f.patientId, f.recordId, f.testItemName, f.abnormalValue, f.referenceRange,
            f.abnormalDirection, f.followUpDate, f.reminderDays, f.isCompleted ? 1 : 0,
            f.completedAt || null, f.notes || null, f.createdAt);
        }
      }

      // 插入疫苗记录
      if (vaccinations && Array.isArray(vaccinations)) {
        const stmt = db.prepare(`
          INSERT INTO vaccination_records (id, patient_id, vaccine_id, vaccine_name, dose_number, scheduled_date, actual_date, status, vaccination_site, batch_number, manufacturer, reaction, image_url, category, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const v of vaccinations) {
          stmt.run(v.id, v.patientId, v.vaccineId, v.vaccineName, v.doseNumber, v.scheduledDate,
            v.actualDate || null, v.status, v.vaccinationSite || null, v.batchNumber || null,
            v.manufacturer || null, v.reaction || null, v.imageUrl || null, v.category, v.createdAt, v.updatedAt);
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
        medications: data.medications,
        medicationLogs: data.medicationLogs,
        followUps: data.followUps,
        vaccinations: data.vaccinations,
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
    const medicationCount = db.prepare('SELECT COUNT(*) as c FROM medications WHERE user_id = ?').get(userId).c;
    const followUpCount = db.prepare('SELECT COUNT(*) as c FROM follow_up_reminders WHERE user_id = ?').get(userId).c;

    res.json({
      success: true,
      cloudData: {
        patients: patientCount,
        records: recordCount,
        visitEvents: visitEventCount,
        medications: medicationCount,
        followUps: followUpCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
