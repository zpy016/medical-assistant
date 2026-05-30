/**
 * 首页 - 就诊时间线
 * P0-03: 多维筛选（就诊类型/医院/科室/时间范围）
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { formatDate, formatRelativeDate, getDocumentTypeLabel, getVisitTypeLabel, DOCUMENT_TYPE_CONFIG, VISIT_TYPE_CONFIG, groupRecordsByDisease } from '../utils/helpers';
import { getICD10Name } from '../utils/icd10';
import type { VisitEvent, VisitType } from '../types';
import {
  ChevronRight, FileText, FlaskConical, Scan, Pill, Receipt,
  AlertCircle, Calendar, MapPin, Filter, X, Stethoscope,
  Building2, Clock, Check
} from 'lucide-react';

const DOC_ICONS: Record<string, typeof FileText> = {
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

type DateRange = 'all' | '3months' | '6months' | '1year';

interface TimelineFilters {
  visitTypes: VisitType[];
  hospitals: string[];
  departments: string[];
  dateRange: DateRange;
  showAbnormalOnly: boolean;
}

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'all', label: '全部时间' },
  { value: '3months', label: '近3个月' },
  { value: '6months', label: '近6个月' },
  { value: '1year', label: '近1年' },
];

export default function TimelinePage() {
  const navigate = useNavigate();
  const { visitEvents, currentPatientId, patients, records } = useRecordStore();

  // 筛选状态
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<TimelineFilters>({
    visitTypes: [],
    hospitals: [],
    departments: [],
    dateRange: 'all',
    showAbnormalOnly: false,
  });

  const currentPatient = patients.find(p => p.id === currentPatientId);

  // ICD-10 同病种关联分析
  const diseaseGroups = useMemo(() => {
    const patientRecords = records.filter(r => r.patientId === currentPatientId);
    return groupRecordsByDisease(patientRecords).filter(g => g.hospitals.length > 1);
  }, [records, currentPatientId]);

  // 从所有记录中提取医院和科室列表
  const allHospitals = useMemo(() =>
    [...new Set(records.map(r => r.structuredData?.hospital).filter((h): h is string => !!h))].sort(),
    [records]
  );
  const allDepartments = useMemo(() =>
    [...new Set(records.map(r => r.structuredData?.department).filter((d): d is string => !!d))].sort(),
    [records]
  );

  // 筛选后的就诊事件
  const filteredEvents = useMemo(() => {
    return visitEvents.filter(event => {
      // 异常指标筛选
      if (filters.showAbnormalOnly) {
        const hasAbnormal = event.records.some(r =>
          r.structuredData?.testItems?.some(t => t.isAbnormal)
        );
        if (!hasAbnormal) return false;
      }

      // 就诊类型筛选
      if (filters.visitTypes.length > 0 && !filters.visitTypes.includes(event.visitType)) {
        return false;
      }

      // 医院筛选
      if (filters.hospitals.length > 0) {
        const hosp = event.hospital ?? '未知医院';
        if (!filters.hospitals.includes(hosp)) return false;
      }

      // 科室筛选
      if (filters.departments.length > 0) {
        const dept = event.department ?? '';
        if (!dept || !filters.departments.includes(dept)) return false;
      }

      // 时间范围筛选
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const eventDate = new Date(event.date);
        const diffMs = now.getTime() - eventDate.getTime();
        const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
        if (filters.dateRange === '3months' && diffMonths > 3) return false;
        if (filters.dateRange === '6months' && diffMonths > 6) return false;
        if (filters.dateRange === '1year' && diffMonths > 12) return false;
      }

      return true;
    });
  }, [visitEvents, filters]);

  // 统计
  const totalRecords = records.length;
  const abnormalCount = records.reduce((sum, r) => {
    return sum + (r.structuredData?.testItems?.filter(t => t.isAbnormal).length ?? 0);
  }, 0);

  const activeFilterCount =
    filters.visitTypes.length +
    filters.hospitals.length +
    filters.departments.length +
    (filters.dateRange !== 'all' ? 1 : 0) +
    (filters.showAbnormalOnly ? 1 : 0);

  const toggleVisitType = (type: VisitType) => {
    setFilters(prev => ({
      ...prev,
      visitTypes: prev.visitTypes.includes(type)
        ? prev.visitTypes.filter(t => t !== type)
        : [...prev.visitTypes, type],
    }));
  };

  const toggleHospital = (hospital: string) => {
    setFilters(prev => ({
      ...prev,
      hospitals: prev.hospitals.includes(hospital)
        ? prev.hospitals.filter(h => h !== hospital)
        : [...prev.hospitals, hospital],
    }));
  };

  const toggleDepartment = (dept: string) => {
    setFilters(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept],
    }));
  };

  const resetFilters = () => {
    setFilters({
      visitTypes: [],
      hospitals: [],
      departments: [],
      dateRange: 'all',
      showAbnormalOnly: false,
    });
  };

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

        {/* 快捷统计 + 筛选按钮 */}
        <div className="flex gap-3 mt-3">
          <button
            onClick={() => setFilters(prev => ({ ...prev, showAbnormalOnly: false }))}
            className={`flex-1 py-2 px-3 rounded-xl text-sm text-center transition-colors ${
              !filters.showAbnormalOnly ? 'bg-white/20' : 'bg-white/10'
            }`}
          >
            <p className="font-semibold">{visitEvents.length}</p>
            <p className="text-white/70 text-xs">次就诊</p>
          </button>
          <button
            onClick={() => setFilters(prev => ({ ...prev, showAbnormalOnly: !prev.showAbnormalOnly }))}
            className={`flex-1 py-2 px-3 rounded-xl text-sm text-center transition-colors ${
              filters.showAbnormalOnly ? 'bg-white/20' : 'bg-white/10'
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

      {/* 筛选栏 */}
      <div className="px-4 mt-3 flex items-center gap-2">
        <button
          onClick={() => setShowFilterPanel(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeFilterCount > 0
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)]'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          筛选
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* 快捷筛选标签 */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {filters.visitTypes.map(type => (
            <span
              key={type}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: VISIT_TYPE_CONFIG[type].color }}
            >
              {VISIT_TYPE_CONFIG[type].label}
              <button onClick={() => toggleVisitType(type)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.hospitals.slice(0, 2).map(h => (
            <span
              key={h}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-[var(--color-bg)] text-[var(--color-text-secondary)] whitespace-nowrap"
            >
              {h}
              <button onClick={() => toggleHospital(h)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.hospitals.length > 2 && (
            <span className="px-2 py-1 rounded-lg text-[10px] bg-[var(--color-bg)] text-[var(--color-text-muted)]">
              +{filters.hospitals.length - 2}
            </span>
          )}
        </div>
      </div>

      {/* 同病种跨医院关联提示 */}
      {diseaseGroups.length > 0 && (
        <div className="px-4 mt-3">
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">跨医院同病种关联</span>
            </div>
            <div className="space-y-1.5">
              {diseaseGroups.slice(0, 3).map(group => (
                <div key={group.icd10Code} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">{group.icd10Code}</span>
                    <span className="text-amber-800">{group.diseaseName}</span>
                  </div>
                  <span className="text-amber-600">
                    {group.hospitals.length}家医院 · {group.records.length}次就诊
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 异常指标提示 */}
      {abnormalCount > 0 && !filters.showAbnormalOnly && (
        <div className="px-4 mt-3">
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            就诊时间线
          </h2>
          {filteredEvents.length !== visitEvents.length && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              显示 {filteredEvents.length} / {visitEvents.length} 次就诊
            </span>
          )}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {activeFilterCount > 0 ? '没有符合筛选条件的就诊记录' : '暂无就诊记录'}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="mt-2 text-xs text-[var(--color-primary)]"
              >
                清除筛选条件
              </button>
            )}
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

      {/* 筛选面板抽屉 */}
      {showFilterPanel && (
        <FilterPanel
          filters={filters}
          allHospitals={allHospitals}
          allDepartments={allDepartments}
          onToggleVisitType={toggleVisitType}
          onToggleHospital={toggleHospital}
          onToggleDepartment={toggleDepartment}
          onSetDateRange={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
          onReset={resetFilters}
          onClose={() => setShowFilterPanel(false)}
        />
      )}
    </div>
  );
}

// ==================== 筛选面板抽屉 ====================

function FilterPanel({
  filters,
  allHospitals,
  allDepartments,
  onToggleVisitType,
  onToggleHospital,
  onToggleDepartment,
  onSetDateRange,
  onReset,
  onClose,
}: {
  filters: TimelineFilters;
  allHospitals: string[];
  allDepartments: string[];
  onToggleVisitType: (type: VisitType) => void;
  onToggleHospital: (h: string) => void;
  onToggleDepartment: (d: string) => void;
  onSetDateRange: (range: DateRange) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* 抽屉 */}
      <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-[360px] bg-white shadow-2xl flex flex-col animate-slide-left">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold">筛选条件</h3>
          <div className="flex items-center gap-2">
            <button onClick={onReset} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
              重置
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* 时间范围 */}
          <section>
            <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              时间范围
            </h4>
            <div className="flex flex-wrap gap-2">
              {DATE_RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onSetDateRange(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    filters.dateRange === opt.value
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* 就诊类型 */}
          <section>
            <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" />
              就诊类型
            </h4>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(VISIT_TYPE_CONFIG) as VisitType[]).map(type => {
                const config = VISIT_TYPE_CONFIG[type];
                const isSelected = filters.visitTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => onToggleVisitType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                      isSelected ? 'text-white' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                    }`}
                    style={isSelected ? { backgroundColor: config.color } : undefined}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {config.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 医院 */}
          {allHospitals.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                医院 ({allHospitals.length}家)
              </h4>
              <div className="flex flex-wrap gap-2">
                {allHospitals.map(hospital => {
                  const isSelected = filters.hospitals.includes(hospital);
                  return (
                    <button
                      key={hospital}
                      onClick={() => onToggleHospital(hospital)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors max-w-full truncate ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {hospital}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 科室 */}
          {allDepartments.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" />
                科室
              </h4>
              <div className="flex flex-wrap gap-2">
                {allDepartments.map(dept => {
                  const isSelected = filters.departments.includes(dept);
                  return (
                    <button
                      key={dept}
                      onClick={() => onToggleDepartment(dept)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {dept}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium"
          >
            查看结果
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 就诊事件卡片（保持不变）====================

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
