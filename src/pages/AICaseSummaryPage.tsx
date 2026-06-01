/**
 * P1-08: AI 病例摘要
 * 智能生成病历时间线摘要，帮助快速了解病情全貌
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { generateCaseSummary } from '../utils/aiClient';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';
import TimelineDot from '../components/ui/TimelineDot';
import { FileText, Pill, TrendingUp, Calendar, Clock, Loader2, AlertTriangle, Sparkles, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import type { AICaseSummaryResult } from '../utils/aiClient';

const TIME_RANGE_OPTIONS = [
  { label: '近 1 个月', months: 1 },
  { label: '近 3 个月', months: 3 },
  { label: '近 6 个月', months: 6 },
  { label: '近 1 年', months: 12 },
  { label: '全部', months: 0 },
];

const TYPE_ICON_MAP: Record<string, typeof FileText> = {
  门诊: FileText,
  住院: FileText,
  体检: Heart,
  检验: FileText,
  影像: FileText,
};

export default function AICaseSummaryPage() {
  const navigate = useNavigate();
  const { records, patients, currentPatientId } = useRecordStore();

  const [selectedMonths, setSelectedMonths] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<AICaseSummaryResult | null>(null);
  const [error, setError] = useState('');
  const [expandedTimeline, setExpandedTimeline] = useState<Set<number>>(new Set());

  const patient = useMemo(() =>
    patients.find((p: { id: string }) => p.id === currentPatientId),
    [patients, currentPatientId]
  );

  const filteredRecords = useMemo(() => {
    let filtered = records.filter(r => r.patientId === currentPatientId);
    if (selectedMonths > 0) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - selectedMonths);
      filtered = filtered.filter(r => r.structuredData?.visitDate && new Date(r.structuredData.visitDate) >= cutoff);
    }
    return filtered.sort((a, b) =>
      new Date(b.structuredData?.visitDate || 0).getTime() - new Date(a.structuredData?.visitDate || 0).getTime()
    );
  }, [records, currentPatientId, selectedMonths]);

  const handleGenerate = async () => {
    if (filteredRecords.length === 0) return;
    setGenerating(true);
    setError('');
    setResult(null);

    try {
      const result = await generateCaseSummary({
        patientInfo: patient ? {
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
        } : undefined,
        records: filteredRecords.map(r => ({
          date: r.structuredData?.visitDate || '未知',
          type: r.documentType === 'lab_report' ? '检验'
            : r.documentType === 'imaging_report' ? '影像'
            : r.structuredData?.visitType === 'physical' ? '体检'
            : r.structuredData?.visitType === 'outpatient' ? '门诊'
            : r.structuredData?.visitType === 'inpatient' ? '住院'
            : r.structuredData?.visitType === 'emergency' ? '急诊'
            : '病历',
          hospital: r.structuredData?.hospital,
          department: r.structuredData?.department,
          diagnoses: r.structuredData?.diagnosis,
          medications: r.structuredData?.medications?.map((m: { name: string }) => m.name),
          content: r.structuredData?.chiefComplaint,
          testItems: r.structuredData?.testItems?.map((t: { name: string; result: string; unit?: string }) => ({
            name: t.name,
            value: t.result,
            unit: t.unit,
          })),
        })),
      });
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const toggleTimeline = (index: number) => {
    setExpandedTimeline(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="min-h-full bg-[var(--color-bg-secondary)] animate-fade-in">
      <PageHeader title="AI 病例摘要" onBack={() => navigate(-1)} />

      <div className="px-4 py-4 space-y-4">
        {/* 时间范围选择 */}
        {!result && (
          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-500" />
                选择时间范围
              </h3>
              <div className="flex flex-wrap gap-2">
                {TIME_RANGE_OPTIONS.map(opt => (
                  <button
                    key={opt.months}
                    onClick={() => setSelectedMonths(opt.months)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedMonths === opt.months
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                将分析 {filteredRecords.length} 份病历
              </p>
            </Card>

            <button
              onClick={handleGenerate}
              disabled={generating || filteredRecords.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-medium text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI 正在整理摘要...
                </>
              ) : filteredRecords.length === 0 ? (
                '该时间范围内无病历'
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  生成病例摘要
                </>
              )}
            </button>
          </div>
        )}

        {/* 错误 */}
        {error && (
          <Card className="bg-red-50 border-red-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-700 font-medium">生成失败</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
                <button onClick={handleGenerate} className="text-xs text-blue-600 mt-2 font-medium">重试</button>
              </div>
            </div>
          </Card>
        )}

        {/* 生成结果 */}
        {result && (
          <div className="space-y-4 animate-fade-in">
            {/* 患者概览 */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{patient?.name || '患者'} 病情摘要</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">{result.patientOverview}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Chip size="sm" color="primary" label={result.conditionTrend} />
                    <span className="text-xs text-[var(--color-text-muted)]">基于 {filteredRecords.length} 份病历</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* 活跃诊断 */}
            {result.activeDiagnoses.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-amber-500" />
                  当前诊断
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.activeDiagnoses.map((d, i) => (
                    <Chip key={i} color="warning" label={d} />
                  ))}
                </div>
              </Card>
            )}

            {/* 时间线 */}
            {result.timeline.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3 px-1">
                  <Clock className="w-4 h-4 text-blue-500" />
                  就诊时间线
                </h3>
                <div className="space-y-3">
                  {result.timeline.map((item, i) => {
                    const isExpanded = expandedTimeline.has(i);
                    const Icon = TYPE_ICON_MAP[item.type] || FileText;
                    return (
                      <div key={i} className="relative pl-6">
                        {/* 时间线 */}
                        {i < result.timeline.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-[-12px] w-0.5 bg-gray-200" />
                        )}
                        <TimelineDot status={i === 0 ? 'active' : 'default'} />

                        <Card className="ml-2" onClick={() => toggleTimeline(i)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.date}</span>
                              <Chip size="sm" color="gray" label={item.type} />
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{item.summary}</p>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-2">
                              {item.keyFindings.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">关键发现</p>
                                  <ul className="space-y-1">
                                    {item.keyFindings.map((f, fi) => (
                                      <li key={fi} className="flex items-start gap-1.5 text-xs text-[var(--color-text-secondary)]">
                                        <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                        {f}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {item.diagnoses.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">诊断</p>
                                  <div className="flex flex-wrap gap-1">
                                    {item.diagnoses.map((d, di) => (
                                      <Chip key={di} size="sm" color="warning" label={d} />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {item.treatments.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">治疗</p>
                                  <div className="flex flex-wrap gap-1">
                                    {item.treatments.map((t, ti) => (
                                      <Chip key={ti} size="sm" color="primary" label={t} />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 用药清单 */}
            {result.medications.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
                  <Pill className="w-4 h-4 text-indigo-500" />
                  当前用药
                </h3>
                <div className="space-y-2">
                  {result.medications.map((med, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{med.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{med.dosage}</p>
                      </div>
                      <Chip size="sm" color="primary" label={med.purpose} />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 综合建议 */}
            {result.recommendations.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  综合建议
                </h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* 免责声明 */}
            <p className="text-xs text-[var(--color-text-muted)] text-center px-4 py-2">{result.disclaimer}</p>

            {/* 重新生成 */}
            <button
              onClick={() => { setResult(null); setExpandedTimeline(new Set()); }}
              className="w-full py-3 text-sm text-blue-600 font-medium"
            >
              重新生成
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
