/**
 * 首页今日用药 Widget
 * 展示今日待服药物，支持快速打卡
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { getTodayLogs, logMedicationTaken, getMedications } from '../db';
import ProgressRing from './ui/ProgressRing';
import { Pill, Check, ChevronRight } from 'lucide-react';
import type { MedicationLog } from '../types';

export default function TodayMedicationWidget() {
  const navigate = useNavigate();
  const { currentPatientId } = useRecordStore();
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [medNames, setMedNames] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!currentPatientId) return;
    const todayLogs = await getTodayLogs(currentPatientId);
    const meds = await getMedications(currentPatientId);
    const nameMap: Record<string, string> = {};
    meds.forEach(m => { nameMap[m.id] = m.name; });
    setLogs(todayLogs);
    setMedNames(nameMap);
  }, [currentPatientId]);

  useEffect(() => { load(); }, [load]);

  if (logs.length === 0) return null;

  const taken = logs.filter(l => l.status === 'taken').length;
  const rate = logs.length > 0 ? (taken / logs.length) * 100 : 0;
  const allDone = taken === logs.length;

  const sortedLogs = [...logs].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const handleTake = async (logId: string) => {
    await logMedicationTaken(logId);
    await load();
  };

  return (
    <div className="px-4 mt-3">
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
        {/* 头部 */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <Pill className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">今日用药</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {allDone ? '今日用药已完成 🎉' : `${taken}/${logs.length} 次已服`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProgressRing progress={rate} size={40} strokeWidth={4} color="auto" textSize={10} />
            <ChevronRight className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {/* 展开列表 */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-2 animate-slide-down">
            {sortedLogs.map(log => {
              const time = log.scheduledTime.split(' ')[1];
              const isTaken = log.status === 'taken';
              return (
                <div key={log.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)] w-10">{time}</span>
                    <span className={`text-sm ${isTaken ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text)]'}`}>
                      {medNames[log.medicationId] ?? '未知药物'}
                    </span>
                  </div>
                  {isTaken ? (
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center animate-check-pop">
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTake(log.id)}
                      className="w-6 h-6 rounded-full border-2 border-[var(--color-primary)] flex items-center justify-center touch-feedback active:bg-[var(--color-primary)] active:text-white transition-colors"
                    />
                  )}
                </div>
              );
            })}
            <button
              onClick={() => navigate('/medications')}
              className="w-full text-center text-xs text-[var(--color-primary)] py-2 hover:bg-teal-50 rounded-lg transition-colors"
            >
              查看全部用药 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
