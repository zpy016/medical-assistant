import { useState, useEffect } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useRecordStore } from '../../stores/recordStore';
import { FREQUENCY_LABELS, MedicationFrequency, MedicationReminderTime } from '../../utils/types';
import './index.css';

const FREQUENCY_OPTIONS: { value: MedicationFrequency; label: string; defaultTimes: number }[] = [
  { value: 'once_daily', label: '每日1次', defaultTimes: 1 },
  { value: 'twice_daily', label: '每日2次', defaultTimes: 2 },
  { value: 'three_times', label: '每日3次', defaultTimes: 3 },
  { value: 'four_times', label: '每日4次', defaultTimes: 4 },
  { value: 'before_bed', label: '睡前', defaultTimes: 1 },
  { value: 'every_other_day', label: '隔日1次', defaultTimes: 1 },
  { value: 'weekly', label: '每周1次', defaultTimes: 1 },
  { value: 'as_needed', label: '按需', defaultTimes: 0 },
  { value: 'custom', label: '自定义', defaultTimes: 1 },
];

const TIME_LABELS = ['早餐前', '早餐后', '午餐前', '午餐后', '晚餐前', '晚餐后', '睡前', '自定义'];
const ROUTES = ['口服', '外用', '注射', '含服', '吸入', '其他'];

export default function MedicationFormPage() {
  const { medications, addMedication, updateMedication, loadFromStorage } = useRecordStore();
  const [params, setParams] = useState<{ id?: string }>({});

  const [name, setName] = useState('');
  const [specification, setSpecification] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<MedicationFrequency>('once_daily');
  const [times, setTimes] = useState<MedicationReminderTime[]>([{ hour: 8, minute: 0, label: '早餐后' }]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [isLongTerm, setIsLongTerm] = useState(true);
  const [route, setRoute] = useState('口服');
  const [notes, setNotes] = useState('');

  useDidShow(() => {
    loadFromStorage();
    const instance = Taro.getCurrentInstance();
    const q = instance.router?.params || {};
    setParams({ id: q.id });
  });

  const isEdit = params.id && params.id !== 'new';

  useEffect(() => {
    if (isEdit && params.id) {
      const med = medications.find((m) => m.id === params.id);
      if (med) {
        setName(med.name);
        setSpecification(med.specification || '');
        setDosage(med.dosage || '');
        setFrequency(med.frequency);
        setTimes(med.times);
        setStartDate(med.startDate);
        setEndDate(med.endDate || '');
        setIsLongTerm(!med.endDate);
        setRoute(med.route || '口服');
        setNotes(med.notes || '');
      }
    }
  }, [isEdit, params.id, medications]);

  useEffect(() => {
    const option = FREQUENCY_OPTIONS.find((o) => o.value === frequency);
    if (!option) return;
    const targetCount = option.defaultTimes;
    setTimes((prev) => {
      if (prev.length === targetCount) return prev;
      if (prev.length < targetCount) {
        const newTimes = [...prev];
        const defaultHours = [8, 12, 18, 21];
        for (let i = prev.length; i < targetCount; i++) {
          newTimes.push({ hour: defaultHours[i] ?? 8, minute: 0, label: TIME_LABELS[i] ?? '自定义' });
        }
        return newTimes;
      }
      return prev.slice(0, targetCount);
    });
  }, [frequency]);

  const handleSave = () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入药品名称', icon: 'none' });
      return;
    }
    const med = {
      id: isEdit ? params.id! : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      patientId: 'default',
      name: name.trim(),
      specification: specification.trim() || undefined,
      dosage: dosage.trim() || undefined,
      frequency,
      times,
      startDate,
      endDate: isLongTerm ? undefined : endDate,
      route: route || undefined,
      notes: notes.trim() || undefined,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (isEdit) {
      updateMedication(params.id!, med);
    } else {
      addMedication(med);
    }
    Taro.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 800);
  };

  const updateTime = (index: number, field: 'hour' | 'minute' | 'label', value: string | number) => {
    const newTimes = [...times];
    if (field === 'label') {
      newTimes[index] = { ...newTimes[index], label: value as string };
    } else {
      const num = parseInt(value as string, 10) || 0;
      newTimes[index] = { ...newTimes[index], [field]: num };
    }
    setTimes(newTimes);
  };

  const addTime = () => {
    setTimes([...times, { hour: 8, minute: 0, label: '自定义' }]);
  };

  const removeTime = (index: number) => {
    if (times.length <= 1) return;
    setTimes(times.filter((_, i) => i !== index));
  };

  const freqIndex = FREQUENCY_OPTIONS.findIndex((o) => o.value === frequency);
  const timeStr = (t: MedicationReminderTime) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;

  return (
    <View className="page-container">
      <View className="form-scroll">
        {/* 基本信息 */}
        <View className="card mt-3">
          <View className="form-field">
            <Text className="form-label">药品名称 *</Text>
            <input className="form-input" value={name} onInput={(e) => setName((e.target as any).value)} placeholder="如：阿司匹林" />
          </View>
          <View className="form-field mt-2">
            <Text className="form-label">规格</Text>
            <input className="form-input" value={specification} onInput={(e) => setSpecification((e.target as any).value)} placeholder="如：0.5g/片" />
          </View>
          <View className="form-field mt-2">
            <Text className="form-label">每次剂量</Text>
            <input className="form-input" value={dosage} onInput={(e) => setDosage((e.target as any).value)} placeholder="如：1片" />
          </View>
        </View>

        {/* 频率 */}
        <View className="card mt-3">
          <View className="form-field">
            <Text className="form-label">服用频率</Text>
            <Picker mode="selector" range={FREQUENCY_OPTIONS.map((o) => o.label)} value={freqIndex} onChange={(e) => setFrequency(FREQUENCY_OPTIONS[Number(e.detail.value)].value)}>
              <View className="form-picker">{FREQUENCY_LABELS[frequency]}</View>
            </Picker>
          </View>

          {frequency !== 'as_needed' && (
            <View className="form-field mt-2">
              <Text className="form-label">服用时间</Text>
              {times.map((t, i) => (
                <View key={i} className="flex items-center gap-2 mt-2">
                  <Picker mode="time" value={timeStr(t)} onChange={(e) => {
                    const [h, m] = (e.detail.value as string).split(':').map(Number);
                    const newTimes = [...times];
                    newTimes[i] = { ...newTimes[i], hour: h, minute: m };
                    setTimes(newTimes);
                  }}>
                    <View className="form-picker flex-1">{timeStr(t)}</View>
                  </Picker>
                  <Picker mode="selector" range={TIME_LABELS} value={TIME_LABELS.indexOf(t.label)} onChange={(e) => updateTime(i, 'label', TIME_LABELS[Number(e.detail.value)])}>
                    <View className="form-picker flex-1">{t.label}</View>
                  </Picker>
                  {times.length > 1 && (
                    <Text className="text-danger text-sm px-2" onClick={() => removeTime(i)}>删除</Text>
                  )}
                </View>
              ))}
              <Text className="text-primary text-sm mt-2" onClick={addTime}>+ 添加时间</Text>
            </View>
          )}
        </View>

        {/* 日期 */}
        <View className="card mt-3">
          <View className="form-field">
            <Text className="form-label">开始日期</Text>
            <Picker mode="date" value={startDate} onChange={(e) => setStartDate(e.detail.value as string)}>
              <View className="form-picker">{startDate}</View>
            </Picker>
          </View>
          <View className="flex items-center gap-2 mt-2" onClick={() => setIsLongTerm(!isLongTerm)}>
            <View className={`form-checkbox ${isLongTerm ? 'form-checkbox-checked' : ''}`}>
              {isLongTerm && <Text className="text-white text-xs">✓</Text>}
            </View>
            <Text className="text-sm text-gray-700">长期服用</Text>
          </View>
          {!isLongTerm && (
            <View className="form-field mt-2">
              <Text className="form-label">结束日期</Text>
              <Picker mode="date" value={endDate} onChange={(e) => setEndDate(e.detail.value as string)}>
                <View className="form-picker">{endDate || '请选择'}</View>
              </Picker>
            </View>
          )}
        </View>

        {/* 其他 */}
        <View className="card mt-3">
          <View className="form-field">
            <Text className="form-label">服用方式</Text>
            <View className="flex flex-wrap gap-2 mt-1">
              {ROUTES.map((r) => (
                <View key={r} className={`filter-chip ${route === r ? 'filter-chip-active' : ''}`} onClick={() => setRoute(r)}>
                  <Text>{r}</Text>
                </View>
              ))}
            </View>
          </View>
          <View className="form-field mt-2">
            <Text className="form-label">备注</Text>
            <textarea className="form-textarea" value={notes} onInput={(e) => setNotes((e.target as any).value)} placeholder="如：饭后服用、与某某药间隔2小时" rows={3} />
          </View>
        </View>

        <View className="btn btn-primary mt-3 mb-6" onClick={handleSave}>
          <Text>{isEdit ? '保存修改' : '添加药物'}</Text>
        </View>
      </View>
    </View>
  );
}
