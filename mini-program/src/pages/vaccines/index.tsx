import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useRecordStore } from '../../stores/recordStore';
import { VaccinationRecord } from '../../utils/types';
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

function generateSampleVaccines(patientId: string): VaccinationRecord[] {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const records: VaccinationRecord[] = [
    { id: 'v1', patientId, vaccineId: 'v1', vaccineName: '乙肝疫苗', doseNumber: 1, scheduledDate: fmt(new Date(today.getTime() - 30 * 86400000)), status: 'completed', category: 'national', createdAt: Date.now(), updatedAt: Date.now(), actualDate: fmt(new Date(today.getTime() - 30 * 86400000)) },
    { id: 'v2', patientId, vaccineId: 'v1', vaccineName: '乙肝疫苗', doseNumber: 2, scheduledDate: fmt(new Date(today.getTime() + 30 * 86400000)), status: 'pending', category: 'national', createdAt: Date.now(), updatedAt: Date.now() },
    { id: 'v3', patientId, vaccineId: 'v2', vaccineName: '卡介苗', doseNumber: 1, scheduledDate: fmt(new Date(today.getTime() - 25 * 86400000)), status: 'completed', category: 'national', createdAt: Date.now(), updatedAt: Date.now(), actualDate: fmt(new Date(today.getTime() - 25 * 86400000)) },
    { id: 'v4', patientId, vaccineId: 'v3', vaccineName: '脊髓灰质炎疫苗', doseNumber: 1, scheduledDate: fmt(new Date(today.getTime() - 5 * 86400000)), status: 'pending', category: 'national', createdAt: Date.now(), updatedAt: Date.now() },
    { id: 'v5', patientId, vaccineId: 'v4', vaccineName: '百白破疫苗', doseNumber: 1, scheduledDate: fmt(new Date(today.getTime() - 10 * 86400000)), status: 'overdue', category: 'national', createdAt: Date.now(), updatedAt: Date.now() },
    { id: 'v6', patientId, vaccineId: 'v5', vaccineName: '流感疫苗', doseNumber: 1, scheduledDate: fmt(new Date(today.getTime() + 15 * 86400000)), status: 'pending', category: 'optional', createdAt: Date.now(), updatedAt: Date.now() },
  ];
  return records;
}

type VaccineTab = 'national' | 'optional' | 'all';

export default function VaccinesPage() {
  const { vaccinationRecords, setVaccinationRecords, updateVaccinationRecord, loadFromStorage } = useRecordStore();
  const [activeTab, setActiveTab] = useState<VaccineTab>('national');
  const [showSheet, setShowSheet] = useState(false);
  const [registering, setRegistering] = useState<VaccinationRecord | null>(null);
  const [actualDate, setActualDate] = useState('');
  const [site, setSite] = useState('');
  const [batch, setBatch] = useState('');
  const [reaction, setReaction] = useState('');

  useDidShow(() => {
    loadFromStorage();
  });

  useEffect(() => {
    if (vaccinationRecords.length === 0) {
      const sample = generateSampleVaccines('default');
      setVaccinationRecords(sample);
    }
  }, [vaccinationRecords.length, setVaccinationRecords]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return vaccinationRecords;
    return vaccinationRecords.filter((r) => r.category === activeTab);
  }, [vaccinationRecords, activeTab]);

  const stats = useMemo(() => {
    const total = vaccinationRecords.length;
    const completed = vaccinationRecords.filter((r) => r.status === 'completed').length;
    const rate = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, rate };
  }, [vaccinationRecords]);

  const grouped = useMemo(() => {
    const g: Record<string, VaccinationRecord[]> = {};
    filtered.forEach((r) => {
      if (!g[r.vaccineName]) g[r.vaccineName] = [];
      g[r.vaccineName].push(r);
    });
    return g;
  }, [filtered]);

  const handleRegister = (record: VaccinationRecord) => {
    setRegistering(record);
    setActualDate(new Date().toISOString().split('T')[0]);
    setSite('');
    setBatch('');
    setReaction('');
    setShowSheet(true);
  };

  const handleSaveRegister = () => {
    if (!registering || !actualDate) return;
    updateVaccinationRecord(registering.id, {
      status: 'completed',
      actualDate,
      vaccinationSite: site || undefined,
      batchNumber: batch || undefined,
      reaction: reaction || undefined,
    });
    setShowSheet(false);
    Taro.showToast({ title: '登记成功', icon: 'success' });
  };

  return (
    <View className="page-container">
      <ScrollView scrollY className="vax-scroll">
        {/* 进度 */}
        <View className="card mt-3">
          <View className="flex items-center justify-between">
            <View>
              <Text className="text-sm text-gray-500">接种进度</Text>
              <View className="flex items-baseline mt-1">
                <Text className="text-2xl font-bold">{stats.completed}</Text>
                <Text className="text-base text-gray-500">/{stats.total}</Text>
              </View>
              <Text className="text-xs text-gray-500 mt-1">
                {stats.completed === stats.total ? '全部完成 🎉' : '继续加油'}
              </Text>
            </View>
            <ProgressRing progress={stats.rate} size={80} />
          </View>
        </View>

        {/* Tabs */}
        <View className="vax-tabs mt-3">
          {([
            { key: 'national' as VaccineTab, label: '一类疫苗' },
            { key: 'optional' as VaccineTab, label: '二类疫苗' },
            { key: 'all' as VaccineTab, label: '全部' },
          ]).map((tab) => (
            <View
              key={tab.key}
              className={`vax-tab ${activeTab === tab.key ? 'vax-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Text>{tab.label}</Text>
            </View>
          ))}
        </View>

        {/* 列表 */}
        <View className="px-3 mt-3 pb-6">
          {Object.keys(grouped).length === 0 ? (
            <View className="empty-state">
              <Text className="empty-icon">💉</Text>
              <Text className="text-gray-500 mt-2">暂无疫苗记录</Text>
            </View>
          ) : (
            Object.entries(grouped).map(([vaccineName, doses]) => {
              const completedCount = doses.filter((d) => d.status === 'completed').length;
              return (
                <View key={vaccineName} className="vax-group">
                  <Text className="vax-group-title">
                    {vaccineName}
                    <Text className="vax-group-sub"> ({completedCount}/{doses.length}剂)</Text>
                  </Text>
                  <View className="vax-timeline">
                    {doses.map((dose) => {
                      const isCompleted = dose.status === 'completed';
                      const isOverdue = dose.status === 'overdue';
                      return (
                        <View key={dose.id} className="vax-dose-row">
                          <View className="vax-dot-wrap">
                            <View className={`vax-dot ${isCompleted ? 'vax-dot-completed' : isOverdue ? 'vax-dot-overdue' : ''}`} />
                          </View>
                          <View
                            className={`card vax-dose-card ${!isCompleted ? 'vax-dose-card-active' : ''}`}
                            onClick={() => !isCompleted && handleRegister(dose)}
                          >
                            <View className="flex items-center justify-between">
                              <View>
                                <View className="flex items-center gap-2">
                                  <Text className="text-sm font-medium">第{dose.doseNumber}剂</Text>
                                  <Text
                                    className="chip"
                                    style={{
                                      background: isCompleted ? '#dcfce7' : isOverdue ? '#fee2e2' : '#f3f4f6',
                                      color: isCompleted ? '#166534' : isOverdue ? '#991b1b' : '#4b5563',
                                    }}
                                  >
                                    {isCompleted ? '已接种' : isOverdue ? '已逾期' : '待接种'}
                                  </Text>
                                </View>
                                <Text className="text-xs text-gray-500 mt-1">
                                  计划: {dose.scheduledDate}
                                  {dose.actualDate ? ` · 实际: ${dose.actualDate}` : ''}
                                </Text>
                                {dose.vaccinationSite && (
                                  <Text className="text-xs text-gray-500 mt-1">📍 {dose.vaccinationSite}</Text>
                                )}
                              </View>
                              {!isCompleted && <Text className="text-gray-400 text-sm">›</Text>}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 登记 BottomSheet */}
      {showSheet && registering && (
        <View className="vax-modal">
          <View className="vax-overlay" onClick={() => setShowSheet(false)} />
          <View className="vax-sheet">
            <Text className="text-lg font-bold mb-3">
              登记 {registering.vaccineName} 第{registering.doseNumber}剂
            </Text>
            <View className="form-field mb-3">
              <Text className="form-label">实际接种日期 *</Text>
              <Picker mode="date" value={actualDate} onChange={(e) => setActualDate(e.detail.value as string)}>
                <View className="form-picker">{actualDate}</View>
              </Picker>
            </View>
            <View className="form-field mb-3">
              <Text className="form-label">接种地点</Text>
              <input className="form-input" value={site} onInput={(e) => setSite((e.target as any).value)} placeholder="如：社区卫生服务中心" />
            </View>
            <View className="form-field mb-3">
              <Text className="form-label">疫苗批号</Text>
              <input className="form-input" value={batch} onInput={(e) => setBatch((e.target as any).value)} placeholder="选填" />
            </View>
            <View className="form-field mb-3">
              <Text className="form-label">不良反应</Text>
              <textarea className="form-textarea" value={reaction} onInput={(e) => setReaction((e.target as any).value)} placeholder="选填" rows={2} />
            </View>
            <View className="btn btn-primary" onClick={handleSaveRegister}>
              <Text>确认登记</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
