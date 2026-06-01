/**
 * 个人中心页面
 * 包含：患者管理、数据导出、OCR设置、关于
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { exportAllData, clearAllData } from '../db';
import type { SharedPatient, SharedInvitation } from '../types';
import {
  isLoggedIn, getCurrentUser, clearAuthToken, autoSync, syncDownload,
  getSharedPatients, getReceivedInvitations, getSentInvitations,
  inviteFamilyMember, acceptInvitation, rejectInvitation, cancelInvitation,
} from '../services/syncService';
import { downloadJSON, convertToCSV } from '../utils/helpers';
import {
  Users, User, Download, Trash2, Settings, Shield,
  ChevronRight, FileJson, FileSpreadsheet, AlertTriangle,
  Plus, X, Check, UserPlus, Eye, Pencil, UserCog,
  Cloud, CloudOff, LogOut, LogIn, RefreshCw,
  FlaskConical, Pill, Syringe, HeartPulse, Activity,
  Share2, Phone, Bell, Send, CheckCircle2, XCircle
} from 'lucide-react';

const RELATION_OPTIONS = [
  { value: 'father', label: '父亲' },
  { value: 'mother', label: '母亲' },
  { value: 'spouse', label: '配偶' },
  { value: 'son', label: '儿子' },
  { value: 'daughter', label: '女儿' },
  { value: 'other', label: '其他' },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    patients, currentPatientId, setCurrentPatient, addPatient,
    familyMembers, loadFamilyMembers, addFamilyMember, removeFamilyMember, updateFamilyMemberPermission,
    loadPatients, loadRecords, loadVisitEvents,
  } = useRecordStore();

  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');

  // 家庭成员表单
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyRelation, setNewFamilyRelation] = useState('father');
  const [newFamilyPermission, setNewFamilyPermission] = useState<'view' | 'edit'>('view');

  // 登录/同步状态
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // 患者分享
  const [sharedPatients, setSharedPatients] = useState<SharedPatient[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<SharedInvitation[]>([]);
  const [sentInvites, setSentInvites] = useState<SharedInvitation[]>([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharePhone, setSharePhone] = useState('');
  const [sharePatientId, setSharePatientId] = useState('');
  const [shareRelation, setShareRelation] = useState('other');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');
  const [shareTab, setShareTab] = useState<'received' | 'sent'>('received');

  // 加载家庭成员
  useEffect(() => {
    loadFamilyMembers();
  }, [loadFamilyMembers]);

  // 加载共享患者和邀请
  useEffect(() => {
    if (!loggedIn) return;
    loadSharedData();
  }, [loggedIn]);

  const loadSharedData = async () => {
    try {
      const [spResult, rcResult, stResult] = await Promise.all([
        getSharedPatients().catch(() => ({ data: [] })),
        getReceivedInvitations().catch(() => ({ data: [] })),
        getSentInvitations().catch(() => ({ data: [] })),
      ]);
      setSharedPatients(spResult.data || []);
      setReceivedInvites((rcResult.data || []).map((m: any) => ({
        id: m.id,
        inviterName: m.inviter_name || '未知用户',
        inviterPhone: m.inviter_phone || '',
        patientName: m.patient_name || '未知患者',
        relation: m.relation,
        permission: m.permission,
        invitedAt: m.invited_at,
      })));
      setSentInvites((stResult.data || []).map((m: any) => ({
        id: m.id,
        inviterName: m.invited_user_name || m.invited_user_phone || '',
        inviterPhone: m.invited_user_phone || '',
        patientName: m.patient_name || '未知患者',
        relation: m.relation,
        permission: m.permission,
        invitedAt: m.invited_at,
      })));
    } catch (e) {
      // 忽略错误
    }
  };

  const handleSharePatient = async () => {
    if (!sharePhone.trim() || !sharePatientId) {
      setShareError('请输入手机号并选择患者');
      return;
    }
    setShareLoading(true);
    setShareError('');
    setShareSuccess('');
    try {
      await inviteFamilyMember(sharePhone.trim(), sharePatientId, shareRelation, sharePermission);
      setShareSuccess('分享成功！对方登录后即可查看。');
      setSharePhone('');
      setSharePatientId('');
      setTimeout(() => {
        setShowShareDialog(false);
        setShareSuccess('');
        loadSharedData();
      }, 1500);
    } catch (e: any) {
      setShareError(e.message || '分享失败');
    } finally {
      setShareLoading(false);
    }
  };

  const handleAcceptInvite = async (id: string) => {
    try {
      await acceptInvitation(id);
      loadSharedData();
    } catch (e: any) {
      alert(e.message || '接受失败');
    }
  };

  const handleRejectInvite = async (id: string) => {
    try {
      await rejectInvitation(id);
      loadSharedData();
    } catch (e: any) {
      alert(e.message || '拒绝失败');
    }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      await cancelInvitation(id);
      loadSharedData();
    } catch (e: any) {
      alert(e.message || '取消失败');
    }
  };

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

  const handleAddFamilyMember = async () => {
    if (!newFamilyName.trim()) return;
    await addFamilyMember({
      id: crypto.randomUUID(),
      userId: currentPatientId ?? 'default',
      patientId: currentPatientId ?? 'default',
      relation: newFamilyRelation,
      permission: newFamilyPermission,
    });
    setNewFamilyName('');
    setShowAddFamily(false);
  };

  const handleSync = async () => {
    if (!loggedIn) {
      navigate('/login');
      return;
    }
    setSyncing(true);
    setSyncMessage('');
    try {
      const result = await autoSync();
      setSyncMessage(result.message);
    } catch (error) {
      setSyncMessage('同步失败');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 3000);
    }
  };

  const handleDownload = async () => {
    if (!loggedIn) return;
    if (!confirm('⚠️ 这将用云端数据覆盖本地数据，确定要继续吗？')) return;
    setSyncing(true);
    try {
      await syncDownload();
      await loadPatients();
      await loadRecords();
      await loadVisitEvents();
      setSyncMessage('云端数据已恢复到本地');
    } catch (error) {
      setSyncMessage('恢复失败');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 3000);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setLoggedIn(false);
    window.location.reload();
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

      {/* 家庭成员管理 */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-sm font-semibold">家庭成员</span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">{familyMembers.length}人</span>
          </div>

          {familyMembers.map(member => (
            <div
              key={member.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-bg)]/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--color-bg)] flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {RELATION_OPTIONS.find(r => r.value === member.relation)?.label ?? member.relation}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    权限：{member.permission === 'edit' ? '可编辑' : '仅查看'}
                    {member.acceptedAt ? ' · 已接受' : ' · 待接受'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/family-dashboard/${member.patientId}`)}
                  className="p-1.5 bg-blue-50 text-blue-500 rounded-lg"
                  title="健康看板"
                >
                  <Activity className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateFamilyMemberPermission(member.id, member.permission === 'view' ? 'edit' : 'view')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    member.permission === 'edit'
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
                  }`}
                  title={member.permission === 'edit' ? '切换为仅查看' : '切换为可编辑'}
                >
                  {member.permission === 'edit' ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => removeFamilyMember(member.id)}
                  className="p-1.5 hover:bg-red-50 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* 添加家庭成员 */}
          {showAddFamily ? (
            <div className="px-4 py-3 space-y-3 border-t border-[var(--color-border)]/50">
              <input
                autoFocus
                type="text"
                placeholder="家庭成员姓名"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-primary)]"
              />
              <div className="flex gap-2">
                <select
                  value={newFamilyRelation}
                  onChange={(e) => setNewFamilyRelation(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-primary)] bg-white"
                >
                  {RELATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={newFamilyPermission}
                  onChange={(e) => setNewFamilyPermission(e.target.value as 'view' | 'edit')}
                  className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-primary)] bg-white"
                >
                  <option value="view">仅查看</option>
                  <option value="edit">可编辑</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddFamilyMember}
                  className="flex-1 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium"
                >
                  添加
                </button>
                <button
                  onClick={() => { setShowAddFamily(false); setNewFamilyName(''); }}
                  className="flex-1 py-2 bg-[var(--color-bg)] text-[var(--color-text-secondary)] rounded-lg text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddFamily(true)}
              className="w-full flex items-center gap-2 px-4 py-3 text-[var(--color-primary)] text-sm hover:bg-[var(--color-bg)]/50"
            >
              <UserPlus className="w-4 h-4" />
              添加家庭成员
            </button>
          )}
        </div>
      </div>

      {/* 患者分享 */}
      {loggedIn && (
        <div className="px-4 mb-6">
          <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)]/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm font-semibold">患者分享</span>
              </div>
              <button
                onClick={() => setShowShareDialog(true)}
                className="text-[10px] px-2.5 py-1 bg-[var(--color-primary)] text-white rounded-full flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                分享患者
              </button>
            </div>

            {/* 已收到的共享患者 */}
            {sharedPatients.length > 0 && (
              <div className="border-b border-[var(--color-border)]/50">
                <div className="px-4 py-2 bg-[var(--color-bg)]/50">
                  <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">收到的患者</span>
                </div>
                {sharedPatients.map(sp => (
                  <button
                    key={sp.id}
                    onClick={() => navigate(`/shared-patient/${sp.patient_id}`)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-bg)]/50 border-b border-[var(--color-border)]/30 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-[var(--color-primary)]" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{sp.patient_name || '未知患者'}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          来自 {sp.inviter_name || sp.inviter_phone} · {sp.permission === 'edit' ? '可编辑' : '仅查看'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                  </button>
                ))}
              </div>
            )}

            {/* 邀请标签页 */}
            {(receivedInvites.length > 0 || sentInvites.length > 0) && (
              <div>
                <div className="flex border-b border-[var(--color-border)]/50">
                  <button
                    onClick={() => setShareTab('received')}
                    className={`flex-1 py-2 text-xs font-medium text-center ${shareTab === 'received' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
                  >
                    收到的邀请 {receivedInvites.length > 0 && `(${receivedInvites.length})`}
                  </button>
                  <button
                    onClick={() => setShareTab('sent')}
                    className={`flex-1 py-2 text-xs font-medium text-center ${shareTab === 'sent' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
                  >
                    已发出 {sentInvites.length > 0 && `(${sentInvites.length})`}
                  </button>
                </div>

                {shareTab === 'received' && (
                  <div>
                    {receivedInvites.length === 0 ? (
                      <p className="text-xs text-[var(--color-text-muted)] text-center py-4">暂无待处理邀请</p>
                    ) : (
                      receivedInvites.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]/30 last:border-0">
                          <div className="flex items-center gap-3">
                            <Bell className="w-4 h-4 text-[var(--color-secondary)]" />
                            <div>
                              <p className="text-sm">{inv.inviterName} 分享了「{inv.patientName}」</p>
                              <p className="text-[10px] text-[var(--color-text-muted)]">
                                {inv.permission === 'edit' ? '可编辑' : '仅查看'} · {RELATION_OPTIONS.find(r => r.value === inv.relation)?.label || inv.relation}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAcceptInvite(inv.id)}
                              className="p-1.5 bg-green-50 text-green-600 rounded-lg"
                              title="接受"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRejectInvite(inv.id)}
                              className="p-1.5 bg-red-50 text-[var(--color-danger)] rounded-lg"
                              title="拒绝"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {shareTab === 'sent' && (
                  <div>
                    {sentInvites.length === 0 ? (
                      <p className="text-xs text-[var(--color-text-muted)] text-center py-4">暂无已发出邀请</p>
                    ) : (
                      sentInvites.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]/30 last:border-0">
                          <div className="flex items-center gap-3">
                            <Send className="w-4 h-4 text-[var(--color-text-muted)]" />
                            <div>
                              <p className="text-sm">「{inv.patientName}」</p>
                              <p className="text-[10px] text-[var(--color-text-muted)]">
                                {inv.permission === 'edit' ? '可编辑' : '仅查看'} · {RELATION_OPTIONS.find(r => r.value === inv.relation)?.label || inv.relation}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelInvite(inv.id)}
                            className="p-1.5 hover:bg-red-50 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] rounded-lg"
                            title="取消邀请"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {sharedPatients.length === 0 && receivedInvites.length === 0 && sentInvites.length === 0 && (
              <div className="px-4 py-6 text-center">
                <Share2 className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-xs text-[var(--color-text-muted)]">分享患者给家人或医生</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">对方登录后即可查看实时数据</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 健康管理入口 */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]/50">
            <span className="text-sm font-semibold">健康管理</span>
          </div>

          <button
            onClick={() => navigate('/abnormal-tests')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-bg)]/50 border-b border-[var(--color-border)]/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <FlaskConical className="w-4.5 h-4.5 text-[var(--color-danger)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">异常指标</p>
                <p className="text-xs text-[var(--color-text-muted)]">查看检验异常与复查提醒</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>

          <button
            onClick={() => navigate('/medications')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-bg)]/50 border-b border-[var(--color-border)]/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                <Pill className="w-4.5 h-4.5 text-[var(--color-primary)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">用药管理</p>
                <p className="text-xs text-[var(--color-text-muted)]">服药提醒与依从性追踪</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>

          <button
            onClick={() => navigate('/vaccines')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-bg)]/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Syringe className="w-4.5 h-4.5 text-[var(--color-secondary)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">疫苗接种</p>
                <p className="text-xs text-[var(--color-text-muted)]">儿童疫苗计划与记录</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </div>
      </div>

      {/* 云同步 */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {loggedIn ? (
                <Cloud className="w-4 h-4 text-[var(--color-primary)]" />
              ) : (
                <CloudOff className="w-4 h-4 text-[var(--color-text-muted)]" />
              )}
              <span className="text-sm font-semibold">云同步</span>
            </div>
            {loggedIn && (
              <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
                已登录
              </span>
            )}
          </div>

          <div className="px-4 py-3">
            {loggedIn ? (
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-text-muted)]">
                  当前用户：{getCurrentUser()?.phone}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? '同步中...' : '同步到云端'}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={syncing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[var(--color-bg)] text-[var(--color-text-secondary)] rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    从云端恢复
                  </button>
                </div>
                {syncMessage && (
                  <p className="text-[10px] text-center text-[var(--color-primary)]">{syncMessage}</p>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[var(--color-danger)] text-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  退出登录
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-text-muted)]">
                  登录后可同步数据到云端，换设备不丢失
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-medium"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  登录 / 注册
                </button>
              </div>
            )}
          </div>
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
            已接入火山引擎 OCR 服务，通过后端代理调用。图片经压缩后发送到火山引擎进行识别，
            识别结果仅在本地浏览器展示，不会存储到第三方服务器。
          </p>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-700 font-medium mb-1">✅ 火山引擎 OCR 已配置</p>
            <p className="text-xs text-green-600 leading-relaxed">
              图片上传后会通过后端代理调用火山引擎 OCR 服务进行识别。识别结果仅在本地展示，不会存储到第三方服务器。
            </p>
          </div>
        </div>
      </div>

      {/* 分享患者弹窗 */}
      {showShareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)]/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold">分享患者</h3>
              <button onClick={() => setShowShareDialog(false)} className="p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              {/* 手机号 */}
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">对方手机号</label>
                <div className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] rounded-lg">
                  <Phone className="w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="tel"
                    placeholder="输入已注册的手机号"
                    value={sharePhone}
                    onChange={(e) => setSharePhone(e.target.value)}
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* 选择患者 */}
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">选择患者</label>
                <select
                  value={sharePatientId}
                  onChange={(e) => setSharePatientId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-primary)] bg-white"
                >
                  <option value="">请选择患者</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* 关系 */}
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">关系</label>
                <select
                  value={shareRelation}
                  onChange={(e) => setShareRelation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-primary)] bg-white"
                >
                  {RELATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 权限 */}
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">权限</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSharePermission('view')}
                    className={`flex-1 py-2 rounded-lg text-sm border ${sharePermission === 'view' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}
                  >
                    <Eye className="w-3.5 h-3.5 inline mr-1" />
                    仅查看
                  </button>
                  <button
                    onClick={() => setSharePermission('edit')}
                    className={`flex-1 py-2 rounded-lg text-sm border ${sharePermission === 'edit' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}
                  >
                    <Pencil className="w-3.5 h-3.5 inline mr-1" />
                    可编辑
                  </button>
                </div>
              </div>

              {/* 错误/成功提示 */}
              {shareError && (
                <p className="text-xs text-[var(--color-danger)]">{shareError}</p>
              )}
              {shareSuccess && (
                <p className="text-xs text-green-600">{shareSuccess}</p>
              )}
            </div>
            <div className="px-4 py-3 border-t border-[var(--color-border)]/50 flex gap-2">
              <button
                onClick={() => setShowShareDialog(false)}
                className="flex-1 py-2 bg-[var(--color-bg)] text-[var(--color-text-secondary)] rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSharePatient}
                disabled={shareLoading}
                className="flex-1 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {shareLoading ? '发送中...' : '确认分享'}
              </button>
            </div>
          </div>
        </div>
      )}

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
