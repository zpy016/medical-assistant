/**
 * 管理员运营看板
 * 大数字卡片 + 趋势图
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSystemStats, getDailyStats, getMonthlyNewUsers, getFeatureUsage, clearAdminToken } from '../utils/adminClient';
import type { SystemStats, DailyStat, MonthlyNewUser, FeatureUsage } from '../utils/adminClient';
import { Users, FileText, Activity, UserPlus, TrendingUp, BarChart3, LogOut, Shield } from 'lucide-react';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyNewUser[]>([]);
  const [features, setFeatures] = useState<FeatureUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, d, m, f] = await Promise.all([
        getSystemStats(),
        getDailyStats(14),
        getMonthlyNewUsers(6),
        getFeatureUsage(30),
      ]);
      setStats(s.data);
      setDailyStats(d.data);
      setMonthlyStats(m.data);
      setFeatures(f.data);
    } catch (err) {
      console.error('[Dashboard] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    navigate('/admin/login');
  };

  const statCards = stats ? [
    { label: '总用户数', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: '活跃账户', value: stats.activeUsers, icon: Activity, color: 'bg-emerald-500' },
    { label: '总病历数', value: stats.totalRecords, icon: FileText, color: 'bg-amber-500' },
    { label: '今日新增', value: stats.todayNewUsers, icon: UserPlus, color: 'bg-purple-500' },
    { label: '今日活跃', value: stats.todayActive, icon: TrendingUp, color: 'bg-cyan-500' },
    { label: '待注销', value: stats.pendingDeletion, icon: BarChart3, color: 'bg-red-500' },
  ] : [];

  // 简单的 SVG 柱状图
  const maxDau = Math.max(...dailyStats.map(d => d.dau), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-600" />
          <h1 className="text-base font-semibold text-gray-900">就医助手 · 管理后台</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/users')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            用户管理 →
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-4 h-4" />
            退出
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* 大数字卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {statCards.map((card, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className={`w-8 h-8 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 日活跃趋势 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">近14日活跃趋势</h3>
                {dailyStats.length > 0 ? (
                  <div className="flex items-end gap-1 h-40">
                    {dailyStats.map((d, i) => {
                      const height = `${(d.dau / maxDau) * 100}%`;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-blue-500 rounded-t-sm min-h-[4px] transition-all"
                            style={{ height }}
                            title={`${d.date}: ${d.dau} 人`}
                          />
                          <span className="text-[10px] text-gray-400">{d.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-10 text-center">暂无数据</p>
                )}
              </div>

              {/* 月新增用户 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">月新增用户</h3>
                {monthlyStats.length > 0 ? (
                  <div className="space-y-3">
                    {monthlyStats.map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-16">{m.month}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.min((m.count / Math.max(...monthlyStats.map(x => x.count))) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-8 text-right">{m.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-10 text-center">暂无数据</p>
                )}
              </div>

              {/* 功能使用率 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">近30日功能使用率</h3>
                {features.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {features.map((f, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 capitalize">{f.action}</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{f.count}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-10 text-center">暂无数据</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
