/**
 * 管理员重置密钥管理页
 * 创建/查看/删除重置密钥
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getResetKeys, createResetKey, deleteResetKey, clearAdminToken, type ResetKey } from '../utils/adminClient';
import { Shield, LogOut, Plus, Trash2, Copy, Check, KeyRound, ChevronLeft } from 'lucide-react';

export default function AdminResetKeysPage() {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ResetKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expiresInHours, setExpiresInHours] = useState<number | ''>('');

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getResetKeys();
      setKeys(result.data);
    } catch (err) {
      console.error('[ResetKeys] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const hours = expiresInHours ? Number(expiresInHours) : undefined;
      await createResetKey(hours ? { expiresInHours: hours } : undefined);
      setExpiresInHours('');
      loadKeys();
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此密钥吗？')) return;
    try {
      await deleteResetKey(id);
      loadKeys();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleCopy = (keyCode: string, id: string) => {
    navigator.clipboard.writeText(keyCode).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const formatStatus = (key: ResetKey) => {
    if (key.status === 'revoked') return { label: '已撤销', className: 'bg-gray-100 text-gray-500' };
    if (key.expires_at && Date.now() > key.expires_at) return { label: '已过期', className: 'bg-amber-50 text-amber-600' };
    return { label: '有效', className: 'bg-emerald-50 text-emerald-600' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-600" />
          <h1 className="text-base font-semibold text-gray-900">重置密钥管理</h1>
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

      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* 创建密钥 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">创建新密钥</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 whitespace-nowrap">有效期:</span>
              <select
                value={expiresInHours}
                onChange={e => setExpiresInHours(e.target.value === '' ? '' : Number(e.target.value))}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:outline-none"
              >
                <option value="">永不过期</option>
                <option value={1}>1小时</option>
                <option value={6}>6小时</option>
                <option value={12}>12小时</option>
                <option value={24}>24小时</option>
                <option value={72}>3天</option>
                <option value={168}>7天</option>
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {creating ? '创建中...' : '创建密钥'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            密钥创建后可分发给用户，用户凭密钥可在「忘记密码」页面重置自己的密码。密钥可重复使用。
          </p>
        </div>

        {/* 密钥列表 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-10 text-gray-400">加载中...</div>
          ) : keys.length === 0 ? (
            <div className="text-center py-10 text-gray-400">暂无密钥</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {keys.map(key => {
                const status = formatStatus(key);
                return (
                  <div key={key.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <KeyRound className="w-4 h-4 text-blue-500" />
                        <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800">
                          {key.key_code}
                        </code>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        创建于 {new Date(key.created_at).toLocaleString('zh-CN')}
                        {key.expires_at && (
                          <> · 过期于 {new Date(key.expires_at).toLocaleString('zh-CN')}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <button
                        onClick={() => handleCopy(key.key_code, key.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="复制密钥"
                      >
                        {copiedId === key.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(key.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="删除密钥"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
