import { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useRecordStore } from '../../stores/recordStore';
import { LabResult, SEVERITY_LABELS, SEVERITY_COLORS } from '../../utils/types';
import './index.css';

function analyzeLabResult(item: LabResult) {
  let severity: 'mild' | 'moderate' | 'severe' = 'moderate';
  if (item.isAbnormal) {
    const v = item.value || '';
    if (v.includes('+++') || v.includes('++++') || v.includes('严重')) severity = 'severe';
    else if (v.includes('+') || v.includes('↑↑') || v.includes('↓↓')) severity = 'moderate';
    else severity = 'mild';
  }
  let direction: 'high' | 'low' | null = null;
  const v = item.value || '';
  if (v.startsWith('↑') || v.includes('高') || v.includes('超标')) direction = 'high';
  else if (v.startsWith('↓') || v.includes('低')) direction = 'low';
  return { severity, direction };
}

export default function AbnormalTestsPage() {
  const {
    visitEvents,
    followUpReminders,
    loadFromStorage,
    addFollowUpReminder,
    completeFollowUpReminder,
  } = useRecordStore();

  const [severityFilter, setSeverityFilter] = useState<'all' | 'severe' | 'moderate' | 'mild'>('all');
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useDidShow(() => {
    loadFromStorage();
  });

  const allAbnormal = useMemo(() => {
    const list: {
      eventId: string;
      hospital: string;
      date: string;
      item: LabResult;
      severity: string;
      direction: 'high' | 'low' | null;
    }[] = [];
    visitEvents.forEach((event) => {
      event.labResults?.forEach((item) => {
        if (item.isAbnormal) {
          const analysis = analyzeLabResult(item);
          list.push({
            eventId: event.id,
            hospital: event.hospital,
            date: event.date,
            item,
            severity: analysis.severity,
            direction: analysis.direction,
          });
        }
      });
    });
    return list;
  }, [visitEvents]);

  const filtered = useMemo(() => {
    return allAbnormal.filter((a) => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      const reminder = followUpReminders.find(
        (f) => f.recordId === a.eventId && f.testItemName === a.item.name
      );
      if (followUpFilter === 'pending') {
        return !!reminder && !reminder.isCompleted;
      }
      if (followUpFilter === 'completed') {
        return !!reminder && reminder.isCompleted;
      }
      return true;
    });
  }, [allAbnormal, severityFilter, followUpFilter, followUpReminders]);

  const stats = useMemo(() => {
    const severe = allAbnormal.filter((a) => a.severity === 'severe').length;
    const pending = followUpReminders.filter((f) => !f.isCompleted).length;
    return { total: allAbnormal.length, severe, pending };
  }, [allAbnormal, followUpReminders]);

  const handleSetReminder = (test: typeof allAbnormal[0]) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 7);
    addFollowUpReminder({
      id,
      patientId: 'default',
      recordId: test.eventId,
      testItemName: test.item.name,
      abnormalValue: test.item.value,
      referenceRange: test.item.reference || '',
      abnormalDirection: test.direction || 'high',
      followUpDate: followUpDate.toISOString().split('T')[0],
      reminderDays: 3,
      isCompleted: false,
      notes: '',
      createdAt: Date.now(),
    });
    Taro.showToast({ title: '已设置复查提醒', icon: 'success' });
  };

  const handleComplete = (reminderId: string) => {
    completeFollowUpReminder(reminderId);
    Taro.showToast({ title: '已标记复查', icon: 'success' });
  };

  const getReminder = (eventId: string, itemName: string) =>
    followUpReminders.find((f) => f.recordId === eventId && f.testItemName === itemName);

  const groups = [
    { key: 'severe', label: '严重异常' },
    { key: 'moderate', label: '中度异常' },
    { key: 'mild', label: '轻度异常' },
  ] as const;

  return (
    <View className="page-container">
      {/* 统计 */}
      <View className="stats-row-ab px-3 py-3">
        <View className="stat-card-ab">
          <Text className="stat-num-ab text-danger">{stats.total}</Text>
          <Text className="stat-label-ab">异常指标</Text>
        </View>
        <View className="stat-card-ab">
          <Text className="stat-num-ab text-danger">{stats.severe}</Text>
          <Text className="stat-label-ab">严重异常</Text>
        </View>
        <View className="stat-card-ab">
          <Text className="stat-num-ab text-warning">{stats.pending}</Text>
          <Text className="stat-label-ab">待复查</Text>
        </View>
      </View>

      {/* 筛选 */}
      <View className="filter-bar-ab px-3 mb-2">
        <ScrollView scrollX className="filter-scroll">
          <View className="filter-chips-row">
            {(['all', 'severe', 'moderate', 'mild'] as const).map((s) => (
              <View
                key={s}
                className={`filter-chip-ab ${severityFilter === s ? 'filter-chip-ab-active' : ''}`}
                onClick={() => setSeverityFilter(s)}
              >
                <Text>{s === 'all' ? '全部' : SEVERITY_LABELS[s]}</Text>
              </View>
            ))}
            {(['all', 'pending', 'completed'] as const).map((f) => (
              <View
                key={f}
                className={`filter-chip-ab ${followUpFilter === f ? 'filter-chip-ab-active' : ''}`}
                onClick={() => setFollowUpFilter(f)}
              >
                <Text>{f === 'all' ? '全部状态' : f === 'pending' ? '待复查' : '已复查'}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 列表 */}
      <ScrollView scrollY className="ab-list">
        {filtered.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-icon">🔬</Text>
            <Text className="text-gray-500 mt-2">暂无异常指标</Text>
          </View>
        ) : (
          groups.map((g) => {
            const items = filtered.filter((a) => a.severity === g.key);
            if (items.length === 0) return null;
            return (
              <View key={g.key} className="ab-group">
                <Text className="ab-group-title">{g.label}</Text>
                {items.map((test, idx) => {
                  const reminder = getReminder(test.eventId, test.item.name);
                  const daysUntil = reminder
                    ? Math.ceil(
                        (new Date(reminder.followUpDate).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : null;
                  return (
                    <View
                      key={`${test.eventId}-${test.item.name}-${idx}`}
                      className="card ab-card"
                      onClick={() =>
                        Taro.navigateTo({
                          url: `/pages/abnormalTestDetail/index?recordId=${test.eventId}&itemName=${encodeURIComponent(
                            test.item.name
                          )}`,
                        })
                      }
                    >
                      <View className="flex items-center justify-between">
                        <View className="flex-1">
                          <View className="flex items-center flex-wrap gap-2 mb-1">
                            <Text className="text-base font-medium">{test.item.name}</Text>
                            <Text
                              className="chip"
                              style={{
                                background:
                                  g.key === 'severe'
                                    ? '#fee2e2'
                                    : g.key === 'moderate'
                                    ? '#ffedd5'
                                    : '#fef3c7',
                                color:
                                  g.key === 'severe'
                                    ? '#991b1b'
                                    : g.key === 'moderate'
                                    ? '#9a3412'
                                    : '#92400e',
                              }}
                            >
                              {SEVERITY_LABELS[test.severity]}
                            </Text>
                          </View>
                          <View className="flex items-baseline gap-2">
                            <Text
                              className="text-lg font-bold"
                              style={{ color: SEVERITY_COLORS[test.severity] || '#f59e0b' }}
                            >
                              {test.item.value}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              参考: {test.item.reference || '-'}
                            </Text>
                          </View>
                          <View className="flex items-center gap-3 mt-2">
                            <Text className="text-xs text-gray-500">{test.hospital}</Text>
                            <Text className="text-xs text-gray-500">{test.date}</Text>
                            {test.direction && (
                              <Text
                                className="text-xs font-medium"
                                style={{ color: SEVERITY_COLORS[test.severity] || '#f59e0b' }}
                              >
                                {test.direction === 'high' ? '↑ 偏高' : '↓ 偏低'}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View className="ab-action">
                          {reminder ? (
                            reminder.isCompleted ? (
                              <Text className="text-success text-xs">已复查</Text>
                            ) : (
                              <View className="ab-reminder-col">
                                <Text
                                  className="chip"
                                  style={{
                                    background: daysUntil !== null && daysUntil <= 3 ? '#fee2e2' : '#ffedd5',
                                    color: daysUntil !== null && daysUntil <= 3 ? '#991b1b' : '#9a3412',
                                  }}
                                >
                                  {daysUntil !== null && daysUntil > 0
                                    ? `还剩 ${daysUntil} 天`
                                    : daysUntil === 0
                                    ? '今天复查'
                                    : `逾期 ${Math.abs(daysUntil)} 天`}
                                </Text>
                                <Text
                                  className="text-primary text-xs mt-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleComplete(reminder.id);
                                  }}
                                >
                                  标记已复查
                                </Text>
                              </View>
                            )
                          ) : (
                            <Text
                              className="text-primary text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetReminder(test);
                              }}
                            >
                              设复查提醒
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
