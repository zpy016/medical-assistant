/**
 * 管理员用户列表页
 * 表格展示、搜索、分页、状态筛选、状态操作
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserList, updateUserStatus, clearAdminToken } from '../utils/adminClient';
import type { UserListItem } from '../utils/adminClient';
import { Search, Filter, ChevronLeft, ChevronRight, Shield, LogOut, UserX, UserCheck, Trash2, Eye } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: '正常', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  disabled: { label: '已禁用', className: 'bg-red-50 text-red-700 border-red-200' },
  pending_deletion: { label: '待注销', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUserList({ page, pageSize, search, status: statusFilter });
      setUsers(result.data.users);
      setTotal(result.data.total);
    } catch (err) {
      console.error('[Users] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleStatusChange = async (userId: string, status: string) => {
    setActionLoading(userId);
    try {
      await updateUserStatus(userId, status);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-600" />
          <h1 className="text-base font-semibold text-gray-900">用户管理</h1>
          <span className="text-xs text-gray-400">共 {total} 人</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 运营看板
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

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="搜索手机号或姓名..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">已禁用</option>
              <option value="pending_deletion">待注销</option>
            </select>
          </div>
        </div>

        {/* 用户表格 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">用户</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">角色</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">注册时间</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">最后活跃</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">加载中...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">无数据</td>
                  </tr>
                ) : (
                  users.map(user => {
                    const status = STATUS_MAP[user.status] || STATUS_MAP.active;
                    return (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{user.name || '未命名'}</p>
                            <p className="text-xs text-gray-500">{user.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs ${user.role === 'admin' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                            {user.role === 'admin' ? '管理员' : '普通用户'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {user.last_active_at
                            ? new Date(user.last_active_at).toLocaleDateString('zh-CN')
                            : '从未'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/admin/users/${user.id}`)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {user.status === 'active' && (
                              <button
                                onClick={() => handleStatusChange(user.id, 'disabled')}
                                disabled={actionLoading === user.id}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="禁用"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}
                            {user.status === 'disabled' && (
                              <button
                                onClick={() => handleStatusChange(user.id, 'active')}
                                disabled={actionLoading === user.id}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                title="启用"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`确定要永久删除用户 ${user.name || user.phone} 吗？此操作不可恢复。`)) {
                                  handleStatusChange(user.id, 'force_delete');
                                }
                              }}
                              disabled={actionLoading === user.id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="立即删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                第 {page} / {totalPages} 页，共 {total} 条
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
