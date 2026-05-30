/**
 * SQLite 数据库层
 * 使用 better-sqlite3（同步 API，性能更好）
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'medical.db');

// 确保数据目录存在
const fs = require('fs');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');

// ==================== 初始化表结构 ====================

function initDatabase() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
  `);

  // 患者表
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      gender TEXT,
      birth_date TEXT,
      age INTEGER,
      id_card TEXT,
      phone TEXT,
      avatar TEXT,
      is_default INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_patients_user ON patients(user_id);
  `);

  // 医疗记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      original_image TEXT,
      thumbnail TEXT,
      ocr_result TEXT,
      structured_data TEXT,
      document_type TEXT NOT NULL,
      visit_type TEXT,
      status TEXT DEFAULT 'confirmed',
      ai_interpretation TEXT,
      tags TEXT,
      is_starred INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      uploaded_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id);
    CREATE INDEX IF NOT EXISTS idx_records_patient ON records(patient_id);
  `);

  // 就诊事件表
  db.exec(`
    CREATE TABLE IF NOT EXISTS visit_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      date TEXT NOT NULL,
      hospital TEXT,
      department TEXT,
      visit_type TEXT DEFAULT 'outpatient',
      diagnosis TEXT,
      icd10_codes TEXT,
      records TEXT,
      summary TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_visit_events_user ON visit_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_visit_events_patient ON visit_events(patient_id);
  `);

  // 家庭成员表
  db.exec(`
    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      permission TEXT DEFAULT 'view',
      invited_at INTEGER NOT NULL,
      accepted_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
  `);

  // 用药提醒表
  db.exec(`
    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      name TEXT NOT NULL,
      specification TEXT,
      dosage TEXT,
      frequency TEXT NOT NULL,
      times TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      route TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id);
    CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
  `);

  // 服药打卡记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS medication_logs (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      taken_at INTEGER,
      status TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_med_logs_patient ON medication_logs(patient_id);
  `);

  // 复查提醒表
  db.exec(`
    CREATE TABLE IF NOT EXISTS follow_up_reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      record_id TEXT NOT NULL,
      test_item_name TEXT NOT NULL,
      abnormal_value TEXT,
      reference_range TEXT,
      abnormal_direction TEXT,
      follow_up_date TEXT NOT NULL,
      reminder_days INTEGER DEFAULT 3,
      is_completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_followups_user ON follow_up_reminders(user_id);
    CREATE INDEX IF NOT EXISTS idx_followups_patient ON follow_up_reminders(patient_id);
  `);

  // 疫苗接种记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS vaccination_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      vaccine_id TEXT NOT NULL,
      vaccine_name TEXT NOT NULL,
      dose_number INTEGER NOT NULL,
      scheduled_date TEXT NOT NULL,
      actual_date TEXT,
      status TEXT NOT NULL,
      vaccination_site TEXT,
      batch_number TEXT,
      manufacturer TEXT,
      reaction TEXT,
      image_url TEXT,
      category TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vaccines_patient ON vaccination_records(patient_id);
  `);

  console.log('[DB] Database initialized at', DB_PATH);
}

initDatabase();

// ==================== 用户 CRUD ====================

function createUser(id, phone, passwordHash, name) {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO users (id, phone, password_hash, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, phone, passwordHash, name || null, now, now);
  return id;
}

function findUserByPhone(phone) {
  const stmt = db.prepare('SELECT * FROM users WHERE phone = ?');
  return stmt.get(phone) || null;
}

function findUserById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) || null;
}

// ==================== 患者 CRUD ====================

function createPatient(patient) {
  const stmt = db.prepare(`
    INSERT INTO patients (id, user_id, name, gender, birth_date, age, id_card, phone, avatar, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    patient.id, patient.userId, patient.name, patient.gender || null,
    patient.birthDate || null, patient.age || null, patient.idCard || null,
    patient.phone || null, patient.avatar || null,
    patient.isDefault ? 1 : 0, patient.createdAt, patient.updatedAt
  );
  return patient.id;
}

function getPatientsByUser(userId) {
  const stmt = db.prepare('SELECT * FROM patients WHERE user_id = ? ORDER BY created_at');
  return stmt.all(userId).map(row => ({
    ...row,
    isDefault: !!row.is_default,
    birthDate: row.birth_date,
    idCard: row.id_card,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function updatePatientDefault(userId, patientId) {
  db.prepare('UPDATE patients SET is_default = 0 WHERE user_id = ?').run(userId);
  db.prepare('UPDATE patients SET is_default = 1 WHERE id = ?').run(patientId);
}

// ==================== 记录 CRUD ====================

function createRecord(record) {
  const stmt = db.prepare(`
    INSERT INTO records (id, user_id, patient_id, original_image, thumbnail, ocr_result, structured_data,
      document_type, visit_type, status, ai_interpretation, tags, is_starred, created_at, updated_at, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.id, record.userId, record.patientId,
    record.originalImage || null, record.thumbnail || null,
    record.ocrResult ? JSON.stringify(record.ocrResult) : null,
    record.structuredData ? JSON.stringify(record.structuredData) : null,
    record.documentType, record.visitType || null, record.status,
    record.aiInterpretation || null, record.tags ? JSON.stringify(record.tags) : null,
    record.isStarred ? 1 : 0, record.createdAt, record.updatedAt, record.uploadedAt
  );
  return record.id;
}

function getRecordsByUser(userId) {
  const stmt = db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY created_at DESC');
  return stmt.all(userId).map(row => ({
    ...row,
    userId: row.user_id,
    patientId: row.patient_id,
    originalImage: row.original_image,
    ocrResult: row.ocr_result ? JSON.parse(row.ocr_result) : undefined,
    structuredData: row.structured_data ? JSON.parse(row.structured_data) : undefined,
    documentType: row.document_type,
    visitType: row.visit_type,
    isStarred: !!row.is_starred,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uploadedAt: row.uploaded_at,
  }));
}

function deleteRecord(id, userId) {
  const stmt = db.prepare('DELETE FROM records WHERE id = ? AND user_id = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

// ==================== 就诊事件 CRUD ====================

function createVisitEvent(event) {
  const stmt = db.prepare(`
    INSERT INTO visit_events (id, user_id, patient_id, date, hospital, department, visit_type, diagnosis, icd10_codes, records, summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    event.id, event.userId, event.patientId, event.date,
    event.hospital || null, event.department || null, event.visitType || 'outpatient',
    event.diagnosis ? JSON.stringify(event.diagnosis) : null,
    event.icd10Codes ? JSON.stringify(event.icd10Codes) : null,
    event.records ? JSON.stringify(event.records.map(r => r.id)) : null,
    event.summary || null, event.createdAt
  );
  return event.id;
}

function getVisitEventsByUser(userId) {
  const stmt = db.prepare('SELECT * FROM visit_events WHERE user_id = ? ORDER BY date DESC');
  return stmt.all(userId).map(row => ({
    ...row,
    userId: row.user_id,
    patientId: row.patient_id,
    visitType: row.visit_type,
    diagnosis: row.diagnosis ? JSON.parse(row.diagnosis) : undefined,
    icd10Codes: row.icd10_codes ? JSON.parse(row.icd10_codes) : undefined,
    records: [], // 需要单独关联查询
    createdAt: row.created_at,
  }));
}

// ==================== 家庭成员 CRUD ====================

function createFamilyMember(member) {
  const stmt = db.prepare(`
    INSERT INTO family_members (id, user_id, patient_id, relation, permission, invited_at, accepted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(member.id, member.userId, member.patientId, member.relation, member.permission, member.invitedAt, member.acceptedAt || null);
  return member.id;
}

function getFamilyMembersByUser(userId) {
  const stmt = db.prepare('SELECT * FROM family_members WHERE user_id = ?');
  return stmt.all(userId).map(row => ({
    ...row,
    userId: row.user_id,
    patientId: row.patient_id,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
  }));
}

function deleteFamilyMember(id, userId) {
  const stmt = db.prepare('DELETE FROM family_members WHERE id = ? AND user_id = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

// ==================== 数据导出 ====================

function exportUserData(userId) {
  const patients = getPatientsByUser(userId);
  const records = getRecordsByUser(userId);
  const visitEvents = getVisitEventsByUser(userId);
  const familyMembers = getFamilyMembersByUser(userId);

  // P1 新增表查询
  const medications = db.prepare('SELECT * FROM medications WHERE user_id = ?').all(userId);
  const medicationLogs = db.prepare('SELECT * FROM medication_logs WHERE patient_id IN (SELECT id FROM patients WHERE user_id = ?)').all(userId);
  const followUps = db.prepare('SELECT * FROM follow_up_reminders WHERE user_id = ?').all(userId);
  const vaccinations = db.prepare('SELECT * FROM vaccination_records WHERE patient_id IN (SELECT id FROM patients WHERE user_id = ?)').all(userId);

  return { patients, records, visitEvents, familyMembers, medications, medicationLogs, followUps, vaccinations };
}

module.exports = {
  db,
  createUser,
  findUserByPhone,
  findUserById,
  createPatient,
  getPatientsByUser,
  updatePatientDefault,
  createRecord,
  getRecordsByUser,
  deleteRecord,
  createVisitEvent,
  getVisitEventsByUser,
  createFamilyMember,
  getFamilyMembersByUser,
  deleteFamilyMember,
  exportUserData,
};
