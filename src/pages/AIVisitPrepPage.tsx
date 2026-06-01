/**
 * P1-04: AI 就诊准备清单
 * 根据病历智能生成就诊所需资料和问题清单
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { generateVisitPrep } from '../utils/aiClient';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';
import { ClipboardList, FileText, MessageCircle, AlertTriangle, CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { AIVisitPrepResult } from '../utils/aiClient';

const URGENCY_CONFIG: Record<string, { color: string; label: string; icon: typeof Clock }> = {
  low: { color: 'bg-emerald-100 text-emerald-700', label: '常规就诊', icon: Clock },
  medium: { color: 'bg-amber-100 text-amber-700', label: '建议尽快', icon: Clock },
  high: { color: 'bg-orange-100 text-orange-700', label: '尽快就诊', icon: AlertTriangle },
  emergency: { color: 'bg-red-100 text-red-700', label: '紧急就医', icon: AlertTriangle },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  must: { color: 'bg-red-100 text-red-700', label: '必带' },
  should: { color: 'bg-amber-100 text-amber-700', label: '建议' },
  optional: { color: 'bg-gray-100 text-gray-600', label: '可选' },
};

export default function AIVisitPrepPage() {
  const navigate = useNavigate();
  const { records, patients, currentPatientId } = useRecordStore();

  const [targetDepartment, setTargetDepartment] = useState('');
  const [currentSymptoms, setCurrentSymptoms] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<AIVisitPrepResult | null>(null);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['documents', 'questions']));

  const patient = useMemo(() =>
    patients.find((p: { id: string }) => p.id === currentPatientId),
    [patients, currentPatientId]
  );

  const recentRecords = useMemo(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return records
      .filter(r => r.patientId === currentPatientId)
      .filter(r => r.structuredData?.visitDate && new Date(r.structuredData.visitDate) >= threeMonthsAgo)
      .sort((a, b) => new Date(b.structuredData?.visitDate || 0).getTime() - new Date(a.structuredData?.visitDate || 0).getTime())
      .slice(0, 10);
  }, [records, currentPatientId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setResult(null);

    try {
      const result = await generateVisitPrep({
        patientInfo: patient ? {
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
        } : undefined,
        medicalRecords: recentRecords.map(r => ({
          date: r.structuredData?.visitDate,
          type: r.documentType,
          content: r.structuredData
            ? `医院：${r.structuredData.hospital || '未知'}，科室：${r.structuredData.department || '未知'}，诊断：${r.structuredData.diagnosis?.join('、') || '无'}`
            : undefined,
        })),
        currentSymptoms: currentSymptoms || undefined,
        targetDepartment: targetDepartment || undefined,
      });
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const urgency = result ? URGENCY_CONFIG[result.urgency] || URGENCY_CONFIG.low : null;

  return (
    <div className="min-h-full bg-[var(--color-bg-secondary)] animate-fade-in">
      <PageHeader title="就诊准备清单" onBack={() => navigate(-1)} />

      <div className="px-4 py-4 space-y-4">
        {/* 输入区 */}
        {!result && (
          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-blue-500" />
                就诊信息
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">目标科室（选填）</label>
                  <input
                    type="text"
                    value={targetDepartment}
                    onChange={e => setTargetDepartment(e.target.value)}
                    placeholder="如：心内科、消化科..."
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-gray-400 border border-transparent focus:border-blue-300 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">当前症状（选填）</label>
                  <textarea
                    value={currentSymptoms}
                    onChange={e => setCurrentSymptoms(e.target.value)}
                    placeholder="描述您目前的症状和不适..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-gray-400 border border-transparent focus:border-blue-300 focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>
            </Card>

            {/* 最近病历提示 */}
            {recentRecords.length > 0 && (
              <Card>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">将参考近 3 个月 {recentRecords.length} 份病历</p>
                <div className="space-y-2">
                  {recentRecords.slice(0, 3).map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                      <FileText className="w-3 h-3 text-gray-400" />
                      <span className="truncate">{r.structuredData?.visitDate} · {r.structuredData?.hospital || '未知医院'} · {r.structuredData?.department || ''}</span>
                    </div>
                  ))}
                  {recentRecords.length > 3 && (
                    <p className="text-xs text-[var(--color-text-muted)] pl-5">... 等共 {recentRecords.length} 份</p>
                  )}
                </div>
              </Card>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-medium text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI 正在准备清单...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  生成就诊准备清单
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
            {/* 就诊类型与紧急度 */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">建议就诊科室</p>
                  <p className="text-lg font-bold text-[var(--color-text-primary)] mt-0.5">{result.visitType}</p>
                </div>
                {urgency && (
                  <Chip className={urgency.color} label={urgency.label} />
                )}
              </div>
            </Card>

            {/* 必带资料 */}
            <div>
              <button
                onClick={() => toggleSection('documents')}
                className="flex items-center justify-between w-full px-1 mb-2"
              >
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  必带资料 ({result.documents.length}项)
                </h3>
                {expandedSections.has('documents') ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedSections.has('documents') && (
                <div className="space-y-2">
                  {result.documents.map((doc, i) => {
                    const pcfg = PRIORITY_CONFIG[doc.priority] || PRIORITY_CONFIG.optional;
                    return (
                      <Card key={i} className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {doc.priority === 'must' ? (
                            <CheckCircle2 className="w-4 h-4 text-red-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">{doc.name}</span>
                            <Chip size="sm" className={pcfg.color} label={pcfg.label} />
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{doc.description}</p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 要问医生的问题 */}
            <div>
              <button
                onClick={() => toggleSection('questions')}
                className="flex items-center justify-between w-full px-1 mb-2"
              >
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-indigo-500" />
                  要问医生的问题
                </h3>
                {expandedSections.has('questions') ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedSections.has('questions') && (
                <div className="space-y-3">
                  {result.questions.map((group, gi) => (
                    <Card key={gi}>
                      <p className="text-xs font-medium text-blue-600 mb-2">{group.category}</p>
                      <ul className="space-y-2">
                        {group.questions.map((q, qi) => (
                          <li key={qi} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center shrink-0 mt-0.5">{qi + 1}</span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* 症状描述要点 */}
            {result.symptomsToDescribe.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-amber-500" />
                  向医生描述症状时，记得提及
                </h3>
                <ul className="space-y-2">
                  {result.symptomsToDescribe.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* 注意事项 */}
            {result.notes.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  就诊注意事项
                </h3>
                <ul className="space-y-2">
                  {result.notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* 免责声明 */}
            <p className="text-xs text-[var(--color-text-muted)] text-center px-4 py-2">{result.disclaimer}</p>

            {/* 重新生成 */}
            <button
              onClick={() => { setResult(null); setExpandedSections(new Set(['documents', 'questions'])); }}
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
