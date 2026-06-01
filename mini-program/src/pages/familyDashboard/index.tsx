import { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useRecordStore } from '../../stores/recordStore';
import { SEVERITY_LABELS, SEVERITY_COLORS } from '../../utils/types';
import './index.css';

function ProgressRing({ progress, size = 64 }: { progress: number; size?: number }) {
  return (
    <View className="progress-ring" style={{ width: size, height: size, background: `conic-gradient(#3b82f6 0% ${progress}%, #e5e7eb ${progress}% 100%)` }}>
      <View className="progress-ring-inner" style={{ width: size - 12, height: size - 12 }}>
        <Text className="progress-ring-text" style={{ fontSize: size * 0.3 }}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

export default function FamilyDashboardPage() {
  const {
    visitEvents,
    medications,
    medicationLogs,
    followUpReminders,
    patients,
    currentPatientId,
    loadFromStorage,
  } = useRecordStore();

  useDidShow(() => {
    loadFromStorage();
  });

  const patient = patients.find((p) => p.id === currentPatientId);

  const abnormalTests = useMemo(() => {
    const list: {
      name: string;
      value: string;
      reference: string;
      date: string;
      hospital: string;
      severity: string;
      direction: 'high' | 'low' | null;
    }[] = [];
    visitEvents.forEach((event) => {
      event.labResults?.forEach((item) => {
        if (item.isAbnormal) {
          let severity: 'mild' | 'moderate' | 'severe' = 'moderate';
          const v = item.value || '';
          if (v.includes('+++') || v.includes('++++') || v.includes('严重')) severity = 'severe';
          else if (v.includes('+') || v.includes('↑↑') || v.includes('↓↓')) severity = 'moderate';
          else severity = 'mild';
          let direction: 'high' | 'low' | null = null;
          if (v.startsWith('↑') || v.includes('高') || v.includes('超标')) direction = 'high';
          else if (v.startsWith('↓') || v.includes('低')) direction = 'low';
          list.push({
            name: item.name,
            value: item.value,
            reference: item.reference || '-',
            date: event.date,
            hospital: event.hospital,
            severity,
            direction,
          });
        }
      });
    });
    return list;
  }, [visitEvents]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = useMemo(() => {
    const list: { name: string; timeLabel: string; status: 'taken' | 'pending' }[] = [];
    medications
      .filter((m) => m.isActive && (!m.endDate || m.endDate >= todayStr) && m.startDate <= todayStr)
      .forEach((m) => {
        m.times.forEach((t) => {
          const scheduledTime = `${todayStr} ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
          const log = medicationLogs.find(
            (l) => l.medicationId === m.id && l.scheduledTime === scheduledTime && l.status === 'taken'
          );
          list.push({ name: m.name, timeLabel: t.label, status: log ? 'taken' : 'pending' });
        });
      });
    return list;
  }, [medications, medicationLogs, todayStr]);

  const medStats = useMemo(() => {
    const total = todayEntries.length;
    const taken = todayEntries.filter((e) => e.status === 'taken').length;
    return { total, taken, rate: total > 0 ? (taken / total) * 100 : 0, activeMeds: medications.filter((m) => m.isActive).length };
  }, [todayEntries, medications]);

  const upcomingFollowUps = useMemo(() => {
    return followUpReminders
      .filter((f) => !f.isCompleted)
      .map((f) => ({
        name: f.testItemName,
        date: f.followUpDate,
        daysUntil: Math.ceil((new Date(f.followUpDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [followUpReminders]);

  const recentRecords = useMemo(() => {
    return [...visitEvents].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [visitEvents]);

  const statCards = [
    { label: '病历总数', value: visitEvents.length, color: '#3b82f6', bg: '#eff6ff' },
    { label: '异常指标', value: abnormalTests.length, color: '#ef4444', bg: '#fee2e2' },
    { label: '就诊次数', value: visitEvents.length, color: '#0d9488', bg: '#ccfbf1' },
    { label: '今日用药', value: `${Math.round(medStats.rate)}%`, color: '#f59e0b', bg: '#fff7ed' },
  ];

  return (
    <View className="page-container">
      <ScrollView scrollY className="dash-scroll">
        {/* 患者名称 */}
        <View className="px-3 mt-3">
          <Text className="text-lg font-bold">{patient?.name || '家人'}的健康看板</Text>
        </View>

        {/* 统计卡片 */}
        <ScrollView scrollX className="dash-stat-scroll mt-3">
          <View className="dash-stat-row">
            {statCards.map((s, i) => (
              <View key={i} className="dash-stat-card" style={{ background: s.bg }}>
                <Text className="text-2xl font-bold" style={{ color: s.color }}>
                  {s.value}
                </Text>
                <Text className="text-xs mt-1" style={{ color: s.color, opacity: 0.8 }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* 异常指标 */}
        {abnormalTests.length > 0 && (
          <View className="px-3 mt-3">
            <View className="flex items-center justify-between mb-2">
              <Text className="text-base font-medium">异常指标</Text>
              <Text className="text-primary text-sm" onClick={() => Taro.navigateTo({ url: '/pages/abnormalTests/index' })}>
                查看全部 →
              </Text>
            </View>
            {abnormalTests.slice(0, 3).map((test, i) => (
              <View key={i} className="card mb-2">
                <View className="flex items-center justify-between">
                  <View>
                    <View className="flex items-center gap-2">
                      <Text className="text-sm font-medium">{test.name}</Text>
                      <Text
                        className="chip"
                        style={{
                          background: test.severity === 'severe' ? '#fee2e2' : '#ffedd5',
                          color: test.severity === 'severe' ? '#991b1b' : '#9a3412',
                        }}
                      >
                        {SEVERITY_LABELS[test.severity]}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 mt-1">
                      {test.value} · 参考: {test.reference}
                    </Text>
                  </View>
                  <View className="text-right">
                    <Text className="text-xs text-gray-500">{test.hospital}</Text>
                    <Text className="text-xs text-gray-500">{test.date}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 今日用药 */}
        {medStats.activeMeds > 0 && (
          <View className="px-3 mt-3">
            <Text className="text-base font-medium mb-2">今日用药</Text>
            <View className="card">
              <View className="flex items-center justify-between">
                <View>
                  <View className="flex items-baseline">
                    <Text className="text-2xl font-bold">{medStats.taken}</Text>
                    <Text className="text-base text-gray-500">/{medStats.total}</Text>
                  </View>
                  <Text className="text-xs text-gray-500 mt-1">正在服用 {medStats.activeMeds} 种药物</Text>
                </View>
                <ProgressRing progress={medStats.rate} size={64} />
              </View>
            </View>
          </View>
        )}

        {/* 复查提醒 */}
        {upcomingFollowUps.length > 0 && (
          <View className="px-3 mt-3">
            <Text className="text-base font-medium mb-2">复查提醒</Text>
            {upcomingFollowUps.map((up, i) => (
              <View key={i} className="card mb-2">
                <View className="flex items-center justify-between">
                  <Text className="text-sm">{up.name}</Text>
                  <Text
                    className="chip"
                    style={{
                      background: up.daysUntil <= 3 ? '#fee2e2' : '#ffedd5',
                      color: up.daysUntil <= 3 ? '#991b1b' : '#9a3412',
                    }}
                  >
                    {up.daysUntil > 0 ? `还剩 ${up.daysUntil} 天` : up.daysUntil === 0 ? '今天' : `逾期 ${Math.abs(up.daysUntil)} 天`}
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 mt-1">建议复查日期: {up.date}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 最近病历 */}
        {recentRecords.length > 0 && (
          <View className="px-3 mt-3 pb-6">
            <Text className="text-base font-medium mb-2">最近病历</Text>
            {recentRecords.map((rec) => (
              <View
                key={rec.id}
                className="card mb-2"
                onClick={() => Taro.navigateTo({ url: `/pages/ocrConfirm/index?mode=view&id=${rec.id}` })}
              >
                <View className="flex items-center justify-between">
                  <View className="flex items-center gap-3">
                    <View className="dash-record-icon">
                      <Text className="text-primary text-sm">📄</Text>
                    </View>
                    <View>
                      <Text className="text-sm font-medium">{rec.hospital}</Text>
                      <Text className="text-xs text-gray-500">{rec.department} · {rec.date}</Text>
                    </View>
                  </View>
                  <Text className="text-gray-400 text-sm">›</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
