/**
 * P1-01: 用药管理列表
 * 展示所有药物、今日用药概览、快速打卡
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';
import ProgressRing from '../components/ui/ProgressRing';
import {
  Plus, Pill, Clock, Check, ChevronRight,
  type LucideIcon
} from 'lucide-react';
import type { MedicationReminder, MedicationLog } from '../types';
import {
  getMedications, getTodayLogs, logMedicationTaken,
  generateMedicationLogs
} from '../db';

const ROUTE_CONFIG: Record<string, { icon: LucideIcon; color: string; bgColor: string; label: string }> = {
  '口服': { icon: Pill, color: '#0d9488', bgColor: 'rgb(13 148 136 / 0.1)', label: '口服' },
  '外用': { icon: Pill, color: '#3b82f6', bgColor: 'rgb(59 130 246 / 0.1)', label: '外用' },
  '注射': { icon: Pill, color: '#f97316', bgColor: 'rgb(249 115 22 / 0.1)', label: '注射' },
};

const FREQUENCY_LABELS: Record<string, string> = {
  once_daily: '每日1次',
  twice_daily: '每日2次',
  three_times: '每日3次',
  four_times: '每日4次',
  before_bed: '睡前',
  every_other_day: '隔日1次',
  weekly: '每周1次',
  as_needed: '按需',
  custom: '自定义',
};

export default function MedicationsPage() {
  const navigate = useNavigate();
  const { currentPatientId } = useRecordStore();
  const [medications, setMedications] = useState<MedicationReminder[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!currentPatientId) return;
    const meds = await getMedications(currentPatientId);
    const logs = await getTodayLogs(currentPatientId);
    setMedications(meds);
    setTodayLogs(logs);
    setLoading(false);
  }, [currentPatientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 今日用药统计
  const todayStats = useMemo(() => {
    const total = todayLogs.length;
    const taken = todayLogs.filter(l => l.status === 'taken').length;
    const pending = todayLogs.filter(l => l.status === 'pending').length;
    const rate = total > 0 ? (taken / total) * 100 : 0;
    return { total, taken, pending, rate };
  }, [todayLogs]);

  // 按时间排序的今日用药
  const sortedTodayLogs = useMemo(() => {
    return [...todayLogs].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }, [todayLogs]);

  // 查找药物名称
  const getMedName = (medicationId: string) =>
    medications.find(m => m.id === medicationId)?.name ?? '未知药物';

  const getMedRoute = (medicationId: string) =>
    medications.find(m => m.id === medicationId)?.route ?? '口服';

  const handleTake = async (logId: string) => {
    await logMedicationTaken(logId);
    await loadData();
  };

  const handleToggleMed = async (med: MedicationReminder) => {
    const { updateMedication } = await import('../db');
    await updateMedication(med.id, { isActive: !med.isActive });
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[var(--color-bg)]">
        <PageHeader title="用药管理" onBack={() => navigate(-1)} />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const activeMeds = medications.filter(m => m.isActive);
  const inactiveMeds = medications.filter(m => !m.isActive);

  return (
    <div className="min-h-full bg-[var(--color-bg)] animate-fade-in">
      <PageHeader
        title="用药管理"
        onBack={() => navigate(-1)}
        rightAction={{
          icon: Plus,
          label: '添加药物',
          onClick: () => navigate('/medication/new'),
        }}
      />

      {/* 今日用药概览 */}
      {todayStats.total > 0 && (
        <div className="px-4 pt-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">今日用药</p>
                <p className="text-2xl font-bold text-[var(--color-text)] mt-0.5">
                  {todayStats.taken}<span className="text-base font-normal text-[var(--color-text-muted)]">/{todayStats.total}</span>
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {todayStats.pending > 0 ? `还有 ${todayStats.pending} 次待服` : '今日用药已完成 🎉'}
                </p>
              </div>
              <ProgressRing
                progress={todayStats.rate}
                size={72}
                strokeWidth={6}
                color="auto"
                textSize={16}
              />
            </div>

            {/* 今日用药列表 */}
            {sortedTodayLogs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-2">
                {sortedTodayLogs.map(log => {
                  const route = getMedRoute(log.medicationId);
                  const config = ROUTE_CONFIG[route] ?? ROUTE_CONFIG['口服'];
                  const time = log.scheduledTime.split(' ')[1];
                  const isTaken = log.status === 'taken';

                  return (
                    <div key={log.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: config.bgColor }}
                        >
                          <config.icon className="w-4 h-4" style={{ color: config.color }} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isTaken ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text)]'}`}>
                            {getMedName(log.medicationId)}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">{time}</p>
                        </div>
                      </div>
                      {isTaken ? (
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center animate-check-pop">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleTake(log.id)}
                          className="w-7 h-7 rounded-full border-2 border-[var(--color-primary)] flex items-center justify-center touch-feedback active:bg-[var(--color-primary)] active:text-white transition-colors"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 药物列表 */}
      <div className="px-4 pt-4 pb-20 space-y-3">
        {medications.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="暂无用药记录"
            description="添加您的第一种药物，开启用药提醒"
            action={{ label: '添加药物', onClick: () => navigate('/medication/new') }}
          />
        ) : (
          <>
            {/* 进行中 */}
            {activeMeds.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 px-1">
                  进行中 ({activeMeds.length})
                </h3>
                <div className="space-y-2">
                  {activeMeds.map(med => {
                    const route = med.route ?? '口服';
                    const config = ROUTE_CONFIG[route] ?? ROUTE_CONFIG['口服'];
                    const nextTime = med.times.length > 0
                      ? `${String(med.times[0].hour).padStart(2, '0')}:${String(med.times[0].minute).padStart(2, '0')}`
                      : null;

                    return (
                      <Card
                        key={med.id}
                        onClick={() => navigate(`/medication/${med.id}/edit`)}
                        className="animate-slide-up"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: config.bgColor }}
                            >
                              <config.icon className="w-5 h-5" style={{ color: config.color }} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-text)]">{med.name}</p>
                              {med.specification && (
                                <p className="text-xs text-[var(--color-text-muted)]">{med.specification}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Chip label={FREQUENCY_LABELS[med.frequency] ?? med.frequency} size="sm" color="gray" />
                                {nextTime && (
                                  <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-0.5">
                                    <Clock className="w-3 h-3" />
                                    {nextTime}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleMed(med); }}
                              className={`w-10 h-6 rounded-full transition-colors relative ${
                                med.isActive ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
                              }`}
                            >
                              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                med.isActive ? 'translate-x-4' : 'translate-x-0.5'
                              }`} />
                            </button>
                            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 已停用 */}
            {inactiveMeds.length > 0 && (
              <div className="pt-2">
                <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 px-1">
                  已停用 ({inactiveMeds.length})
                </h3>
                <div className="space-y-2 opacity-60">
                  {inactiveMeds.map(med => (
                    <Card
                      key={med.id}
                      onClick={() => navigate(`/medication/${med.id}/edit`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Pill className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-text)]">{med.name}</p>
                            <Chip label={FREQUENCY_LABELS[med.frequency] ?? med.frequency} size="sm" color="gray" />
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleMed(med); }}
                          className="w-10 h-6 rounded-full bg-gray-300 transition-colors relative"
                        >
                          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
