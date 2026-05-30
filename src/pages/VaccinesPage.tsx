/**
 * P1-05: 疫苗管理
 * 儿童疫苗接种计划、记录、提醒
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';
import BottomSheet from '../components/ui/BottomSheet';
import ProgressRing from '../components/ui/ProgressRing';
import TimelineDot from '../components/ui/TimelineDot';
import {
  Plus, Shield, Check, Calendar, MapPin, Syringe,
  ChevronRight, Camera
} from 'lucide-react';
import type { VaccinationRecord, Patient } from '../types';
import {
  getVaccinationRecords, addVaccinationRecord, updateVaccinationRecord,
  generateVaccinationPlan, getAllPatients, updatePatient
} from '../db';

type VaccineTab = 'national' | 'optional' | 'all';

export default function VaccinesPage() {
  const navigate = useNavigate();
  const { currentPatientId } = useRecordStore();
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeTab, setActiveTab] = useState<VaccineTab>('national');
  const [showRegisterSheet, setShowRegisterSheet] = useState(false);
  const [registeringRecord, setRegisteringRecord] = useState<VaccinationRecord | null>(null);
  const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0]);
  const [vaccinationSite, setVaccinationSite] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [reaction, setReaction] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!currentPatientId) return;
    const [vaccineRecords, allPatients] = await Promise.all([
      getVaccinationRecords(currentPatientId),
      getAllPatients(),
    ]);
    setRecords(vaccineRecords);
    setPatients(allPatients);
    setLoading(false);
  }, [currentPatientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const currentPatient = patients.find(p => p.id === currentPatientId);

  // 如果没有疫苗记录且患者是儿童，自动生成计划
  useEffect(() => {
    const init = async () => {
      if (!currentPatientId || records.length > 0) return;
      const patient = patients.find(p => p.id === currentPatientId);
      if (patient?.birthDate) {
        await generateVaccinationPlan(currentPatientId, patient.birthDate);
        await loadData();
      }
    };
    init();
  }, [currentPatientId, records.length, patients, loadData]);

  const filteredRecords = useMemo(() => {
    if (activeTab === 'all') return records;
    return records.filter(r => r.category === activeTab);
  }, [records, activeTab]);

  // 统计
  const stats = useMemo(() => {
    const total = records.length;
    const completed = records.filter(r => r.status === 'completed').length;
    const overdue = records.filter(r => r.status === 'overdue').length;
    const rate = total > 0 ? (completed / total) * 100 : 0;
    const nextPending = records.find(r => r.status === 'pending');
    const nextOverdue = records.find(r => r.status === 'overdue');
    const next = nextOverdue ?? nextPending;
    return { total, completed, overdue, rate, next };
  }, [records]);

  const handleRegister = (record: VaccinationRecord) => {
    setRegisteringRecord(record);
    setActualDate(new Date().toISOString().split('T')[0]);
    setVaccinationSite('');
    setBatchNumber('');
    setReaction('');
    setShowRegisterSheet(true);
  };

  const handleSaveRegister = async () => {
    if (!registeringRecord) return;
    await updateVaccinationRecord(registeringRecord.id, {
      status: 'completed',
      actualDate,
      vaccinationSite: vaccinationSite || undefined,
      batchNumber: batchNumber || undefined,
      reaction: reaction || undefined,
    });
    setShowRegisterSheet(false);
    setRegisteringRecord(null);
    await loadData();
  };

  const handleSetPatientBirthDate = async (patientId: string, birthDate: string) => {
    await updatePatient(patientId, { birthDate, isChild: true });
    await generateVaccinationPlan(patientId, birthDate);
    await loadData();
  };

  // 按疫苗名称分组
  const grouped = useMemo(() => {
    const groups: Record<string, VaccinationRecord[]> = {};
    for (const r of filteredRecords) {
      if (!groups[r.vaccineName]) groups[r.vaccineName] = [];
      groups[r.vaccineName].push(r);
    }
    return groups;
  }, [filteredRecords]);

  if (loading) {
    return (
      <div className="min-h-full bg-[var(--color-bg)]">
        <PageHeader title="疫苗接种" onBack={() => navigate(-1)} />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // 没有出生日期时提示设置
  if (!currentPatient?.birthDate) {
    return (
      <div className="min-h-full bg-[var(--color-bg)]">
        <PageHeader title="疫苗接种" onBack={() => navigate(-1)} />
        <EmptyState
          icon={Syringe}
          title="请先设置出生日期"
          description="疫苗接种计划需要根据出生日期自动生成"
          action={{
            label: '设置出生日期',
            onClick: () => {
              const date = prompt('请输入出生日期 (YYYY-MM-DD):', '2024-01-01');
              if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && currentPatientId) {
                handleSetPatientBirthDate(currentPatientId, date);
              }
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)] animate-fade-in">
      <PageHeader title="疫苗接种" onBack={() => navigate(-1)} />

      {/* 进度卡片 */}
      <div className="px-4 pt-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">接种进度</p>
              <p className="text-2xl font-bold text-[var(--color-text)] mt-0.5">
                {stats.completed}<span className="text-base font-normal text-[var(--color-text-muted)]">/{stats.total}</span>
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {stats.overdue > 0 ? `${stats.overdue} 针已逾期` : stats.next ? `下一针: ${stats.next.vaccineName} ${stats.next.doseNumber}剂` : '全部完成 🎉'}
              </p>
            </div>
            <ProgressRing
              progress={stats.rate}
              size={72}
              strokeWidth={6}
              color="auto"
              textSize={16}
            />
          </div>
        </Card>
      </div>

      {/* Tab */}
      <div className="px-4 pt-3">
        <div className="flex bg-white rounded-xl border border-[var(--color-border)] p-1">
          {([
            { key: 'national' as VaccineTab, label: '一类疫苗' },
            { key: 'optional' as VaccineTab, label: '二类疫苗' },
            { key: 'all' as VaccineTab, label: '全部' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 疫苗列表 */}
      <div className="px-4 pt-3 pb-20 space-y-4">
        {Object.entries(grouped).length === 0 ? (
          <EmptyState icon={Syringe} title="暂无疫苗记录" description="请确认已设置正确的出生日期" />
        ) : (
          Object.entries(grouped).map(([vaccineName, doses]) => {
            const completedCount = doses.filter(d => d.status === 'completed').length;
            const allCompleted = completedCount === doses.length;
            const hasOverdue = doses.some(d => d.status === 'overdue');

            return (
              <div key={vaccineName}>
                <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 px-1">
                  {vaccineName}
                  <span className="ml-1 text-[var(--color-text-muted)] font-normal">
                    ({completedCount}/{doses.length}剂)
                  </span>
                </h3>
                <div className="relative pl-4">
                  {/* 时间轴线 */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />

                  <div className="space-y-3">
                    {doses.map((dose, i) => {
                      const isCompleted = dose.status === 'completed';
                      const isOverdue = dose.status === 'overdue';

                      return (
                        <div key={dose.id} className="relative flex items-start gap-3">
                          <TimelineDot
                            status={isCompleted ? 'completed' : isOverdue ? 'danger' : 'default'}
                            pulse={isOverdue}
                          />
                          <Card
                            onClick={() => !isCompleted && handleRegister(dose)}
                            className={`flex-1 ${!isCompleted ? 'cursor-pointer touch-feedback' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">第{dose.doseNumber}剂</span>
                                  <Chip
                                    label={isCompleted ? '已接种' : isOverdue ? '已逾期' : '待接种'}
                                    color={isCompleted ? 'success' : isOverdue ? 'danger' : 'gray'}
                                    size="sm"
                                  />
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                  计划: {dose.scheduledDate}
                                  {dose.actualDate && ` · 实际: ${dose.actualDate}`}
                                </p>
                                {dose.vaccinationSite && (
                                  <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" />
                                    {dose.vaccinationSite}
                                  </p>
                                )}
                              </div>
                              {!isCompleted && (
                                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                              )}
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 接种登记 BottomSheet */}
      <BottomSheet
        isOpen={showRegisterSheet}
        onClose={() => setShowRegisterSheet(false)}
        title={`登记 ${registeringRecord?.vaccineName} 第${registeringRecord?.doseNumber}剂`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">实际接种日期 *</label>
            <input
              type="date"
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">接种地点</label>
            <input
              type="text"
              value={vaccinationSite}
              onChange={(e) => setVaccinationSite(e.target.value)}
              placeholder="如：社区卫生服务中心"
              className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">疫苗批号</label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="选填"
              className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">不良反应</label>
            <textarea
              value={reaction}
              onChange={(e) => setReaction(e.target.value)}
              placeholder="选填，如：无、轻微红肿等"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
            />
          </div>
          <button
            onClick={handleSaveRegister}
            disabled={!actualDate}
            className="w-full py-3 text-sm font-medium text-white bg-[var(--color-primary)] rounded-xl touch-feedback disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认登记
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
