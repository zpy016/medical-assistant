/**
 * P1-03: 单项检验详情
 * 展示某个检验项目的历史趋势、复查提醒设置
 */

import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { analyzeTestItem, getTestItemTrend, getSeverityColor, suggestFollowUpInterval } from '../utils/labAnalyzer';
import { formatDate } from '../utils/helpers';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import BottomSheet from '../components/ui/BottomSheet';
import { TrendingUp, TrendingDown, Minus, Calendar, MapPin, FileText } from 'lucide-react';
import type { FollowUpReminder } from '../types';
import { addFollowUpReminder, getPendingFollowUps, completeFollowUpReminder } from '../db';

export default function AbnormalTestDetailPage() {
  const navigate = useNavigate();
  const { recordId, itemName } = useParams<{ recordId: string; itemName: string }>();
  const { records, currentPatientId } = useRecordStore();
  const decodedItemName = decodeURIComponent(itemName ?? '');

  const [showReminderSheet, setShowReminderSheet] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [reminderDays, setReminderDays] = useState(3);
  const [reminderNotes, setReminderNotes] = useState('');
  const [existingReminder, setExistingReminder] = useState<FollowUpReminder | undefined>();

  // 当前记录
  const currentRecord = useMemo(() =>
    records.find(r => r.id === recordId),
    [records, recordId]
  );

  const currentItem = useMemo(() =>
    currentRecord?.structuredData?.testItems?.find(i => i.name === decodedItemName),
    [currentRecord, decodedItemName]
  );

  const currentAnalysis = useMemo(() =>
    currentItem ? analyzeTestItem(currentItem) : null,
    [currentItem]
  );

  // 历史趋势
  const patientRecords = useMemo(() =>
    records.filter(r => r.patientId === currentPatientId),
    [records, currentPatientId]
  );

  const trend = useMemo(() =>
    getTestItemTrend(patientRecords, decodedItemName),
    [patientRecords, decodedItemName]
  );

  // 加载复查提醒
  useState(() => {
    const load = async () => {
      const reminders = await getPendingFollowUps(currentPatientId ?? undefined);
      const found = reminders.find(r => r.recordId === recordId && r.testItemName === decodedItemName);
      setExistingReminder(found);
      if (found) {
        setFollowUpDate(found.followUpDate);
        setReminderDays(found.reminderDays);
        setReminderNotes(found.notes ?? '');
      } else if (currentAnalysis?.isAbnormal) {
        const days = suggestFollowUpInterval(decodedItemName, currentAnalysis.direction!, currentAnalysis.severity!);
        const date = new Date();
        date.setDate(date.getDate() + days);
        setFollowUpDate(date.toISOString().split('T')[0]);
      }
    };
    load();
  });

  const handleSaveReminder = async () => {
    if (!followUpDate) return;

    const reminder: Omit<FollowUpReminder, 'createdAt'> = {
      id: existingReminder?.id ?? crypto.randomUUID(),
      patientId: currentPatientId ?? 'default',
      recordId: recordId!,
      testItemName: decodedItemName,
      abnormalValue: currentItem?.result ?? '',
      referenceRange: currentItem?.referenceRange ?? '',
      abnormalDirection: currentAnalysis?.direction ?? 'high',
      followUpDate,
      reminderDays,
      isCompleted: false,
      notes: reminderNotes,
    };

    await addFollowUpReminder(reminder);
    setExistingReminder({ ...reminder, createdAt: Date.now() });
    setShowReminderSheet(false);
  };

  const handleComplete = async () => {
    if (existingReminder) {
      await completeFollowUpReminder(existingReminder.id);
      setExistingReminder(undefined);
    }
  };

  if (!currentRecord || !currentItem || !currentAnalysis) {
    return (
      <div className="min-h-full bg-[var(--color-bg)]">
        <PageHeader title="检验详情" onBack={() => navigate(-1)} />
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[var(--color-text-muted)]">未找到检验数据</p>
        </div>
      </div>
    );
  }

  const color = getSeverityColor(currentAnalysis.severity);
  const hasTrend = trend.length >= 2;

  // 计算趋势方向
  const trendDirection = hasTrend
    ? trend[trend.length - 1].value > trend[trend.length - 2].value
      ? 'up'
      : trend[trend.length - 1].value < trend[trend.length - 2].value
        ? 'down'
        : 'flat'
    : null;

  // SVG 趋势图
  const renderTrendChart = () => {
    if (!hasTrend) return null;

    const values = trend.map(t => t.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = 10;
    const width = 320;
    const height = 120;

    const points = trend.map((t, i) => {
      const x = padding + (i / (trend.length - 1)) * (width - padding * 2);
      const y = height - padding - ((t.value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
          {/* 正常范围参考线（如果有） */}
          {currentAnalysis.numericMin !== null && currentAnalysis.numericMax !== null && (
            <>
              <line
                x1={padding}
                y1={height - padding - ((currentAnalysis.numericMin - min) / range) * (height - padding * 2)}
                x2={width - padding}
                y2={height - padding - ((currentAnalysis.numericMin - min) / range) * (height - padding * 2)}
                stroke="#86efac"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              <line
                x1={padding}
                y1={height - padding - ((currentAnalysis.numericMax - min) / range) * (height - padding * 2)}
                x2={width - padding}
                y2={height - padding - ((currentAnalysis.numericMax - min) / range) * (height - padding * 2)}
                stroke="#86efac"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              <rect
                x={padding}
                y={height - padding - ((currentAnalysis.numericMax - min) / range) * (height - padding * 2)}
                width={width - padding * 2}
                height={((currentAnalysis.numericMax - currentAnalysis.numericMin) / range) * (height - padding * 2)}
                fill="#f0fdf4"
                rx="4"
              />
            </>
          )}

          {/* 折线 */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* 数据点 */}
          {trend.map((t, i) => {
            const x = padding + (i / (trend.length - 1)) * (width - padding * 2);
            const y = height - padding - ((t.value - min) / range) * (height - padding * 2);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill={t.isAbnormal ? color : 'var(--color-success)'}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>

        {/* X轴标签 */}
        <div className="flex justify-between px-2 mt-1">
          {trend.filter((_, i) => i === 0 || i === trend.length - 1 || i === Math.floor(trend.length / 2)).map((t, i) => (
            <span key={i} className="text-[10px] text-[var(--color-text-muted)]">
              {formatDate(t.date, 'MM-dd')}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-[var(--color-bg)] animate-fade-in">
      <PageHeader title={decodedItemName} onBack={() => navigate(-1)} />

      {/* 顶部大数字 */}
      <div className="px-4 pt-4">
        <Card>
          <div className="text-center py-4">
            <div className="text-4xl font-bold" style={{ color }}>
              {currentItem.result}
            </div>
            <div className="text-sm text-[var(--color-text-muted)] mt-1">
              参考范围: {currentItem.referenceRange}
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Chip
                label={currentAnalysis.direction === 'high' ? '↑ 偏高' : '↓ 偏低'}
                color={currentAnalysis.severity === 'severe' ? 'danger' : 'warning'}
              />
              <Chip
                label={currentAnalysis.severity === 'severe' ? '严重异常' : currentAnalysis.severity === 'moderate' ? '中度异常' : '轻度异常'}
                color={currentAnalysis.severity === 'severe' ? 'danger' : 'warning'}
              />
              {trendDirection && (
                <div className={`flex items-center gap-0.5 text-xs ${
                  trendDirection === 'up' ? 'text-red-500' : trendDirection === 'down' ? 'text-green-500' : 'text-gray-400'
                }`}>
                  {trendDirection === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> :
                   trendDirection === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> :
                   <Minus className="w-3.5 h-3.5" />}
                  <span>较上次</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 趋势图 */}
      {hasTrend && (
        <div className="px-4 pt-3">
          <Card>
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">历史趋势</h3>
            <p className="text-xs text-[var(--color-text-muted)]">绿色区域为正常范围</p>
            {renderTrendChart()}
          </Card>
        </div>
      )}

      {/* 来源信息 */}
      <div className="px-4 pt-3">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">来源病历</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)]">
                {currentRecord.structuredData?.hospital ?? '未知医院'}
              </p>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>{currentRecord.structuredData?.department ?? '未知科室'}</span>
                <span>{formatDate(currentRecord.structuredData?.visitDate ?? currentRecord.createdAt)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 复查提醒 */}
      <div className="px-4 pt-3 pb-20">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">复查提醒</h3>
          {existingReminder && !existingReminder.isCompleted ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                <span>建议复查日期: </span>
                <span className="font-semibold">{existingReminder.followUpDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>提前提醒: </span>
                <span className="font-semibold">{existingReminder.reminderDays} 天</span>
              </div>
              {existingReminder.notes && (
                <p className="text-xs text-[var(--color-text-muted)] bg-gray-50 p-2 rounded-lg">
                  {existingReminder.notes}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReminderSheet(true)}
                  className="flex-1 py-2.5 text-sm text-[var(--color-primary)] border border-[var(--color-primary)] rounded-xl touch-feedback"
                >
                  修改提醒
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 py-2.5 text-sm text-white bg-[var(--color-success)] rounded-xl touch-feedback"
                >
                  标记已复查
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--color-text-muted)] mb-3">
                {existingReminder?.isCompleted
                  ? '已标记为已复查'
                  : '尚未设置复查提醒'}
              </p>
              {!existingReminder?.isCompleted && (
                <button
                  onClick={() => setShowReminderSheet(true)}
                  className="px-6 py-2.5 text-sm text-white bg-[var(--color-primary)] rounded-xl touch-feedback"
                >
                  设置复查提醒
                </button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* 设置复查提醒 BottomSheet */}
      <BottomSheet
        isOpen={showReminderSheet}
        onClose={() => setShowReminderSheet(false)}
        title="设置复查提醒"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">复查日期</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">提前提醒天数</label>
            <div className="flex gap-2">
              {[1, 3, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => setReminderDays(d)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    reminderDays === d
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-gray-50'
                  }`}
                >
                  {d} 天前
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">备注</label>
            <textarea
              value={reminderNotes}
              onChange={(e) => setReminderNotes(e.target.value)}
              placeholder="如：空腹检查、带身份证等"
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
            />
          </div>
          <button
            onClick={handleSaveReminder}
            disabled={!followUpDate}
            className="w-full py-3 text-sm font-medium text-white bg-[var(--color-primary)] rounded-xl touch-feedback disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存提醒
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
