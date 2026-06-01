/**
 * P1-02: AI 报告解读
 * 对检验报告进行智能分析，给出专业解读和健康建议
 */

import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { analyzeTestItem } from '../utils/labAnalyzer';
import { analyzeReport } from '../utils/aiClient';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';
import { Sparkles, AlertCircle, Heart, Calendar, ChevronRight, Loader2, FileText } from 'lucide-react';
import type { AIReportAnalysisResult } from '../utils/aiClient';

export default function AIReportAnalysisPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { records, patients, currentPatientId } = useRecordStore();

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AIReportAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const record = useMemo(() =>
    records.find(r => r.id === id),
    [records, id]
  );

  const patient = useMemo(() =>
    patients.find(p => p.id === record?.patientId),
    [patients, record]
  );

  const testItems = useMemo(() => {
    if (!record?.structuredData?.testItems) return [];
    return record.structuredData.testItems.map(item => ({
      ...item,
      analysis: analyzeTestItem(item),
    }));
  }, [record]);

  const hasAbnormal = testItems.some(t => t.analysis.isAbnormal);

  const handleAnalyze = async () => {
    if (testItems.length === 0) return;
    setAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const result = await analyzeReport({
        patientInfo: patient ? {
          name: patient.name,
          age: patient.age,
          gender: patient.gender === 'male' ? '男' : patient.gender === 'female' ? '女' : undefined,
        } : undefined,
        testItems: testItems.map(t => ({
          name: t.name,
          value: t.result,
          unit: t.unit,
          reference: t.referenceRange,
          date: record?.structuredData?.visitDate,
        })),
        recordType: record?.documentType === 'lab_report' ? '检验报告' : '医学报告',
      });
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const severityConfig: Record<string, { color: string; label: string }> = {
    normal: { color: 'bg-emerald-100 text-emerald-700', label: '正常' },
    mild: { color: 'bg-amber-100 text-amber-700', label: '轻度' },
    moderate: { color: 'bg-orange-100 text-orange-700', label: '中度' },
    severe: { color: 'bg-red-100 text-red-700', label: '严重' },
  };

  if (!record) {
    return (
      <div className="min-h-full bg-white">
        <PageHeader title="AI 报告解读" onBack={() => navigate(-1)} />
        <div className="px-4 py-12">
          <EmptyState icon={FileText} title="未找到记录" description="该病历记录不存在或已被删除" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--color-bg-secondary)] animate-fade-in">
      <PageHeader title="AI 报告解读" onBack={() => navigate(-1)} />

      <div className="px-4 py-4 space-y-4">
        {/* 报告概览 */}
        <Card>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${hasAbnormal ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <Sparkles className={`w-5 h-5 ${hasAbnormal ? 'text-red-500' : 'text-emerald-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{record.structuredData?.hospital || '未知医院'}</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{record.structuredData?.department || ''} · {record.structuredData?.visitDate || ''}</p>
              <div className="flex items-center gap-2 mt-2">
                <Chip size="sm" color={hasAbnormal ? 'danger' : 'success'} label={hasAbnormal ? `${testItems.filter(t => t.analysis.isAbnormal).length} 项异常` : '全部正常'} />
                <span className="text-xs text-[var(--color-text-muted)]">共 {testItems.length} 项检验</span>
              </div>
            </div>
          </div>
        </Card>

        {/* AI 分析按钮 */}
        {!result && !analyzing && (
          <button
            onClick={handleAnalyze}
            disabled={testItems.length === 0}
            className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-medium text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {testItems.length === 0 ? '无可分析数据' : '开始 AI 智能解读'}
          </button>
        )}

        {/* 加载中 */}
        {analyzing && (
          <Card className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-[var(--color-text-secondary)] mt-3">AI 正在分析您的检验报告...</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">这可能需要 10-30 秒</p>
          </Card>
        )}

        {/* 错误 */}
        {error && (
          <Card className="bg-red-50 border-red-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-700 font-medium">分析失败</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
                <button onClick={handleAnalyze} className="text-xs text-blue-600 mt-2 font-medium">重试</button>
              </div>
            </div>
          </Card>
        )}

        {/* AI 分析结果 */}
        {result && (
          <div className="space-y-4 animate-fade-in">
            {/* 整体评估 */}
            <Card>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                <Heart className="w-4 h-4 text-blue-500" />
                整体评估
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-2 leading-relaxed">{result.overallAssessment}</p>
            </Card>

            {/* 异常指标 */}
            {result.abnormalItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] px-1">异常指标分析</h3>
                {result.abnormalItems.map((item, i) => {
                  const cfg = severityConfig[item.severity] || severityConfig.normal;
                  const isExpanded = expandedItems.has(i);
                  return (
                    <Card key={i} className="overflow-hidden" onClick={() => toggleExpand(i)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.name}</span>
                          <Chip size="sm" className={cfg.color} label={cfg.label} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.value}</span>
                          <span className="text-xs text-[var(--color-text-muted)]">/ {item.reference || '参考范围未知'}</span>
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-2">
                          <div>
                            <p className="text-xs font-medium text-[var(--color-text-secondary)]">解读</p>
                            <p className="text-sm text-[var(--color-text-primary)] mt-0.5">{item.interpretation}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[var(--color-text-secondary)]">建议</p>
                            <p className="text-sm text-[var(--color-text-primary)] mt-0.5">{item.suggestion}</p>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {/* 健康建议 */}
            {result.healthAdvice.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  <Heart className="w-4 h-4 text-emerald-500" />
                  健康建议
                </h3>
                <ul className="mt-3 space-y-2">
                  {result.healthAdvice.map((advice, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      {advice}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* 复查建议 */}
            {result.followUpSuggestions.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  复查建议
                </h3>
                <div className="mt-3 space-y-3">
                  {result.followUpSuggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{s.item}</p>
                        <p className="text-xs text-blue-600 mt-0.5 font-medium">建议 {s.interval} 复查</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 免责声明 */}
            <p className="text-xs text-[var(--color-text-muted)] text-center px-4 py-2">{result.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
