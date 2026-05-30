import { useState } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useRecordStore } from '../../stores/recordStore';
import { getToken, removeToken } from '../../utils/storage';
import './index.css';

export default function ProfilePage() {
  const {
    visitEvents,
    patients,
    familyMembers,
    currentPatientId,
    isSynced,
    lastSyncAt,
    setCurrentPatient,
    loadFromStorage
  } = useRecordStore();

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('父亲');
  const [newMemberPermission, setNewMemberPermission] = useState<'view' | 'edit'>('view');

  useDidShow(() => {
    loadFromStorage();
  });

  const currentPatient = patients.find((p) => p.id === currentPatientId);
  const token = getToken();

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          removeToken();
          Taro.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  };

  const handleSync = async () => {
    Taro.showLoading({ title: '同步中...' });
    // 这里调用实际同步API
    setTimeout(() => {
      Taro.hideLoading();
      Taro.showToast({ title: '同步完成', icon: 'success' });
    }, 1500);
  };

  const handleExport = () => {
    Taro.showActionSheet({
      itemList: ['导出 JSON', '导出 CSV'],
      success: (res) => {
        const format = res.tapIndex === 0 ? 'json' : 'csv';
        const data = format === 'json'
          ? JSON.stringify(visitEvents, null, 2)
          : convertToCSV(visitEvents);

        // 小程序不能直接下载文件，复制到剪贴板
        Taro.setClipboardData({
          data,
          success: () => {
            Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
          }
        });
      }
    });
  };

  const handleClearData = () => {
    Taro.showModal({
      title: '清除数据',
      content: '确定要清除所有本地数据吗？此操作不可恢复！',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          Taro.clearStorageSync();
          loadFromStorage();
          Taro.showToast({ title: '数据已清除', icon: 'success' });
        }
      }
    });
  };

  const addMember = () => {
    if (!newMemberName.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    const member = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      relationship: newMemberRelation,
      permission: newMemberPermission,
      invitedAt: new Date().toISOString()
    };
    useRecordStore.getState().addFamilyMember(member);
    setShowAddMember(false);
    setNewMemberName('');
    Taro.showToast({ title: '添加成功', icon: 'success' });
  };

  return (
    <ScrollView scrollY className="profile-page">
      {/* 用户信息 */}
      <View className="profile-header">
        <View className="profile-avatar">
          <Text className="profile-avatar-text">{currentPatient?.name?.[0] || '用'}</Text>
        </View>
        <View className="profile-info">
          <Text className="text-xl font-bold text-white">{currentPatient?.name || '未登录'}</Text>
          <Text className="text-sm text-white opacity-70">
            {token ? '已登录' : '点击登录同步数据'}
          </Text>
        </View>
        {!token ? (
          <View className="profile-login-btn" onClick={handleLogin}>
            <Text className="text-primary text-sm font-medium">登录</Text>
          </View>
        ) : (
          <View className="profile-login-btn" onClick={handleLogout}>
            <Text className="text-danger text-sm font-medium">退出</Text>
          </View>
        )}
      </View>

      {/* 统计 */}
      <View className="stats-card">
        <View className="stat-box">
          <Text className="stat-box-num">{visitEvents.length}</Text>
          <Text className="stat-box-label">病历</Text>
        </View>
        <View className="stat-box">
          <Text className="stat-box-num">{new Set(visitEvents.map((e) => e.hospital)).size}</Text>
          <Text className="stat-box-label">医院</Text>
        </View>
        <View className="stat-box">
          <Text className="stat-box-num">{familyMembers.length}</Text>
          <Text className="stat-box-label">家人</Text>
        </View>
      </View>

      {/* 数据同步 */}
      <View className="card">
        <View className="section-header">
          <Text className="section-title">数据同步</Text>
        </View>
        <View className="sync-row" onClick={handleSync}>
          <View className="flex items-center">
            <Text className="text-2xl mr-2">☁️</Text>
            <View>
              <Text className="text-base">云端同步</Text>
              <Text className="text-xs text-gray-400">
                {lastSyncAt ? `上次: ${new Date(lastSyncAt).toLocaleString()}` : '未同步'}
              </Text>
            </View>
          </View>
          <View className={`sync-status ${isSynced ? 'sync-ok' : 'sync-pending'}`}>
            <Text className="text-xs">{isSynced ? '已同步' : '未同步'}</Text>
          </View>
        </View>
      </View>

      {/* 患者管理 */}
      <View className="card">
        <View className="section-header">
          <Text className="section-title">患者管理</Text>
        </View>
        {patients.map((p) => (
          <View
            key={p.id}
            className={`patient-row ${currentPatientId === p.id ? 'patient-active' : ''}`}
            onClick={() => setCurrentPatient(p.id)}
          >
            <View className="patient-avatar-small">
              <Text className="text-white text-sm">{p.name[0]}</Text>
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-base">{p.name}</Text>
              <Text className="text-xs text-gray-400">{p.relationship || '本人'}</Text>
            </View>
            {currentPatientId === p.id && (
              <Text className="text-primary text-sm">✓ 当前</Text>
            )}
          </View>
        ))}
      </View>

      {/* 家庭成员 */}
      <View className="card">
        <View className="section-header flex items-center justify-between">
          <Text className="section-title">家庭成员</Text>
          <Text className="text-primary text-sm" onClick={() => setShowAddMember(true)}>+ 添加</Text>
        </View>
        {familyMembers.length === 0 ? (
          <Text className="text-sm text-gray-400 text-center py-3">暂无家庭成员</Text>
        ) : (
          familyMembers.map((m) => (
            <View key={m.id} className="member-row">
              <View className="flex items-center flex-1">
                <View className="member-avatar">
                  <Text className="text-white text-sm">{m.name[0]}</Text>
                </View>
                <View className="ml-2">
                  <Text className="text-base">{m.name}</Text>
                  <Text className="text-xs text-gray-400">{m.relationship} · {m.permission === 'edit' ? '可编辑' : '仅查看'}</Text>
                </View>
              </View>
              <Text
                className="text-danger text-sm"
                onClick={() => {
                  Taro.showModal({
                    title: '删除成员',
                    content: `确定删除 ${m.name} 吗？`,
                    success: (res) => {
                      if (res.confirm) {
                        useRecordStore.getState().removeFamilyMember(m.id);
                      }
                    }
                  });
                }}
              >
                删除
              </Text>
            </View>
          ))
        )}
      </View>

      {/* 数据管理 */}
      <View className="card">
        <View className="section-header">
          <Text className="section-title">数据管理</Text>
        </View>
        <View className="menu-row" onClick={handleExport}>
          <Text>📤 导出数据</Text>
          <Text className="text-gray-400">›</Text>
        </View>
        <View className="divider" />
        <View className="menu-row" onClick={handleClearData}>
          <Text className="text-danger">🗑️ 清除所有数据</Text>
          <Text className="text-gray-400">›</Text>
        </View>
      </View>

      {/* 添加成员弹窗 */}
      {showAddMember && (
        <View className="edit-modal">
          <View className="edit-overlay" onClick={() => setShowAddMember(false)} />
          <View className="edit-panel">
            <Text className="text-lg font-bold mb-3">添加家庭成员</Text>
            <input
              className="edit-input mb-2"
              placeholder="姓名"
              value={newMemberName}
              onInput={(e) => setNewMemberName((e.target as any).value)}
            />
            <View className="flex gap-2 mb-2">
              {['父亲', '母亲', '配偶', '子女', '其他'].map((r) => (
                <View
                  key={r}
                  className={`filter-chip ${newMemberRelation === r ? 'filter-chip-active' : ''}`}
                  onClick={() => setNewMemberRelation(r)}
                >
                  <Text>{r}</Text>
                </View>
              ))}
            </View>
            <View className="flex gap-2 mb-3">
              {[
                { key: 'view', label: '仅查看' },
                { key: 'edit', label: '可编辑' }
              ].map(({ key, label }) => (
                <View
                  key={key}
                  className={`filter-chip ${newMemberPermission === key ? 'filter-chip-active' : ''}`}
                  onClick={() => setNewMemberPermission(key as any)}
                >
                  <Text>{label}</Text>
                </View>
              ))}
            </View>
            <View className="btn btn-primary" onClick={addMember}>
              <Text>添加</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function convertToCSV(events: any[]): string {
  const headers = ['日期', '医院', '科室', '就诊类型', '诊断', '药品', '异常指标'];
  const rows = events.map((e) => [
    e.date,
    e.hospital,
    e.department,
    e.visitType,
    e.diagnosis?.join(';') || '',
    e.medications?.join(';') || '',
    e.abnormalFlags?.join(';') || ''
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
