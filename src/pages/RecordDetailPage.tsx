/**
 * 病历详情页
 * 展示单份病历的完整信息：原图、OCR结果、结构化数据
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db as database } from '../db';
import { formatDate, getDocumentTypeLabel, DOCUMENT_TYPE_CONFIG } from '../utils/helpers';
import type { DocumentType } from '../types';
import { ArrowLeft, FileText, FlaskConical, Scan, Pill, Receipt, Trash2, Star, StarOff, AlertTriangle } from 'lucide-react';

const DOC_ICON_MAP: Record<DocumentType, typeof FileText> = {
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

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteRecord, toggleStarRecord } = useRecordStore();
  const [showOriginal, setShowOriginal] = useState(true);

  // 实时查询
  const record = useLiveQuery(
    () => id ? database.records.get(id) : undefined,
    [id]
  );

  if (!record) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-[var(--color-text-muted)]">加载中...</p>
      </div>
    );
  }

  const Icon = DOC_ICON_MAP[record.documentType] ?? FileText;
  const config = DOCUMENT_TYPE_CONFIG[record.documentType];
  const data = record.structuredData;
  const abnormalItems = data?.testItems?.filter(t => t.isAbnormal) ?? [];

  const handleDelete = async () => {
    if (confirm('确定要删除这份病历吗？此操作不可恢复。')) {
      await deleteRecord(record.id);
      navigate(-1);
    }
  };

  return (
    <div className="min-h-full bg-white animate-fade-in">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleStarRecord(record.id)}
              className="p-2 hover:bg-gray-100 rounded-xl"
            >
              {record.isStarred ? (
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              ) : (
                <StarOff className="w-4 h-4 text-[var(--color-text-muted)]" />
              )}
            </button>
            <button onClick={handleDelete} className="p-2 hover:bg-red-50 rounded-xl">
              <Trash2 className="w-4 h-4 text-[var(--color-danger)]" />
            </button>
          </div>
        </div>
      </div>

      {/* 类型标签 */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: config.bgColor }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <div>
            <h1 className="text-base font-semibold">{getDocumentTypeLabel(record.documentType)}</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {data?.hospital ?? '未知医院'} · {formatDate(data?.visitDate ?? record.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* 原图/结构化切换 */}
      <div className="px-4 mt-4">
        <div className="flex bg-[var(--color-bg)] rounded-xl p-1">
          <button
            onClick={() => setShowOriginal(true)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              showOriginal ? 'bg-white text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)]'
            }`}
          >
            原始图片
          </button>
          <button
            onClick={() => setShowOriginal(false)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              !showOriginal ? 'bg-white text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)]'
            }`}
          >
            结构化信息
          </button>
        </div>
      </div>

      {/* 内容 */}
      <div className="px-4 py-4 pb-20">
        {showOriginal ? (
          <div className="rounded-xl overflow-hidden border border-[var(--color-border)] bg-gray-50">
            <img
              src={record.originalImage}
              alt="病历原图"
              className="w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '';
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {!record.originalImage.startsWith('blob:') && !record.originalImage.startsWith('data:') && (
              <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>演示数据：原图仅在本地存储时可用</p>
                <p className="text-xs mt-1">实际使用时此处显示上传的原始图片</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 基本信息 */}
            {data && (
              <>
                <InfoSection title="基本信息">
                  <InfoRow label="姓名" value={data.patientName} />
                  <InfoRow label="性别" value={data.gender} />
                  <InfoRow label="年龄" value={data.age?.toString()} />
                </InfoSection>

                <InfoSection title="就诊信息">
                  <InfoRow label="医院" value={data.hospital} />
                  <InfoRow label="科室" value={data.department} />
                  <InfoRow label="就诊日期" value={data.visitDate} />
                  <InfoRow label="主诉" value={data.chiefComplaint} />
                  <InfoRow label="现病史" value={data.presentIllness} />
                </InfoSection>

                <InfoSection title="诊断">
                  <InfoRow label="诊断" value={data.diagnosis?.join('、')} />
                  <InfoRow label="过敏史" value={data.allergies} />
                  <InfoRow label="备注" value={data.notes} />
                </InfoSection>

                {/* 检验项目 */}
                {data.testItems && data.testItems.length > 0 && (
                  <InfoSection title={`检验项目 (${data.testItems.length}项)`}>
                    {abnormalItems.length > 0 && (
                      <div className="mb-3 p-2.5 bg-red-50 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--color-danger)] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[var(--color-danger)]">
                          发现 {abnormalItems.length} 项异常指标，建议关注
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {data.testItems.map((item, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${
                            item.isAbnormal ? 'bg-red-50/50 border border-red-100' : 'bg-[var(--color-bg)]'
                          }`}
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.nameEn && <p className="text-[var(--color-text-muted)]">{item.nameEn}</p>}
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${item.isAbnormal ? 'text-[var(--color-danger)]' : ''}`}>
                              {item.result}
                              {item.isAbnormal && (item.abnormalDirection === 'high' ? ' ↑' : ' ↓')}
                            </p>
                            <p className="text-[var(--color-text-muted)]">
                              {item.unit} · 参考: {item.referenceRange}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </InfoSection>
                )}

                {/* 药品 */}
                {data.medications && data.medications.length > 0 && (
                  <InfoSection title={`药品 (${data.medications.length}种)`}>
                    <div className="space-y-2">
                      {data.medications.map((med, i) => (
                        <div key={i} className="p-2.5 bg-[var(--color-bg)] rounded-lg text-xs">
                          <p className="font-medium text-sm">{med.name}</p>
                          <div className="grid grid-cols-2 gap-1 mt-1.5 text-[var(--color-text-secondary)]">
                            {med.specification && <p>规格: {med.specification}</p>}
                            {med.dosage && <p>剂量: {med.dosage}</p>}
                            {med.frequency && <p>频次: {med.frequency}</p>}
                            {med.route && <p>用法: {med.route}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </InfoSection>
                )}

                {/* 费用 */}
                {data.totalAmount && (
                  <InfoSection title="费用信息">
                    <InfoRow label="总金额" value={`¥${data.totalAmount.toFixed(2)}`} />
                    <InfoRow label="支付方式" value={data.paymentMethod} />
                  </InfoSection>
                )}
              </>
            )}

            {/* OCR原始文本 */}
            {record.ocrResult?.fullText && (
              <InfoSection title="OCR原始文本">
                <div className="bg-[var(--color-bg)] rounded-lg p-3">
                  <pre className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap font-sans leading-relaxed">
                    {record.ocrResult.fullText}
                  </pre>
                </div>
              </InfoSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-3.5">
      <h3 className="text-xs font-semibold text-[var(--color-text)] mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-[var(--color-border)]/30 last:border-0">
      <span className="text-xs text-[var(--color-text-secondary)] flex-shrink-0">{label}</span>
      <span className="text-xs text-[var(--color-text)] text-right">{value}</span>
    </div>
  );
}
