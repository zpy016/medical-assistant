/**
 * 管理员用户详情页
 * 展示用户元数据 + 统计 + 操作按钮
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUserDetail, updateUserStatus, clearAdminToken } from '../utils/adminClient';
import type { UserDetail } from '../utils/adminClient';
import { Shield, LogOut, ArrowLeft, Users, FileText, Pill, Calendar, UserX, UserCheck, Trash2, Clock } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: '正常', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  disabled: { label: '已禁用', className: 'bg-red-50 text-red-700 border-red-200' },
  pending_deletion: { label: '待注销', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function AdminUserDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadUser();
  }, [id]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const result = await getUserDetail(id!);
      setUser(result.data);
    } catch (err) {
      console.error('[UserDetail] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setActionLoading(true);
    try {
      await updateUserStatus(id!, status);
      loadUser();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">用户不存在</p>
      </div>
    );
  }

  const status = STATUS_MAP[user.status] || STATUS_MAP.active;
  const stats = [
    { label: '患者数', value: user.stats.patientCount, icon: Users },
    { label: '病历数', value: user.stats.recordCount, icon: FileText },
    { label: '用药方案', value: user.stats.medicationCount, icon: Pill },
    { label: '就诊事件', value: user.stats.visitEventCount, icon: Calendar },
    { label: '家人共享', value: user.stats.familyMemberCount, icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-600" />
          <h1 className="text-base font-semibold text-gray-900">用户详情</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>
          <button
            onClick={() => { clearAdminToken(); navigate('/admin/login'); }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-4 h-4" />
            退出
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* 用户基本信息 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{user.name || '未命名用户'}</h2>
              <p className="text-sm text-gray-500 mt-1">{user.phone}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${status.className}`}>
                  {status.label}
                </span>
                <span className="text-xs text-gray-400">
                  {user.role === 'admin' ? '管理员' : '普通用户'}
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-gray-400 space-y-1">
              <p>注册时间：{new Date(user.created_at).toLocaleString('zh-CN')}</p>
              <p>最后活跃：{user.last_active_at ? new Date(user.last_active_at).toLocaleString('zh-CN') : '从未'}</p>
              {user.deleted_at && (
                <p className="text-amber-600">注销申请：{new Date(user.deleted_at).toLocaleString('zh-CN')}</p>
              )}
              {user.stats.lastUpload && (
                <p>最后上传：{new Date(user.stats.lastUpload).toLocaleString('zh-CN')}</p>
              )}
            </div>
          </div>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <s.icon className="w-5 h-5 text-gray-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">账户操作</h3>
          <div className="flex flex-wrap gap-3">
            {user.status === 'active' && (
              <button
                onClick={() => { if (confirm('确定要禁用该用户吗？禁用后用户将无法登录。')) handleStatusChange('disabled'); }}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
              >
                <UserX className="w-4 h-4" />
                禁用账户
              </button>
            )}
            {user.status === 'disabled' && (
              <button
                onClick={() => handleStatusChange('active')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                启用账户
              </button>
            )}
            {user.status !== 'pending_deletion' && (
              <button
                onClick={() => { if (confirm('确定要标记该用户注销吗？用户将有7天宽限期。')) handleStatusChange('pending_deletion'); }}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                标记注销
              </button>
            )}
            <button
              onClick={() => { if (confirm(`警告：此操作将永久删除用户 ${user.name || user.phone} 及其全部数据，不可恢复！`)) handleStatusChange('force_delete'); }}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              立即删除
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
