/**
 * P1-03: 异常指标总览
 * 展示所有病历中的异常检验项目，按严重程度分组
 * 支持设置复查提醒、标记已复查
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { extractAbnormalTests, getSeverityColor, getSeverityLabel, suggestFollowUpInterval } from '../utils/labAnalyzer';
import { formatDate } from '../utils/helpers';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';
import BottomSheet from '../components/ui/BottomSheet';
import { AlertTriangle, FlaskConical, Calendar, Check, Clock, ChevronRight, Filter } from 'lucide-react';
import type { FollowUpReminder } from '../types';
import { addFollowUpReminder, getPendingFollowUps, completeFollowUpReminder } from '../db';

type FilterType = 'all' | 'pending' | 'completed';
type SeverityFilter = 'all' | 'severe' | 'moderate' | 'mild';

export default function AbnormalTestsPage() {
  const navigate = useNavigate();
  const { records, currentPatientId } = useRecordStore();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // 复查提醒数据（使用useState+useEffect模拟）
  const [followUps, setFollowUps] = useState<FollowUpReminder[]>([]);
  const [followUpsLoaded, setFollowUpsLoaded] = useState(false);

  const loadFollowUps = useCallback(async () => {
    const list = await getPendingFollowUps(currentPatientId ?? undefined);
    setFollowUps(list);
    setFollowUpsLoaded(true);
  }, [currentPatientId]);

  useState(() => {
    loadFollowUps();
  });

  // 提取异常指标
  const patientRecords = useMemo(() =>
    records.filter(r => r.patientId === currentPatientId),
    [records, currentPatientId]
  );

  const allAbnormal = useMemo(() =>
    extractAbnormalTests(patientRecords),
    [patientRecords]
  );

  // 按严重程度分组
  const grouped = useMemo(() => {
    const severe = allAbnormal.filter(a => a.analysis.severity === 'severe');
    const moderate = allAbnormal.filter(a => a.analysis.severity === 'moderate');
    const mild = allAbnormal.filter(a => a.analysis.severity === 'mild');
    return { severe, moderate, mild };
  }, [allAbnormal]);

  // 筛选
  const filtered = useMemo(() => {
    let result = allAbnormal;

    // 严重程度筛选
    if (severityFilter !== 'all') {
      result = result.filter(a => a.analysis.severity === severityFilter);
    }

    // 复查状态筛选
    if (filterType === 'pending') {
      result = result.filter(a => !followUps.some(f => f.recordId === a.recordId && f.testItemName === a.item.name && !f.isCompleted));
    } else if (filterType === 'completed') {
      result = result.filter(a => followUps.some(f => f.recordId === a.recordId && f.testItemName === a.item.name && f.isCompleted));
    }

    return result;
  }, [allAbnormal, severityFilter, filterType, followUps]);

  // 统计
  const stats = useMemo(() => ({
    total: allAbnormal.length,
    severe: grouped.severe.length,
    pending: followUps.filter(f => !f.isCompleted).length,
  }), [allAbnormal, grouped, followUps]);

  // 设置复查提醒
  const handleSetReminder = async (test: typeof allAbnormal[0]) => {
    const days = suggestFollowUpInterval(
      test.item.name,
      test.analysis.direction!,
      test.analysis.severity!
    );
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + days);

    const reminder: Omit<FollowUpReminder, 'createdAt'> = {
      id: crypto.randomUUID(),
      patientId: currentPatientId ?? 'default',
      recordId: test.recordId,
      testItemName: test.item.name,
      abnormalValue: test.item.result,
      referenceRange: test.item.referenceRange ?? '',
      abnormalDirection: test.analysis.direction!,
      followUpDate: followUpDate.toISOString().split('T')[0],
      reminderDays: 3,
      isCompleted: false,
      notes: '',
    };

    await addFollowUpReminder(reminder);
    await loadFollowUps();
  };

  const handleCompleteReminder = async (reminderId: string) => {
    await completeFollowUpReminder(reminderId);
    await loadFollowUps();
  };

  const getReminderForTest = (recordId: string, itemName: string) =>
    followUps.find(f => f.recordId === recordId && f.testItemName === itemName);

  return (
    <div className="min-h-full bg-[var(--color-bg)] animate-fade-in">
      <PageHeader
        title="异常指标"
        onBack={() => navigate(-1)}
        rightAction={{
          icon: Filter,
          label: '筛选',
          onClick: () => setShowFilterSheet(true),
        }}
      />

      {/* 统计卡片 */}
      <div className="px-4 pt-4 pb-2">
        <div className="grid grid-cols-3 gap-3">
          <Card padding="sm">
            <div className="text-2xl font-bold text-[var(--color-danger)]">{stats.total}</div>
            <div className="text-xs text-[var(--color-text-muted)]">异常指标</div>
          </Card>
          <Card padding="sm">
            <div className="text-2xl font-bold text-[var(--color-danger)]">{stats.severe}</div>
            <div className="text-xs text-[var(--color-text-muted)]">严重异常</div>
          </Card>
          <Card padding="sm">
            <div className="text-2xl font-bold text-[var(--color-warning)]">{stats.pending}</div>
            <div className="text-xs text-[var(--color-text-muted)]">待复查</div>
          </Card>
        </div>
      </div>

      {/* 筛选标签 */}
      {(severityFilter !== 'all' || filterType !== 'all') && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {severityFilter !== 'all' && (
            <Chip
              label={`严重程度: ${getSeverityLabel(severityFilter as 'severe')}`}
              color={severityFilter === 'severe' ? 'danger' : severityFilter === 'moderate' ? 'warning' : 'warning'}
              onClose={() => setSeverityFilter('all')}
            />
          )}
          {filterType !== 'all' && (
            <Chip
              label={filterType === 'pending' ? '待复查' : '已复查'}
              color="primary"
              onClose={() => setFilterType('all')}
            />
          )}
        </div>
      )}

      {/* 异常列表 */}
      <div className="px-4 pb-20 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title={allAbnormal.length === 0 ? '暂无异常指标' : '没有符合条件的指标'}
            description={allAbnormal.length === 0 ? '所有检验项目均在正常范围内 🎉' : '尝试调整筛选条件'}
          />
        ) : (
          filtered.map((test, index) => {
            const color = getSeverityColor(test.analysis.severity);
            const reminder = getReminderForTest(test.recordId, test.item.name);
            const daysUntil = reminder
              ? Math.ceil((new Date(reminder.followUpDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <Card
                key={`${test.recordId}-${test.item.name}-${index}`}
                onClick={() => navigate(`/abnormal-test/${test.recordId}/${encodeURIComponent(test.item.name)}`)}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* 项目名称 + 严重度 */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">
                        {test.item.name}
                      </h3>
                      <Chip
                        label={getSeverityLabel(test.analysis.severity)}
                        color={test.analysis.severity === 'severe' ? 'danger' : test.analysis.severity === 'moderate' ? 'warning' : 'warning'}
                        size="sm"
                      />
                    </div>

                    {/* 数值 */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold" style={{ color }}>
                        {test.item.result}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        参考: {test.item.referenceRange}
                      </span>
                    </div>

                    {/* 来源 */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-muted)]">
                      <span>{test.hospital ?? '未知医院'}</span>
                      <span>{formatDate(test.recordDate)}</span>
                      {test.analysis.direction && (
                        <span style={{ color }}>
                          {test.analysis.direction === 'high' ? '↑ 偏高' : '↓ 偏低'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 右侧：复查状态 */}
                  <div className="flex flex-col items-end gap-2">
                    {reminder ? (
                      reminder.isCompleted ? (
                        <div className="flex items-center gap-1 text-xs text-[var(--color-success)]">
                          <Check className="w-3.5 h-3.5" />
                          <span>已复查</span>
                        </div>
                      ) : (
                        <>
                          <Chip
                            label={daysUntil !== null && daysUntil > 0
                              ? `还剩 ${daysUntil} 天`
                              : daysUntil === 0
                                ? '今天复查'
                                : `逾期 ${Math.abs(daysUntil!)} 天`
                            }
                            color={daysUntil !== null && daysUntil <= 3 ? 'danger' : 'warning'}
                            size="sm"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteReminder(reminder.id);
                            }}
                            className="text-xs text-[var(--color-primary)] hover:underline"
                          >
                            标记已复查
                          </button>
                        </>
                      )
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetReminder(test);
                        }}
                        className="flex items-center gap-1 text-xs text-[var(--color-primary)] bg-teal-50 px-2.5 py-1 rounded-full touch-feedback"
                      >
                        <Calendar className="w-3 h-3" />
                        设复查提醒
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 筛选 BottomSheet */}
      <BottomSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="筛选异常指标"
      >
        <div className="space-y-6">
          {/* 严重程度 */}
          <div>
            <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">严重程度</h3>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'severe', 'moderate', 'mild'] as SeverityFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    severityFilter === s
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-gray-50'
                  }`}
                >
                  {s === 'all' ? '全部' : getSeverityLabel(s as 'severe')}
                </button>
              ))}
            </div>
          </div>

          {/* 复查状态 */}
          <div>
            <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">复查状态</h3>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'pending', 'completed'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filterType === f
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-gray-50'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'pending' ? '待复查' : '已复查'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setSeverityFilter('all');
              setFilterType('all');
            }}
            className="w-full py-3 text-sm text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-xl hover:bg-gray-50 transition-colors"
          >
            重置筛选
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
