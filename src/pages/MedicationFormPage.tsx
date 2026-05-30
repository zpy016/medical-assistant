/**
 * P1-01: 添加/编辑药物
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import BottomSheet from '../components/ui/BottomSheet';
import { Plus, X, Clock } from 'lucide-react';
import type { MedicationReminder, MedicationReminderTime, MedicationFrequency } from '../types';
import { addMedication, updateMedication, getMedications, generateMedicationLogs } from '../db';

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
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const isEdit = id && id !== 'new';
  const { currentPatientId } = useRecordStore();

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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [pickerHour, setPickerHour] = useState(8);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerLabel, setPickerLabel] = useState('早餐后');

  useEffect(() => {
    if (isEdit && id) {
      const load = async () => {
        const meds = await getMedications(currentPatientId ?? undefined);
        const med = meds.find(m => m.id === id);
        if (med) {
          setName(med.name);
          setSpecification(med.specification ?? '');
          setDosage(med.dosage ?? '');
          setFrequency(med.frequency);
          setTimes(med.times);
          setStartDate(med.startDate);
          setEndDate(med.endDate ?? '');
          setIsLongTerm(!med.endDate);
          setRoute(med.route ?? '口服');
          setNotes(med.notes ?? '');
        }
      };
      load();
    }
  }, [isEdit, id, currentPatientId]);

  // 频率改变时调整时间数量
  useEffect(() => {
    const option = FREQUENCY_OPTIONS.find(o => o.value === frequency);
    if (!option) return;

    const targetCount = option.defaultTimes;
    setTimes(prev => {
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

  const openTimePicker = (index: number) => {
    const t = times[index];
    setEditingTimeIndex(index);
    setPickerHour(t.hour);
    setPickerMinute(t.minute);
    setPickerLabel(t.label);
    setShowTimePicker(true);
  };

  const saveTime = () => {
    if (editingTimeIndex === null) return;
    const newTimes = [...times];
    newTimes[editingTimeIndex] = { hour: pickerHour, minute: pickerMinute, label: pickerLabel };
    setTimes(newTimes);
    setShowTimePicker(false);
    setEditingTimeIndex(null);
  };

  const addTime = () => {
    setTimes([...times, { hour: 8, minute: 0, label: '自定义' }]);
  };

  const removeTime = (index: number) => {
    if (times.length <= 1) return;
    setTimes(times.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (!currentPatientId) return;

    const medication: MedicationReminder = {
      id: isEdit ? id! : crypto.randomUUID(),
      patientId: currentPatientId,
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
      await updateMedication(id!, medication);
    } else {
      await addMedication(medication);
      await generateMedicationLogs(medication);
    }

    navigate('/medications');
  };

  return (
    <div className="min-h-full bg-[var(--color-bg)] animate-fade-in">
      <PageHeader
        title={isEdit ? '编辑药物' : '添加药物'}
        onBack={() => navigate(-1)}
      />

      <div className="px-4 pt-4 pb-20 space-y-3">
        {/* 基本信息 */}
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">药品名称 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：阿司匹林"
                className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">规格</label>
              <input
                type="text"
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
                placeholder="如：0.5g/片"
                className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">每次剂量</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="如：1片"
                className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* 服用频率 */}
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">服用频率</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as MedicationFrequency)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-white"
              >
                {FREQUENCY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* 服用时间 */}
            {frequency !== 'as_needed' && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">服用时间</label>
                <div className="space-y-2">
                  {times.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        onClick={() => openTimePicker(i)}
                        className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50"
                      >
                        <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
                        <span>{String(t.hour).padStart(2, '0')}:{String(t.minute).padStart(2, '0')}</span>
                        <span className="text-[var(--color-text-muted)]">·</span>
                        <span className="text-[var(--color-text-muted)]">{t.label}</span>
                      </button>
                      {times.length > 1 && (
                        <button
                          onClick={() => removeTime(i)}
                          className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addTime}
                    className="flex items-center gap-1 text-sm text-[var(--color-primary)] py-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加时间
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 日期 */}
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="longTerm"
                checked={isLongTerm}
                onChange={(e) => setIsLongTerm(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-primary)]"
              />
              <label htmlFor="longTerm" className="text-sm text-[var(--color-text)]">长期服用</label>
            </div>
            {!isLongTerm && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              </div>
            )}
          </div>
        </Card>

        {/* 其他 */}
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">服用方式</label>
              <div className="flex gap-2 flex-wrap">
                {ROUTES.map(r => (
                  <button
                    key={r}
                    onClick={() => setRoute(r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      route === r
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-gray-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">备注</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="如：饭后服用、与某某药间隔2小时"
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              />
            </div>
          </div>
        </Card>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-3.5 text-sm font-medium text-white bg-[var(--color-primary)] rounded-xl touch-feedback disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEdit ? '保存修改' : '添加药物'}
        </button>
      </div>

      {/* 时间选择 BottomSheet */}
      <BottomSheet
        isOpen={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        title="选择服用时间"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">时</label>
              <input
                type="number"
                min={0}
                max={23}
                value={pickerHour}
                onChange={(e) => setPickerHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-16 h-16 text-center text-2xl font-bold border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <span className="text-2xl font-bold text-[var(--color-text-muted)]">:</span>
            <div className="text-center">
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">分</label>
              <input
                type="number"
                min={0}
                max={59}
                value={pickerMinute}
                onChange={(e) => setPickerMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-16 h-16 text-center text-2xl font-bold border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">标签</label>
            <div className="flex gap-2 flex-wrap">
              {TIME_LABELS.map(l => (
                <button
                  key={l}
                  onClick={() => setPickerLabel(l)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    pickerLabel === l
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-gray-50'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={saveTime}
            className="w-full py-3 text-sm font-medium text-white bg-[var(--color-primary)] rounded-xl touch-feedback"
          >
            确定
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
