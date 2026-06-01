import { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useRecordStore } from '../../stores/recordStore';
import { FREQUENCY_LABELS } from '../../utils/types';
import './index.css';

function ProgressRing({ progress, size = 80 }: { progress: number; size?: number }) {
  return (
    <View className="progress-ring" style={{ width: size, height: size, background: `conic-gradient(#3b82f6 0% ${progress}%, #e5e7eb ${progress}% 100%)` }}>
      <View className="progress-ring-inner" style={{ width: size - 16, height: size - 16 }}>
        <Text className="progress-ring-text">{Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

export default function MedicationsPage() {
  const {
    medications,
    medicationLogs,
    currentPatientId,
    loadFromStorage,
    addMedicationLog,
    updateMedication,
  } = useRecordStore();

  useDidShow(() => {
    loadFromStorage();
  });

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayEntries = useMemo(() => {
    const list: {
      id: string;
      medicationId: string;
      name: string;
      route: string;
      scheduledTime: string;
      timeLabel: string;
      hour: number;
      minute: number;
      status: 'taken' | 'pending';
    }[] = [];
    medications
      .filter((m) => m.isActive && (!m.endDate || m.endDate >= todayStr) && m.startDate <= todayStr)
      .forEach((m) => {
        m.times.forEach((t, i) => {
          const scheduledTime = `${todayStr} ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
          const log = medicationLogs.find(
            (l) => l.medicationId === m.id && l.scheduledTime === scheduledTime && l.status === 'taken'
          );
          list.push({
            id: `${m.id}-${scheduledTime}-${i}`,
            medicationId: m.id,
            name: m.name,
            route: m.route || '口服',
            scheduledTime,
            timeLabel: t.label,
            hour: t.hour,
            minute: t.minute,
            status: log ? 'taken' : 'pending',
          });
        });
      });
    return list.sort((a, b) => a.hour * 60 + a.minute - b.hour * 60 - b.minute);
  }, [medications, medicationLogs, todayStr]);

  const stats = useMemo(() => {
    const total = todayEntries.length;
    const taken = todayEntries.filter((e) => e.status === 'taken').length;
    const rate = total > 0 ? (taken / total) * 100 : 0;
    return { total, taken, pending: total - taken, rate };
  }, [todayEntries]);

  const activeMeds = medications.filter((m) => m.isActive);
  const inactiveMeds = medications.filter((m) => !m.isActive);

  const handleTake = (entry: typeof todayEntries[0]) => {
    const id = `${entry.medicationId}-${entry.scheduledTime}`;
    addMedicationLog({
      id,
      medicationId: entry.medicationId,
      patientId: currentPatientId || 'default',
      scheduledTime: entry.scheduledTime,
      takenAt: Date.now(),
      status: 'taken',
      notes: '',
    });
    Taro.showToast({ title: '已服用', icon: 'success' });
  };

  const toggleMed = (med: typeof activeMeds[0]) => {
    updateMedication(med.id, { isActive: !med.isActive });
  };

  const getNextTime = (med: typeof activeMeds[0]) => {
    if (med.times.length === 0) return null;
    return `${String(med.times[0].hour).padStart(2, '0')}:${String(med.times[0].minute).padStart(2, '0')}`;
  };

  return (
    <View className="page-container">
      <ScrollView scrollY className="med-scroll">
        {/* 今日概览 */}
        {stats.total > 0 && (
          <View className="card mt-3">
            <View className="flex items-center justify-between">
              <View>
                <Text className="text-sm text-gray-500">今日用药</Text>
                <View className="flex items-baseline mt-1">
                  <Text className="text-2xl font-bold">{stats.taken}</Text>
                  <Text className="text-base text-gray-500">/{stats.total}</Text>
                </View>
                <Text className="text-xs text-gray-500 mt-1">
                  {stats.pending > 0 ? `还有 ${stats.pending} 次待服` : '今日用药已完成 🎉'}
                </Text>
              </View>
              <ProgressRing progress={stats.rate} size={80} />
            </View>

            {todayEntries.length > 0 && (
              <View className="mt-3 pt-3" style={{ borderTop: '2rpx solid var(--gray-100)' }}>
                {todayEntries.map((entry) => (
                  <View key={entry.id} className="flex items-center justify-between py-2">
                    <View className="flex items-center gap-3">
                      <View className="med-route-icon">
                        <Text className="text-sm">💊</Text>
                      </View>
                      <View>
                        <Text className={`text-sm font-medium ${entry.status === 'taken' ? 'text-gray-400 line-through' : ''}`}>
                          {entry.name}
                        </Text>
                        <Text className="text-xs text-gray-500">{entry.timeLabel}</Text>
                      </View>
                    </View>
                    {entry.status === 'taken' ? (
                      <View className="med-check-circle">
                        <Text className="text-success text-xs">✓</Text>
                      </View>
                    ) : (
                      <View className="med-take-btn" onClick={() => handleTake(entry)}>
                        <Text className="text-xs text-primary">服用</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 药物列表 */}
        <View className="px-3 mt-3 pb-6">
          {medications.length === 0 ? (
            <View className="empty-state">
              <Text className="empty-icon">💊</Text>
              <Text className="text-gray-500 mt-2">暂无用药记录</Text>
              <View className="btn btn-primary mt-3" onClick={() => Taro.navigateTo({ url: '/pages/medicationForm/index' })}>
                <Text>添加药物</Text>
              </View>
            </View>
          ) : (
            <>
              <View className="flex items-center justify-between mb-2 px-1">
                <Text className="text-sm font-medium text-gray-600">进行中 ({activeMeds.length})</Text>
                <Text className="text-primary text-sm" onClick={() => Taro.navigateTo({ url: '/pages/medicationForm/index' })}>
                  + 添加
                </Text>
              </View>
              {activeMeds.map((med) => {
                const next = getNextTime(med);
                return (
                  <View
                    key={med.id}
                    className="card med-card"
                    onClick={() => Taro.navigateTo({ url: `/pages/medicationForm/index?id=${med.id}` })}
                  >
                    <View className="flex items-center justify-between">
                      <View className="flex items-center gap-3">
                        <View className="med-route-icon">
                          <Text className="text-sm">💊</Text>
                        </View>
                        <View>
                          <Text className="text-sm font-semibold">{med.name}</Text>
                          {med.specification && <Text className="text-xs text-gray-500">{med.specification}</Text>}
                          <View className="flex items-center gap-2 mt-1 flex-wrap">
                            <Text className="chip chip-gray">{FREQUENCY_LABELS[med.frequency] || med.frequency}</Text>
                            {next && <Text className="text-xs text-gray-500">{next}</Text>}
                          </View>
                        </View>
                      </View>
                      <View className="flex items-center gap-2">
                        <View
                          className={`med-switch ${med.isActive ? 'med-switch-on' : 'med-switch-off'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMed(med);
                          }}
                        >
                          <View className={`med-switch-knob ${med.isActive ? 'med-switch-knob-on' : ''}`} />
                        </View>
                        <Text className="text-gray-400 text-sm">›</Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {inactiveMeds.length > 0 && (
                <>
                  <Text className="text-sm font-medium text-gray-600 mt-4 mb-2 px-1">
                    已停用 ({inactiveMeds.length})
                  </Text>
                  {inactiveMeds.map((med) => (
                    <View
                      key={med.id}
                      className="card med-card opacity-60"
                      onClick={() => Taro.navigateTo({ url: `/pages/medicationForm/index?id=${med.id}` })}
                    >
                      <View className="flex items-center justify-between">
                        <View className="flex items-center gap-3">
                          <View className="med-route-icon-gray">
                            <Text className="text-sm">💊</Text>
                          </View>
                          <View>
                            <Text className="text-sm font-semibold">{med.name}</Text>
                            <Text className="chip chip-gray mt-1">{FREQUENCY_LABELS[med.frequency] || med.frequency}</Text>
                          </View>
                        </View>
                        <View
                          className="med-switch med-switch-off"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMed(med);
                          }}
                        >
                          <View className="med-switch-knob" />
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
