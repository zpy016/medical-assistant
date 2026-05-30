/**
 * P1-07: 亲属健康看板
 * 子女端汇总展示父母健康概览
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { analyzeTestItem } from '../utils/labAnalyzer';
import { formatDate, formatRelativeDate } from '../utils/helpers';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import ProgressRing from '../components/ui/ProgressRing';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';
import {
  FileText, FlaskConical, Pill, AlertTriangle, ChevronRight,
  HeartPulse, Calendar, Clock, TrendingUp
} from 'lucide-react';
import type { Patient, MedicalRecord } from '../types';
import { getAllRecords, getAllVisitEvents, getMedications, getTodayLogs, getPendingFollowUps } from '../db';

interface DashboardData {
  patient: Patient | undefined;
  records: MedicalRecord[];
  visitEvents: number;
  abnormalTests: {
    itemName: string;
    value: string;
    referenceRange: string;
    recordDate: string;
    hospital?: string;
    severity: 'mild' | 'moderate' | 'severe' | null;
  }[];
  medicationStats: {
    totalMeds: number;
    todayRate: number;
    todayScheduled: number;
    todayTaken: number;
  } | null;
  upcomingFollowUps: {
    testItemName: string;
    followUpDate: string;
    daysUntil: number;
  }[];
}

export default function FamilyDashboardPage() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();
  const { patients } = useRecordStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const targetPatientId = patientId ?? '';
  const targetPatient = patients.find(p => p.id === targetPatientId);

  const loadDashboard = useCallback(async () => {
    if (!targetPatientId) return;

    const [records, visits, meds, todayLogs, followUps] = await Promise.all([
      getAllRecords(targetPatientId),
      getAllVisitEvents(targetPatientId),
      getMedications(targetPatientId),
      getTodayLogs(targetPatientId),
      getPendingFollowUps(targetPatientId),
    ]);

    // 提取异常指标
    const abnormalTests: DashboardData['abnormalTests'] = [];
    for (const record of records) {
      const items = record.structuredData?.testItems ?? [];
      for (const item of items) {
        const analysis = analyzeTestItem(item);
        if (analysis.isAbnormal) {
          abnormalTests.push({
            itemName: item.name,
            value: item.result,
            referenceRange: item.referenceRange ?? '',
            recordDate: record.structuredData?.visitDate ?? new Date(record.createdAt).toISOString().split('T')[0],
            hospital: record.structuredData?.hospital,
            severity: analysis.severity,
          });
        }
      }
    }

    // 用药统计
    const todayScheduled = todayLogs.length;
    const todayTaken = todayLogs.filter(l => l.status === 'taken').length;

    setDashboard({
      patient: targetPatient,
      records: records.slice(0, 5),
      visitEvents: visits.length,
      abnormalTests: abnormalTests.slice(0, 5),
      medicationStats: meds.length > 0 ? {
        totalMeds: meds.filter(m => m.isActive).length,
        todayRate: todayScheduled > 0 ? (todayTaken / todayScheduled) * 100 : 0,
        todayScheduled,
        todayTaken,
      } : null,
      upcomingFollowUps: followUps
        .filter(f => !f.isCompleted)
        .map(f => ({
          testItemName: f.testItemName,
          followUpDate: f.followUpDate,
          daysUntil: Math.ceil((new Date(f.followUpDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        }))
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5),
    });
    setLoading(false);
  }, [targetPatientId, targetPatient]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) {
    return (
      <div className="min-h-full bg-[var(--color-bg)]">
        <PageHeader title="健康看板" onBack={() => navigate(-1)} />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-full bg-[var(--color-bg)]">
        <PageHeader title="健康看板" onBack={() => navigate(-1)} />
        <EmptyState icon={HeartPulse} title="暂无数据" description="请确认患者信息是否正确" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)] animate-fade-in">
      <PageHeader
        title={`${dashboard.patient?.name ?? '家人'}的健康看板`}
        onBack={() => navigate(-1)}
      />

      {/* 概览卡片横向滑动 */}
      <div className="px-4 pt-4">
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          <StatCard
            value={dashboard.records.length}
            label="病历总数"
            icon={FileText}
            iconColor="#3b82f6"
            iconBgColor="rgb(59 130 246 / 0.1)"
            className="snap-start flex-shrink-0 w-[140px]"
          />
          <StatCard
            value={dashboard.abnormalTests.length}
            label="异常指标"
            icon={FlaskConical}
            iconColor="#ef4444"
            iconBgColor="rgb(239 68 68 / 0.1)"
            trend={dashboard.abnormalTests.length > 0 ? 'up' : 'flat'}
            className="snap-start flex-shrink-0 w-[140px]"
          />
          <StatCard
            value={dashboard.visitEvents}
            label="就诊次数"
            icon={Calendar}
            iconColor="#0d9488"
            iconBgColor="rgb(13 148 136 / 0.1)"
            className="snap-start flex-shrink-0 w-[140px]"
          />
          {dashboard.medicationStats && (
            <StatCard
              value={`${Math.round(dashboard.medicationStats.todayRate)}%`}
              label="今日用药"
              icon={Pill}
              iconColor="#f59e0b"
              iconBgColor="rgb(245 158 11 / 0.1)"
              trend={dashboard.medicationStats.todayRate >= 80 ? 'up' : 'down'}
              className="snap-start flex-shrink-0 w-[140px]"
            />
          )}
        </div>
      </div>

      {/* 异常指标 */}
      {dashboard.abnormalTests.length > 0 && (
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">异常指标</h3>
            <button
              onClick={() => navigate('/abnormal-tests')}
              className="text-xs text-[var(--color-primary)]"
            >
              查看全部 →
            </button>
          </div>
          <div className="space-y-2">
            {dashboard.abnormalTests.slice(0, 3).map((test, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{test.itemName}</p>
                      <Chip
                        label={test.severity === 'severe' ? '严重' : test.severity === 'moderate' ? '中度' : '轻度'}
                        color={test.severity === 'severe' ? 'danger' : 'warning'}
                        size="sm"
                      />
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {test.value} · 参考: {test.referenceRange}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-text-muted)]">{test.hospital ?? ''}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{formatDate(test.recordDate)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 今日用药 */}
      {dashboard.medicationStats && dashboard.medicationStats.totalMeds > 0 && (
        <div className="px-4 pt-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">今日用药</h3>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  {dashboard.medicationStats.todayTaken}
                  <span className="text-base font-normal text-[var(--color-text-muted)]">/{dashboard.medicationStats.todayScheduled}</span>
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  正在服用 {dashboard.medicationStats.totalMeds} 种药物
                </p>
              </div>
              <ProgressRing
                progress={dashboard.medicationStats.todayRate}
                size={56}
                strokeWidth={5}
                color="auto"
                textSize={12}
              />
            </div>
          </Card>
        </div>
      )}

      {/* 复查提醒 */}
      {dashboard.upcomingFollowUps.length > 0 && (
        <div className="px-4 pt-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">复查提醒</h3>
          <div className="space-y-2">
            {dashboard.upcomingFollowUps.map((up, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--color-warning)]" />
                    <span className="text-sm">{up.testItemName}</span>
                  </div>
                  <Chip
                    label={up.daysUntil > 0 ? `还剩 ${up.daysUntil} 天` : up.daysUntil === 0 ? '今天' : `逾期 ${Math.abs(up.daysUntil)} 天`}
                    color={up.daysUntil <= 3 ? 'danger' : 'warning'}
                    size="sm"
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">建议复查日期: {up.followUpDate}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 最近病历 */}
      {dashboard.records.length > 0 && (
        <div className="px-4 pt-4 pb-20">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">最近病历</h3>
          <div className="space-y-2">
            {dashboard.records.map(record => (
              <Card
                key={record.id}
                onClick={() => navigate(`/record/${record.id}`)}
                className="touch-feedback"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{record.structuredData?.hospital ?? '未知医院'}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {record.structuredData?.department ?? ''} · {formatRelativeDate(record.structuredData?.visitDate ?? new Date(record.createdAt).toISOString())}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
