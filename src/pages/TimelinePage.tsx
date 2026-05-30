/**
 * 首页 - 就诊时间线
 * 核心功能：多院区病历统一时间线展示
 * 参考智愈APP的IMG_2210和IMG_2211设计
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { formatDate, formatRelativeDate, getDocumentTypeLabel, getVisitTypeLabel, DOCUMENT_TYPE_CONFIG } from '../utils/helpers';
import type { VisitEvent, DocumentType } from '../types';
import { ChevronRight, FileText, FlaskConical, Scan, Pill, Receipt, AlertCircle, Calendar, MapPin } from 'lucide-react';

const DOC_ICONS: Record<DocumentType, typeof FileText> = {
  medical_record: FileText,
  lab_report: FlaskConical,
  imaging_report: Scan,
  prescription: Pill,
  receipt: Receipt,
  discharge_summary: FileText,
  pathology: FlaskConical,
  insurance: Receipt,
  other: FileText,
};

export default function TimelinePage() {
  const navigate = useNavigate();
  const { visitEvents, currentPatientId, patients, records } = useRecordStore();
  const [filter, setFilter] = useState<'all' | 'abnormal'>('all');

  const currentPatient = patients.find(p => p.id === currentPatientId);

  // 统计
  const totalRecords = records.length;
  const abnormalCount = records.reduce((sum, r) => {
    return sum + (r.structuredData?.testItems?.filter(t => t.isAbnormal).length ?? 0);
  }, 0);

  const filteredEvents = filter === 'abnormal'
    ? visitEvents.filter(e => e.records.some(r =>
        r.structuredData?.testItems?.some(t => t.isAbnormal)
      ))
    : visitEvents;

  return (
    <div className="animate-fade-in">
      {/* 顶部患者卡片 */}
      <div className="bg-[var(--color-primary)] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{currentPatient?.name ?? '我的病历'}</h1>
            <p className="text-white/70 text-sm mt-0.5">
              {currentPatient?.gender === 'male' ? '男' : currentPatient?.gender === 'female' ? '女' : ''}
              {currentPatient?.age ? ` | ${currentPatient.age}岁` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{totalRecords}</p>
            <p className="text-white/70 text-xs">份病历</p>
          </div>
        </div>

        {/* 快捷统计 */}
        <div className="flex gap-3 mt-3">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm text-center transition-colors ${
              filter === 'all' ? 'bg-white/20' : 'bg-white/10'
            }`}
          >
            <p className="font-semibold">{visitEvents.length}</p>
            <p className="text-white/70 text-xs">次就诊</p>
          </button>
          <button
            onClick={() => setFilter('abnormal')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm text-center transition-colors ${
              filter === 'abnormal' ? 'bg-white/20' : 'bg-white/10'
            }`}
          >
            <p className="font-semibold">{abnormalCount}</p>
            <p className="text-white/70 text-xs">异常指标</p>
          </button>
          <div className="flex-1 py-2 px-3 rounded-xl text-sm text-center bg-white/10">
            <p className="font-semibold">
              {new Set(records.map(r => r.structuredData?.hospital).filter(Boolean)).size}
            </p>
            <p className="text-white/70 text-xs">家医院</p>
          </div>
        </div>
      </div>

      {/* 筛选标签 */}
      {abnormalCount > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
              <span className="text-sm font-medium text-[var(--color-danger)]">最近异常指标</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {records.flatMap(r => r.structuredData?.testItems?.filter(t => t.isAbnormal) ?? [])
                .slice(0, 4)
                .map((item, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg">
                    {item.name} {item.result} {item.abnormalDirection === 'high' ? '↑' : '↓'}
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 时间线 */}
      <div className="px-4 mt-4 pb-6">
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3 flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          就诊时间线
        </h2>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无就诊记录</p>
            <p className="text-xs mt-1">点击底部 + 按钮上传病历</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event, index) => (
              <VisitEventCard
                key={event.id}
                event={event}
                isLast={index === filteredEvents.length - 1}
                onClickRecord={(recordId) => navigate(`/record/${recordId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 就诊事件卡片 ====================

function VisitEventCard({
  event,
  isLast,
  onClickRecord,
}: {
  event: VisitEvent;
  isLast: boolean;
  onClickRecord: (id: string) => void;
}) {
  const visitTypeColor = {
    outpatient: '#0d9488',
    inpatient: '#3b82f6',
    emergency: '#ef4444',
    physical: '#22c55e',
  }[event.visitType];

  return (
    <div className="relative pl-5">
      {/* 时间轴竖线 */}
      {!isLast && (
        <div className="absolute left-[7px] top-7 bottom-[-16px] w-0.5 bg-[var(--color-border)]" />
      )}

      {/* 时间节点 */}
      <div className="absolute left-0 top-1.5">
        <div
          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: visitTypeColor }}
        />
      </div>

      {/* 内容卡片 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* 头部 */}
        <div className="px-4 py-3 border-b border-[var(--color-border)]/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {formatDate(event.date)}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-[var(--color-text-muted)]" />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {event.hospital ?? '未知医院'}
                  {event.department ? ` · ${event.department}` : ''}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full text-white ml-1"
                  style={{ backgroundColor: visitTypeColor }}
                >
                  {getVisitTypeLabel(event.visitType)}
                </span>
              </div>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              {event.records.length}份文档
            </span>
          </div>

          {/* 诊断标签 */}
          {event.diagnosis && event.diagnosis.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {event.diagnosis.map((d, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 bg-[var(--color-bg)] text-[var(--color-text-secondary)] rounded-md">
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 文档列表 */}
        <div className="divide-y divide-[var(--color-border)]/50">
          {event.records.map(record => {
            const Icon = DOC_ICONS[record.documentType] ?? FileText;
            const config = DOCUMENT_TYPE_CONFIG[record.documentType];
            const hasAbnormal = record.structuredData?.testItems?.some(t => t.isAbnormal);

            return (
              <button
                key={record.id}
                onClick={() => onClickRecord(record.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg)]/50 transition-colors text-left"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: config.bgColor }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">
                      {getDocumentTypeLabel(record.documentType)}
                    </p>
                    {hasAbnormal && (
                      <span className="w-2 h-2 rounded-full bg-[var(--color-danger)] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                    {record.structuredData?.chiefComplaint ??
                      record.structuredData?.diagnosis?.[0] ??
                      '已上传'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
