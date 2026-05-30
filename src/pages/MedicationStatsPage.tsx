/**
 * P1-01: 依从性统计
 * 周报展示用药依从率
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import ProgressRing from '../components/ui/ProgressRing';
import { ChevronLeft, ChevronRight, Check, X, Pill } from 'lucide-react';
import { getMedicationLogs, logMedicationTaken, logMedicationMissed } from '../db';
import type { MedicationLog } from '../types';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function MedicationStatsPage() {
  const navigate = useNavigate();
  const { currentPatientId } = useRecordStore();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [logs, setLogs] = useState<MedicationLog[]>([]);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const loadLogs = useCallback(async () => {
    if (!currentPatientId) return;
    const startStr = format(weekStart, 'yyyy-MM-dd');
    const endStr = format(weekEnd, 'yyyy-MM-dd');
    const allLogs = await getMedicationLogs(currentPatientId, `${startStr} 00:00`, `${endStr} 23:59`);
    setLogs(allLogs);
  }, [currentPatientId, weekStart, weekEnd]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const stats = useMemo(() => {
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dailyBreakdown = days.map(day => {
      const dayLogs = logs.filter(l => isSameDay(parseISO(l.scheduledTime.split(' ')[0]), day));
      const scheduled = dayLogs.length;
      const taken = dayLogs.filter(l => l.status === 'taken').length;
      return {
        date: format(day, 'MM/dd'),
        weekday: format(day, 'EEE', { locale: zhCN }),
        scheduled,
        taken,
        rate: scheduled > 0 ? (taken / scheduled) * 100 : 0,
      };
    });

    const totalScheduled = dailyBreakdown.reduce((sum, d) => sum + d.scheduled, 0);
    const totalTaken = dailyBreakdown.reduce((sum, d) => sum + d.taken, 0);
    const adherenceRate = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;

    return { dailyBreakdown, totalScheduled, totalTaken, adherenceRate };
  }, [logs, weekStart, weekEnd]);

  const handleLogAction = async (logId: string, action: 'take' | 'miss') => {
    if (action === 'take') {
      await logMedicationTaken(logId);
    } else {
      await logMedicationMissed(logId);
    }
    await loadLogs();
  };

  return (
    <div className="min-h-full bg-[var(--color-bg)] animate-fade-in">
      <PageHeader title="用药统计" onBack={() => navigate(-1)} />

      {/* 周选择器 */}
      <div className="px-4 pt-4">
        <Card className="flex items-center justify-between">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg touch-feedback"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {format(weekStart, 'MM月dd日')} - {format(weekEnd, 'MM月dd日')}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) ? '本周' : '第' + format(weekStart, 'w') + '周'}
            </p>
          </div>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg touch-feedback"
          >
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </Card>
      </div>

      {/* 依从率 */}
      <div className="px-4 pt-3">
        <Card>
          <div className="flex items-center justify-center py-4">
            <ProgressRing
              progress={stats.adherenceRate}
              size={120}
              strokeWidth={8}
              color="auto"
              textSize={22}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center pb-2">
            <div>
              <p className="text-lg font-bold text-[var(--color-text)]">{stats.totalScheduled}</p>
              <p className="text-xs text-[var(--color-text-muted)]">应服次数</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-success)]">{stats.totalTaken}</p>
              <p className="text-xs text-[var(--color-text-muted)]">实际服用</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--color-danger)]">{stats.totalScheduled - stats.totalTaken}</p>
              <p className="text-xs text-[var(--color-text-muted)]">漏服次数</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 柱状图 */}
      <div className="px-4 pt-3">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">每日依从率</h3>
          <div className="flex items-end justify-between h-32 gap-2">
            {stats.dailyBreakdown.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col-reverse rounded-lg overflow-hidden bg-gray-100 h-24">
                  <div
                    className="w-full bg-[var(--color-success)] transition-all"
                    style={{ height: `${day.rate}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)]">{day.weekday}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{day.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 打卡记录 */}
      <div className="px-4 pt-3 pb-20">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">本周记录</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-4">本周暂无用药记录</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map(log => {
                const date = log.scheduledTime.split(' ')[0];
                const time = log.scheduledTime.split(' ')[1];
                return (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)]/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-[var(--color-text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--color-text)]">{date} {time}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          {log.status === 'taken' ? '已服用' : log.status === 'missed' ? '漏服' : '待服'}
                        </p>
                      </div>
                    </div>
                    {log.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleLogAction(log.id, 'take')}
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg touch-feedback"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleLogAction(log.id, 'miss')}
                          className="p-1.5 bg-red-50 text-red-500 rounded-lg touch-feedback"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
