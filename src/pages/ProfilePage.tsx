/**
 * 个人中心页面
 * 包含：患者管理、数据导出、OCR设置、关于
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { exportAllData, clearAllData } from '../db';
import { downloadJSON, convertToCSV } from '../utils/helpers';
import {
  Users, Download, Trash2, Settings, Shield,
  ChevronRight, FileJson, FileSpreadsheet, AlertTriangle,
  Plus, X, Check
} from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { patients, currentPatientId, setCurrentPatient, addPatient } = useRecordStore();
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');

  const handleExport = async (format: 'json' | 'csv') => {
    const data = await exportAllData();
    if (format === 'json') {
      downloadJSON(data, `medical_records_${new Date().toISOString().split('T')[0]}.json`);
    } else {
      const csv = convertToCSV(data.records);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical_records_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleClearData = async () => {
    if (confirm('⚠️ 警告：此操作将删除所有本地存储的病历数据，且不可恢复！\n\n确定要继续吗？')) {
      await clearAllData();
      window.location.reload();
    }
  };

  const handleAddPatient = async () => {
    if (!newPatientName.trim()) return;
    await addPatient({
      id: crypto.randomUUID(),
      name: newPatientName.trim(),
      gender: 'unknown',
      isDefault: false,
    });
    setNewPatientName('');
    setShowAddPatient(false);
  };

  return (
    <div className="min-h-full animate-fade-in">
      {/* 头部 */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold">我的</h1>
      </div>

      {/* 患者管理 */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-sm font-semibold">患者管理</span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">{patients.length}人</span>
          </div>

          {patients.map(patient => (
            <button
              key={patient.id}
              onClick={() => setCurrentPatient(patient.id)}
              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-bg)]/50 transition-colors ${
                patient.id === currentPatientId ? 'bg-[var(--color-primary)]/5' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                  patient.id === currentPatientId
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                }`}>
                  {patient.name[0]}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{patient.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {patient.gender === 'male' ? '男' : patient.gender === 'female' ? '女' : ''}
                    {patient.age ? ` · ${patient.age}岁` : ''}
                    {patient.isDefault && ' · 默认'}
                  </p>
                </div>
              </div>
              {patient.id === currentPatientId && (
                <Check className="w-4 h-4 text-[var(--color-primary)]" />
              )}
            </button>
          ))}

          {/* 添加患者 */}
          {showAddPatient ? (
            <div className="px-4 py-3 flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="输入患者姓名"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPatient()}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-primary)]"
              />
              <button
                onClick={handleAddPatient}
                className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setShowAddPatient(false); setNewPatientName(''); }}
                className="px-3 py-2 bg-[var(--color-bg)] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddPatient(true)}
              className="w-full flex items-center gap-2 px-4 py-3 text-[var(--color-primary)] text-sm hover:bg-[var(--color-bg)]/50"
            >
              <Plus className="w-4 h-4" />
              添加患者
            </button>
          )}
        </div>
      </div>

      {/* 数据管理 */}
      <div className="px-4 mb-6">
        <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 px-1">数据管理</h3>
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <button
            onClick={() => handleExport('json')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-bg)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileJson className="w-4 h-4 text-[var(--color-secondary)]" />
              <span className="text-sm">导出JSON</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
          <div className="mx-4 h-px bg-[var(--color-border)]/50" />
          <button
            onClick={() => handleExport('csv')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-bg)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span className="text-sm">导出CSV</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
          <div className="mx-4 h-px bg-[var(--color-border)]/50" />
          <button
            onClick={handleClearData}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-[var(--color-danger)]" />
              <span className="text-sm text-[var(--color-danger)]">清除所有数据</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-danger)]" />
          </button>
        </div>
      </div>

      {/* OCR设置 */}
      <div className="px-4 mb-6">
        <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 px-1">OCR设置</h3>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-3 mb-3">
            <Settings className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-sm font-medium">火山引擎OCR配置</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-3">
            当前使用模拟OCR模式。如需接入真实OCR服务，请配置火山引擎AccessKey。
            所有处理均在本地完成，图片和识别结果不会上传到服务器。
          </p>
          <div className="bg-[var(--color-bg)] rounded-lg p-3">
            <p className="text-xs text-[var(--color-text-secondary)] font-medium mb-1">接入步骤：</p>
            <ol className="text-xs text-[var(--color-text-muted)] space-y-1 list-decimal list-inside">
              <li>登录火山引擎控制台 → 视觉智能 → 开通OCR服务</li>
              <li>右上角头像 → 密钥管理 → 获取 AccessKey ID / Secret</li>
              <li>在代码中配置或通过后端代理调用（推荐）</li>
            </ol>
          </div>
        </div>
      </div>

      {/* 关于 */}
      <div className="px-4 mb-8">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-sm font-medium">关于就医助手</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            就医助手是一款个人健康档案管理工具。Phase 1 聚焦病历OCR识别与智能分类。
            数据仅存储在本地浏览器中，您可以随时导出或删除。
          </p>
          <div className="mt-3 pt-3 border-t border-[var(--color-border)]/50">
            <p className="text-[10px] text-[var(--color-text-muted)]">
              免责声明：本工具仅为病历整理辅助，不提供医疗诊断建议。
              任何医疗决策请咨询专业医生。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
