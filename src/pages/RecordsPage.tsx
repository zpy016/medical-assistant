/**
 * 病历夹页面
 * 按文档类型、医院、时间等多维度查看所有病历
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { formatDate, getDocumentTypeLabel, DOCUMENT_TYPE_CONFIG } from '../utils/helpers';
import type { DocumentType } from '../types';
import { Search, SlidersHorizontal, FileText, FlaskConical, Scan, Pill, Receipt, ChevronRight, X } from 'lucide-react';

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

export default function RecordsPage() {
  const navigate = useNavigate();
  const { records, patients, currentPatientId } = useRecordStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<DocumentType[]>([]);

  const currentPatient = patients.find(p => p.id === currentPatientId);

  // 筛选
  const filteredRecords = records.filter(record => {
    if (selectedTypes.length > 0 && !selectedTypes.includes(record.documentType)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const text = record.ocrResult?.fullText?.toLowerCase() ?? '';
      const hospital = record.structuredData?.hospital?.toLowerCase() ?? '';
      const diagnosis = record.structuredData?.diagnosis?.join(' ').toLowerCase() ?? '';
      return text.includes(q) || hospital.includes(q) || diagnosis.includes(q);
    }
    return true;
  });

  // 按日期分组
  const grouped = filteredRecords.reduce((acc, record) => {
    const date = record.structuredData?.visitDate ?? '未知日期';
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {} as Record<string, typeof records>);

  const toggleType = (type: DocumentType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="min-h-full animate-fade-in">
      {/* 头部 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">{currentPatient?.name ?? '我的'}的病历夹</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            共 {records.length} 份病历 · {new Set(records.map(r => r.structuredData?.hospital)).size} 家医院
          </p>
        </div>

        {/* 搜索栏 */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="搜索医院、诊断、检查项目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--color-bg)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl transition-colors ${
              showFilters || selectedTypes.length > 0
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* 筛选面板 */}
        {showFilters && (
          <div className="px-4 pb-3 border-t border-[var(--color-border)]/50 pt-2">
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">文档类型</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DOCUMENT_TYPE_CONFIG) as DocumentType[]).map(type => {
                const config = DOCUMENT_TYPE_CONFIG[type];
                const isSelected = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'text-white'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                    }`}
                    style={isSelected ? { backgroundColor: config.color } : undefined}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 记录列表 */}
      <div className="px-4 py-3 pb-20">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-muted)] opacity-30" />
            <p className="text-sm text-[var(--color-text-muted)]">
              {searchQuery || selectedTypes.length > 0 ? '没有找到匹配的病历' : '暂无病历记录'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dateRecords]) => (
                <div key={date}>
                  <p className="text-xs text-[var(--color-text-secondary)] font-medium mb-2 px-1">
                    {date === '未知日期' ? date : formatDate(date)}
                  </p>
                  <div className="space-y-2">
                    {dateRecords.map(record => {
                      const Icon = DOC_ICON_MAP[record.documentType] ?? FileText;
                      const config = DOCUMENT_TYPE_CONFIG[record.documentType];
                      const hasAbnormal = record.structuredData?.testItems?.some(t => t.isAbnormal);

                      return (
                        <button
                          key={record.id}
                          onClick={() => navigate(`/record/${record.id}`)}
                          className="w-full bg-white rounded-xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow text-left"
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: config.bgColor }}
                          >
                            <Icon className="w-5 h-5" style={{ color: config.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[var(--color-text)]">
                                {getDocumentTypeLabel(record.documentType)}
                              </p>
                              {hasAbnormal && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-[var(--color-danger)] rounded-full">
                                  异常
                                </span>
                              )}
                              {record.status !== 'confirmed' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full">
                                  {record.status === 'pending' ? '待确认' : '已修正'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
                              {record.structuredData?.hospital ?? '未知医院'}
                              {record.structuredData?.department ? ` · ${record.structuredData.department}` : ''}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                              {record.structuredData?.diagnosis?.join('、') ??
                                record.structuredData?.chiefComplaint ??
                                '已上传'}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
