/**
 * 共享患者查看页（简化版）
 * 被分享者通过 API 实时获取数据，不存储到本地 IndexedDB
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSharedPatientData } from '../services/syncService';
import type { Patient, MedicalRecord, VisitEvent } from '../types';
import {
  ArrowLeft, User, Calendar, Hospital, FileText,
  ChevronRight, FlaskConical, Image, Pill, Receipt,
  Activity, Shield, Eye, Pencil
} from 'lucide-react';

interface SharedData {
  patient: Patient;
  records: MedicalRecord[];
  visitEvents: VisitEvent[];
}

export default function SharedPatientViewPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    loadData();
  }, [patientId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getSharedPatientData(patientId!);
      setData(result.data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'lab_report': return <FlaskConical className="w-4 h-4 text-blue-500" />;
      case 'imaging_report': return <Image className="w-4 h-4 text-purple-500" />;
      case 'prescription': return <Pill className="w-4 h-4 text-green-500" />;
      case 'receipt': return <Receipt className="w-4 h-4 text-orange-500" />;
      default: return <FileText className="w-4 h-4 text-[var(--color-text-muted)]" />;
    }
  };

  const getDocumentLabel = (type: string) => {
    const labels: Record<string, string> = {
      medical_record: '病历',
      lab_report: '检验报告',
      imaging_report: '影像报告',
      prescription: '处方',
      receipt: '收费票据',
      discharge_summary: '出院小结',
      pathology: '病理报告',
      insurance: '保险单据',
      other: '其他',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-4">
        <Shield className="w-12 h-12 text-[var(--color-text-muted)] mb-3" />
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">无法访问此患者数据</p>
        <p className="text-xs text-[var(--color-danger)] mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { patient, records, visitEvents } = data;

  // 按日期降序排列就诊事件
  const sortedEvents = [...visitEvents].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-full animate-fade-in">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">{patient.name}</h1>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              共享患者 · {patient.gender === 'male' ? '男' : patient.gender === 'female' ? '女' : ''}
              {patient.birthDate ? ` · ${new Date().getFullYear() - parseInt(patient.birthDate)}岁` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-3 text-center">
            <Activity className="w-5 h-5 text-[var(--color-primary)] mx-auto mb-1" />
            <p className="text-lg font-bold">{visitEvents.length}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">就诊次数</p>
          </div>
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-3 text-center">
            <FileText className="w-5 h-5 text-[var(--color-secondary)] mx-auto mb-1" />
            <p className="text-lg font-bold">{records.length}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">文档数量</p>
          </div>
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-3 text-center">
            <Hospital className="w-5 h-5 text-[var(--color-danger)] mx-auto mb-1" />
            <p className="text-lg font-bold">{new Set(visitEvents.map(e => e.hospital).filter(Boolean)).size}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">就诊医院</p>
          </div>
        </div>
      </div>

      {/* 就诊时间线 */}
      <div className="px-4 pb-8">
        <h2 className="text-sm font-semibold mb-3">就诊记录</h2>
        {sortedEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-8 text-center">
            <Calendar className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
            <p className="text-xs text-[var(--color-text-muted)]">暂无就诊记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map(event => {
              const isExpanded = expandedEvent === event.id;
              const eventRecords = records.filter(r =>
                event.records.some((er: any) => er.id === r.id)
              );

              return (
                <div
                  key={event.id}
                  className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden"
                >
                  {/* 就诊事件头部 */}
                  <button
                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg)]/50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{event.date}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {event.hospital}{event.department ? ` · ${event.department}` : ''}
                        {event.diagnosis?.length ? ` · ${event.diagnosis.join('、')}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg)] px-2 py-0.5 rounded-full">
                        {eventRecords.length}份
                      </span>
                      <ChevronRight className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* 展开后的记录列表 */}
                  {isExpanded && (
                    <div className="border-t border-[var(--color-border)]/50">
                      {eventRecords.map(record => (
                        <button
                          key={record.id}
                          onClick={() => navigate(`/record/${record.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg)]/30 border-b border-[var(--color-border)]/30 last:border-0"
                        >
                          {getDocumentIcon(record.documentType)}
                          <div className="flex-1 text-left">
                            <p className="text-sm">{getDocumentLabel(record.documentType)}</p>
                            {record.structuredData?.hospital && (
                              <p className="text-[10px] text-[var(--color-text-muted)]">
                                {record.structuredData.hospital}
                                {record.structuredData.department ? ` · ${record.structuredData.department}` : ''}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
