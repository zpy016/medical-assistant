import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useRecordStore } from '../../stores/recordStore';
import { SEVERITY_LABELS, SEVERITY_COLORS } from '../../utils/types';
import './index.css';

export default function AbnormalTestDetailPage() {
  const { visitEvents, followUpReminders, loadFromStorage, addFollowUpReminder, completeFollowUpReminder } = useRecordStore();
  const [params, setParams] = useState<{ recordId?: string; itemName?: string }>({});

  const [showSheet, setShowSheet] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [reminderDays, setReminderDays] = useState(3);
  const [reminderNotes, setReminderNotes] = useState('');

  useDidShow(() => {
    loadFromStorage();
    const instance = Taro.getCurrentInstance();
    const q = instance.router?.params || {};
    setParams({ recordId: q.recordId, itemName: q.itemName });
  });

  const recordId = params.recordId || '';
  const itemName = decodeURIComponent(params.itemName || '');

  const event = visitEvents.find((e) => e.id === recordId);
  const item = event?.labResults?.find((l) => l.name === itemName);

  const analysis = useMemo(() => {
    if (!item) return null;
    let severity: 'mild' | 'moderate' | 'severe' = 'moderate';
    const v = item.value || '';
    if (v.includes('+++') || v.includes('++++') || v.includes('严重')) severity = 'severe';
    else if (v.includes('+') || v.includes('↑↑') || v.includes('↓↓')) severity = 'moderate';
    else severity = 'mild';
    let direction: 'high' | 'low' | null = null;
    if (v.startsWith('↑') || v.includes('高') || v.includes('超标')) direction = 'high';
    else if (v.startsWith('↓') || v.includes('低')) direction = 'low';
    return { severity, direction };
  }, [item]);

  const trend = useMemo(() => {
    if (!itemName) return [];
    const list: { date: string; value: string; isAbnormal: boolean }[] = [];
    visitEvents.forEach((e) => {
      const found = e.labResults?.find((l) => l.name === itemName);
      if (found) {
        list.push({ date: e.date, value: found.value, isAbnormal: found.isAbnormal });
      }
    });
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [visitEvents, itemName]);

  const existingReminder = followUpReminders.find(
    (f) => f.recordId === recordId && f.testItemName === itemName
  );

  const handleSaveReminder = () => {
    if (!followUpDate) return;
    const id = existingReminder ? existingReminder.id : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    addFollowUpReminder({
      id,
      patientId: 'default',
      recordId,
      testItemName: itemName,
      abnormalValue: item?.value || '',
      referenceRange: item?.reference || '',
      abnormalDirection: analysis?.direction || 'high',
      followUpDate,
      reminderDays,
      isCompleted: false,
      notes: reminderNotes,
      createdAt: Date.now(),
    });
    setShowSheet(false);
    Taro.showToast({ title: '保存成功', icon: 'success' });
  };

  const handleComplete = () => {
    if (existingReminder) {
      completeFollowUpReminder(existingReminder.id);
      Taro.showToast({ title: '已标记复查', icon: 'success' });
    }
  };

  if (!event || !item || !analysis) {
    return (
      <View className="page-container">
        <Text className="text-gray-500 text-center mt-10">未找到检验数据</Text>
      </View>
    );
  }

  const color = SEVERITY_COLORS[analysis.severity] || '#f59e0b';

  return (
    <View className="page-container">
      <ScrollView scrollY className="detail-scroll">
        {/* 大数字 */}
        <View className="card detail-value-card">
          <Text className="text-2xl font-bold text-center" style={{ color }}>
            {item.value}
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            参考范围: {item.reference || '-'}
          </Text>
          <View className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <Text className="chip" style={{ background: '#ffedd5', color: '#9a3412' }}>
              {analysis.direction === 'high' ? '↑ 偏高' : analysis.direction === 'low' ? '↓ 偏低' : '异常'}
            </Text>
            <Text className="chip" style={{ background: '#fee2e2', color: '#991b1b' }}>
              {SEVERITY_LABELS[analysis.severity]}
            </Text>
          </View>
        </View>

        {/* 趋势列表 */}
        {trend.length > 1 && (
          <View className="card mt-3">
            <Text className="text-base font-medium mb-2">历史趋势</Text>
            {trend.map((t, i) => (
              <View key={i} className="trend-row">
                <Text className="text-sm text-gray-600">{t.date}</Text>
                <Text className={`text-sm font-medium ${t.isAbnormal ? 'text-danger' : 'text-success'}`}>
                  {t.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 来源 */}
        <View className="card mt-3">
          <Text className="text-base font-medium mb-2">来源病历</Text>
          <View className="flex items-center gap-3">
            <View className="detail-icon-bg">
              <Text className="text-primary text-lg">📄</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium">{event.hospital}</Text>
              <Text className="text-xs text-gray-500">
                {event.department} · {event.date}
              </Text>
            </View>
          </View>
        </View>

        {/* 复查提醒 */}
        <View className="card mt-3 mb-4">
          <Text className="text-base font-medium mb-2">复查提醒</Text>
          {existingReminder && !existingReminder.isCompleted ? (
            <View>
              <View className="flex items-center gap-2 mb-2">
                <Text className="text-sm">建议复查日期:</Text>
                <Text className="text-sm font-bold">{existingReminder.followUpDate}</Text>
              </View>
              <View className="flex items-center gap-2 mb-2">
                <Text className="text-sm">提前提醒:</Text>
                <Text className="text-sm font-bold">{existingReminder.reminderDays} 天</Text>
              </View>
              {existingReminder.notes && (
                <View className="detail-note-box mb-3">
                  <Text className="text-xs text-gray-600">{existingReminder.notes}</Text>
                </View>
              )}
              <View className="flex gap-2">
                <View className="btn btn-outline flex-1" onClick={() => setShowSheet(true)}>
                  <Text>修改提醒</Text>
                </View>
                <View className="btn btn-primary flex-1" onClick={handleComplete}>
                  <Text>标记已复查</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="text-center py-2">
              <Text className="text-sm text-gray-500 mb-2">
                {existingReminder?.isCompleted ? '已标记为已复查' : '尚未设置复查提醒'}
              </Text>
              {!existingReminder?.isCompleted && (
                <View className="btn btn-primary inline-block px-6" onClick={() => setShowSheet(true)}>
                  <Text>设置复查提醒</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 设置提醒 BottomSheet */}
      {showSheet && (
        <View className="detail-modal">
          <View className="detail-overlay" onClick={() => setShowSheet(false)} />
          <View className="detail-sheet">
            <Text className="text-lg font-bold mb-3">设置复查提醒</Text>
            <View className="mb-3">
              <Text className="text-sm text-gray-700 mb-1">复查日期</Text>
              <Picker mode="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.detail.value as string)}>
                <View className="detail-picker">{followUpDate || '请选择日期'}</View>
              </Picker>
            </View>
            <View className="mb-3">
              <Text className="text-sm text-gray-700 mb-1">提前提醒天数</Text>
              <View className="flex gap-2">
                {[1, 3, 7].map((d) => (
                  <View
                    key={d}
                    className={`filter-chip ${reminderDays === d ? 'filter-chip-active' : ''}`}
                    onClick={() => setReminderDays(d)}
                  >
                    <Text>{d} 天前</Text>
                  </View>
                ))}
              </View>
            </View>
            <View className="mb-3">
              <Text className="text-sm text-gray-700 mb-1">备注</Text>
              <textarea
                className="detail-textarea"
                value={reminderNotes}
                onInput={(e) => setReminderNotes((e.target as any).value)}
                placeholder="如：空腹检查、带身份证等"
                rows={3}
              />
            </View>
            <View className="btn btn-primary" onClick={handleSaveReminder}>
              <Text>保存提醒</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
