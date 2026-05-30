/**
 * OCR结果确认页面 — P0-01 精细化实现
 * 核心交互：
 * - 结构化字段 ↔ 原图文本块 双向联动（点击字段→原图高亮，点击文本块→字段高亮）
 * - 字段编辑：底部抽屉弹窗
 * - 就诊类型选择
 * - 手写签名区自动标记
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { parseOCRResult } from '../services/ocrService';
import type { StructuredData, DocumentType, OCRTextBlock, UploadTask, VisitType } from '../types';
import { DOCUMENT_TYPE_CONFIG, getDocumentTypeLabel, VISIT_TYPE_CONFIG, getVisitTypeLabel } from '../utils/helpers';
import {
  ArrowLeft, Edit2, Check, AlertTriangle, Sparkles, Type, Image as ImageIcon,
  X, Save, Stethoscope, Building2, User, CalendarDays, FileText,
  Pill, FlaskConical, Receipt, Scan, PenLine
} from 'lucide-react';

// ==================== 字段→文本块映射 ====================

/** 建立结构化字段与OCR文本块的索引映射 */
function buildFieldBlockMapping(
  textBlocks: OCRTextBlock[],
  structuredData: StructuredData
): Record<string, number[]> {
  const mapping: Record<string, number[]> = {};

  const fieldEntries: [string, string | undefined][] = [
    ['patientName', structuredData.patientName],
    ['gender', structuredData.gender],
    ['age', structuredData.age?.toString()],
    ['hospital', structuredData.hospital],
    ['department', structuredData.department],
    ['visitDate', structuredData.visitDate],
    ['chiefComplaint', structuredData.chiefComplaint],
    ['presentIllness', structuredData.presentIllness],
    ['diagnosis', structuredData.diagnosis?.join('、')],
    ['allergies', structuredData.allergies],
    ['notes', structuredData.notes],
    ['imagingFindings', structuredData.imagingFindings],
    ['imagingConclusion', structuredData.imagingConclusion],
  ];

  const labelMap: Record<string, string[]> = {
    patientName: ['姓名', '患者姓名', 'Name'],
    gender: ['性别', 'Gender'],
    age: ['年龄', 'Age', '岁'],
    hospital: ['医院', 'Hospital', '医疗机构', '卫生院', '诊所'],
    department: ['科室', 'Department', '科别', '科'],
    visitDate: ['日期', 'Date', '就诊日期', '就诊时间'],
    chiefComplaint: ['主诉', 'Chief Complaint'],
    presentIllness: ['现病史', 'Present Illness'],
    diagnosis: ['诊断', 'Diagnosis', '初步诊断', '出院诊断'],
    allergies: ['过敏', 'Allergy', '药物过敏'],
    notes: ['备注', 'Notes', '医嘱', '处置'],
    imagingFindings: ['影像表现', '所见', '检查所见', '影像所见'],
    imagingConclusion: ['影像诊断', '诊断意见', '检查结论', '影像结论'],
  };

  for (const [fieldName, fieldValue] of fieldEntries) {
    if (!fieldValue) continue;
    const indices: number[] = [];

    // 策略1：搜索包含字段值的文本块
    textBlocks.forEach((block, i) => {
      if (block.text.includes(fieldValue) || fieldValue.includes(block.text)) {
        indices.push(i);
      }
    });

    // 策略2：如果字段值没找到，搜索字段名关键词
    if (indices.length === 0) {
      const keywords = labelMap[fieldName] ?? [];
      textBlocks.forEach((block, i) => {
        if (keywords.some(kw => block.text.includes(kw))) {
          indices.push(i);
        }
      });
    }

    if (indices.length > 0) {
      mapping[fieldName] = [...new Set(indices)];
    }
  }

  return mapping;
}

/** 检测签名区文本块 */
function detectSignatureBlocks(textBlocks: OCRTextBlock[]): number[] {
  const signatureKeywords = ['签名', '签字', '医师签字', '医生签名', '手写签名', '签章', '医师签章'];
  return textBlocks
    .map((block, i) => ({ block, i }))
    .filter(({ block }) => signatureKeywords.some(kw => block.text.includes(kw)))
    .map(({ i }) => i);
}

// ==================== 主组件 ====================

export default function OCRConfirmPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { uploadTasks, confirmRecord } = useRecordStore();
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);

  const task = uploadTasks.find(t => t.id === taskId);

  const [viewMode, setViewMode] = useState<'split' | 'fields'>('fields');
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<StructuredData>({});
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('medical_record');
  const [selectedVisitType, setSelectedVisitType] = useState<VisitType>('outpatient');

  // 编辑抽屉状态
  const [editDrawer, setEditDrawer] = useState<{
    open: boolean;
    field: string;
    label: string;
    value: string;
  } | null>(null);

  // 初始化
  useEffect(() => {
    if (task?.ocrResult) {
      const parsed = parseOCRResult(task.ocrResult);
      setEditedData(parsed.structuredData);
      setSelectedDocType(parsed.documentType);
      setSelectedVisitType(parsed.structuredData.visitType ?? 'outpatient');
    }
  }, [task]);

  // 字段→文本块映射（memoized）
  const fieldBlockMap = useMemo(() => {
    if (!task?.ocrResult?.textBlocks || !editedData) return {};
    return buildFieldBlockMapping(task.ocrResult.textBlocks, editedData);
  }, [task?.ocrResult?.textBlocks, editedData]);

  // 签名区检测
  const signatureBlocks = useMemo(() => {
    if (!task?.ocrResult?.textBlocks) return [];
    return detectSignatureBlocks(task.ocrResult.textBlocks);
  }, [task?.ocrResult?.textBlocks]);

  // 文本块→字段反向映射
  const blockToFieldMap = useMemo(() => {
    const map: Record<number, string[]> = {};
    Object.entries(fieldBlockMap).forEach(([field, indices]) => {
      indices.forEach(i => {
        if (!map[i]) map[i] = [];
        map[i].push(field);
      });
    });
    return map;
  }, [fieldBlockMap]);

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <AlertTriangle className="w-12 h-12 text-[var(--color-warning)] mb-3" />
        <p className="text-sm text-[var(--color-text-secondary)]">任务不存在或已处理</p>
        <button
          onClick={() => navigate('/timeline')}
          className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm"
        >
          返回首页
        </button>
      </div>
    );
  }

  // 点击字段 → 高亮原图对应文本块
  const handleFieldClick = useCallback((fieldName: string) => {
    setSelectedField(fieldName);
    const blockIndices = fieldBlockMap[fieldName];
    if (blockIndices && blockIndices.length > 0) {
      setSelectedBlock(blockIndices[0]);
      // 滚动到原图视图（如果在fields模式下，自动切换到split）
      if (viewMode === 'fields') {
        // 不自动切换，保持当前视图
      }
    }
  }, [fieldBlockMap, viewMode]);

  // 点击文本块 → 高亮对应字段
  const handleBlockClick = useCallback((blockIndex: number) => {
    setSelectedBlock(blockIndex);
    const fields = blockToFieldMap[blockIndex];
    if (fields && fields.length > 0) {
      setSelectedField(fields[0]);
    }
  }, [blockToFieldMap]);

  // 点击原图 → 高亮对应字段
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    let closestIndex = -1;
    let minDistance = Infinity;

    task.ocrResult?.textBlocks.forEach((block, i) => {
      const cx = (block.bbox[0] + block.bbox[2]) / 2;
      const cy = (block.bbox[1] + block.bbox[3]) / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    });

    if (closestIndex >= 0 && minDistance < 0.3) {
      setSelectedBlock(closestIndex);
      // 反向高亮字段
      const fields = blockToFieldMap[closestIndex];
      if (fields && fields.length > 0) {
        setSelectedField(fields[0]);
        // 滚动到字段
        const el = document.getElementById(`field-${fields[0]}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [task.ocrResult, blockToFieldMap]);

  const handleConfirm = async () => {
    if (!taskId) return;
    await confirmRecord(taskId, { ...editedData, visitType: selectedVisitType }, selectedDocType);
    navigate('/timeline');
  };

  const handleFieldEdit = (field: string, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const openEditDrawer = (field: string, label: string, value?: string) => {
    setEditDrawer({ open: true, field, label, value: value ?? '' });
  };

  const closeEditDrawer = () => {
    setEditDrawer(null);
  };

  const saveEditDrawer = () => {
    if (editDrawer) {
      handleFieldEdit(editDrawer.field, editDrawer.value);
      closeEditDrawer();
    }
  };

  const ocrResult = task.ocrResult;
  const confidence = ocrResult?.confidence ?? 0;

  return (
    <div className="min-h-full bg-white animate-fade-in">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <h1 className="text-sm font-semibold">确认识别结果</h1>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
          >
            <Check className="w-4 h-4" />
            确认
          </button>
        </div>
      </div>

      {/* 识别置信度提示 */}
      <div className="px-4 py-2 bg-[var(--color-primary)]/5 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
        <span className="text-xs text-[var(--color-text-secondary)]">
          AI识别置信度: <span className="font-medium text-[var(--color-primary)]">{(confidence * 100).toFixed(1)}%</span>
          {confidence < 0.9 && ' · 建议仔细核对'}
        </span>
      </div>

      {/* 视图切换 */}
      <div className="flex border-b border-[var(--color-border)] sticky top-[53px] z-10 bg-white">
        <button
          onClick={() => setViewMode('fields')}
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
            viewMode === 'fields'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          结构化信息
        </button>
        <button
          onClick={() => setViewMode('split')}
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
            viewMode === 'split'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          图文对照
        </button>
      </div>

      {/* 内容区域 */}
      <div className="px-4 py-4">
        {viewMode === 'split' ? (
          <SplitView
            task={task}
            imageRef={imageRef}
            containerRef={containerRef}
            selectedBlock={selectedBlock}
            selectedField={selectedField}
            signatureBlocks={signatureBlocks}
            fieldBlockMap={fieldBlockMap}
            onImageClick={handleImageClick}
            onBlockClick={handleBlockClick}
          />
        ) : (
          <FieldsView
            editedData={editedData}
            selectedDocType={selectedDocType}
            selectedVisitType={selectedVisitType}
            selectedField={selectedField}
            signatureBlocks={signatureBlocks}
            onDocTypeChange={setSelectedDocType}
            onVisitTypeChange={setSelectedVisitType}
            onFieldClick={handleFieldClick}
            onFieldEdit={openEditDrawer}
            fieldsRef={fieldsRef}
          />
        )}
      </div>

      {/* 底部确认按钮 */}
      <div className="sticky bottom-0 bg-white border-t border-[var(--color-border)] p-4 z-10">
        <button
          onClick={handleConfirm}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          确认并归档
        </button>
        <p className="text-[10px] text-center text-[var(--color-text-muted)] mt-2">
          点击字段可定位原图位置 · 点击编辑可修正识别结果 · 确认后加入病历时间线
        </p>
      </div>

      {/* 编辑抽屉 */}
      {editDrawer?.open && (
        <EditDrawer
          label={editDrawer.label}
          value={editDrawer.value}
          onChange={(v) => setEditDrawer(prev => prev ? { ...prev, value: v } : null)}
          onSave={saveEditDrawer}
          onClose={closeEditDrawer}
        />
      )}
    </div>
  );
}

// ==================== 图文对照视图 ====================

function SplitView({
  task,
  imageRef,
  containerRef,
  selectedBlock,
  selectedField,
  signatureBlocks,
  fieldBlockMap,
  onImageClick,
  onBlockClick,
}: {
  task: UploadTask;
  imageRef: React.RefObject<HTMLImageElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectedBlock: number | null;
  selectedField: string | null;
  signatureBlocks: number[];
  fieldBlockMap: Record<string, number[]>;
  onImageClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onBlockClick: (blockIndex: number) => void;
}) {
  const textBlocks = task.ocrResult?.textBlocks ?? [];

  // 获取与选中字段关联的文本块索引
  const highlightedBlocks = selectedField ? (fieldBlockMap[selectedField] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* 原图区域（带高亮框） */}
      <div
        ref={containerRef}
        onClick={onImageClick}
        className="relative rounded-xl overflow-hidden bg-gray-100 border border-[var(--color-border)]"
      >
        <img
          ref={imageRef}
          src={task.previewUrl}
          alt="original"
          className="w-full object-contain"
        />
        {/* 文本块高亮层 */}
        {textBlocks.map((block, i) => {
          const isSelected = selectedBlock === i;
          const isHighlighted = highlightedBlocks.includes(i);
          const isSignature = signatureBlocks.includes(i);

          return (
            <div
              key={i}
              className={`absolute border-2 rounded transition-all cursor-pointer ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 z-10'
                  : isHighlighted
                    ? 'border-amber-400 bg-amber-400/10 z-[5]'
                    : isSignature
                      ? 'border-purple-400/50 border-dashed bg-purple-400/5'
                      : 'border-transparent hover:border-[var(--color-primary)]/30'
              }`}
              style={{
                left: `${block.bbox[0] * 100}%`,
                top: `${block.bbox[1] * 100}%`,
                width: `${(block.bbox[2] - block.bbox[0]) * 100}%`,
                height: `${(block.bbox[3] - block.bbox[1]) * 100}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onBlockClick(i);
              }}
            >
              {isSignature && (
                <div className="absolute -top-5 left-0 flex items-center gap-0.5 text-[10px] text-purple-600 bg-purple-50 px-1 rounded">
                  <PenLine className="w-3 h-3" />
                  签名区
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 转录文本列表 */}
      <div className="bg-[var(--color-bg)] rounded-xl p-3">
        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">识别文本</p>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {textBlocks.map((block, i) => {
            const isSelected = selectedBlock === i;
            const isHighlighted = highlightedBlocks.includes(i);
            const isSignature = signatureBlocks.includes(i);

            return (
              <div
                key={i}
                onClick={() => onBlockClick(i)}
                className={`text-xs p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium border border-[var(--color-primary)]/20'
                    : isHighlighted
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : isSignature
                        ? 'bg-purple-50/50 text-purple-700 border border-purple-100 border-dashed'
                        : 'bg-white hover:bg-white/80'
                }`}
              >
                <span className="flex-1">{block.text}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0 ml-2">
                  {(block.confidence * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== 结构化字段视图 ====================

const FIELD_CONFIG: Array<{ key: keyof StructuredData; label: string; icon: typeof User; placeholder?: string; type?: 'text' | 'textarea' | 'select' }> = [
  { key: 'patientName', label: '姓名', icon: User, placeholder: '例如：张芃越' },
  { key: 'gender', label: '性别', icon: User, placeholder: '男 / 女' },
  { key: 'age', label: '年龄', icon: User, placeholder: '例如：37' },
  { key: 'hospital', label: '医院', icon: Building2, placeholder: '例如：北京协和医院' },
  { key: 'department', label: '科室', icon: Stethoscope, placeholder: '例如：心内科' },
  { key: 'visitDate', label: '就诊日期', icon: CalendarDays, placeholder: 'YYYY-MM-DD' },
  { key: 'chiefComplaint', label: '主诉', icon: FileText, placeholder: '患者主要症状', type: 'textarea' },
  { key: 'presentIllness', label: '现病史', icon: FileText, placeholder: '当前病情描述', type: 'textarea' },
  { key: 'diagnosis', label: '诊断', icon: FileText, placeholder: '多个诊断用逗号分隔' },
  { key: 'allergies', label: '过敏史', icon: AlertTriangle, placeholder: '药物过敏信息' },
  { key: 'notes', label: '备注', icon: FileText, placeholder: '医嘱或备注信息', type: 'textarea' },
];

function FieldsView({
  editedData,
  selectedDocType,
  selectedVisitType,
  selectedField,
  signatureBlocks,
  onDocTypeChange,
  onVisitTypeChange,
  onFieldClick,
  onFieldEdit,
  fieldsRef,
}: {
  editedData: StructuredData;
  selectedDocType: DocumentType;
  selectedVisitType: VisitType;
  selectedField: string | null;
  signatureBlocks: number[];
  onDocTypeChange: (type: DocumentType) => void;
  onVisitTypeChange: (type: VisitType) => void;
  onFieldClick: (fieldName: string) => void;
  onFieldEdit: (field: string, label: string, value?: string) => void;
  fieldsRef: React.RefObject<HTMLDivElement | null>;
}) {
  const renderField = (config: typeof FIELD_CONFIG[0]) => {
    const { key, label, icon: Icon, placeholder, type } = config;
    const value = editedData[key] as string | undefined;
    const isSelected = selectedField === key;
    const displayValue = value || placeholder || '未识别';

    return (
      <div
        id={`field-${key}`}
        onClick={() => onFieldClick(key)}
        className={`py-2.5 border-b border-[var(--color-border)]/50 last:border-0 cursor-pointer transition-colors rounded-lg px-2 -mx-2 ${
          isSelected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <label className="text-xs text-[var(--color-text-secondary)]">{label}</label>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFieldEdit(key, label, value);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Edit2 className="w-3 h-3 text-[var(--color-text-muted)]" />
          </button>
        </div>
        <p className={`text-sm mt-0.5 pl-[22px] ${value ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
          {displayValue}
        </p>
      </div>
    );
  };

  return (
    <div ref={fieldsRef} className="space-y-4">
      {/* 文档类型选择 */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
        <label className="text-xs text-[var(--color-text-secondary)] block mb-2">文档类型</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DOCUMENT_TYPE_CONFIG) as DocumentType[]).map(type => {
            const config = DOCUMENT_TYPE_CONFIG[type];
            const isSelected = selectedDocType === type;
            return (
              <button
                key={type}
                onClick={() => onDocTypeChange(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? 'text-white'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]/80'
                }`}
                style={isSelected ? { backgroundColor: config.color } : undefined}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 就诊类型选择 */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
        <label className="text-xs text-[var(--color-text-secondary)] block mb-2">就诊类型</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(VISIT_TYPE_CONFIG) as VisitType[]).map(type => {
            const config = VISIT_TYPE_CONFIG[type];
            const isSelected = selectedVisitType === type;
            return (
              <button
                key={type}
                onClick={() => onVisitTypeChange(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  isSelected
                    ? 'text-white'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]/80'
                }`}
                style={isSelected ? { backgroundColor: config.color } : undefined}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 基本信息 */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
        <h3 className="text-xs font-semibold text-[var(--color-text)] mb-1">基本信息</h3>
        {renderField(FIELD_CONFIG[0])}
        {renderField(FIELD_CONFIG[1])}
        {renderField(FIELD_CONFIG[2])}
      </div>

      {/* 就诊信息 */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
        <h3 className="text-xs font-semibold text-[var(--color-text)] mb-1">就诊信息</h3>
        {renderField(FIELD_CONFIG[3])}
        {renderField(FIELD_CONFIG[4])}
        {renderField(FIELD_CONFIG[5])}
        {renderField(FIELD_CONFIG[6])}
      </div>

      {/* 诊断 */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
        <h3 className="text-xs font-semibold text-[var(--color-text)] mb-1">诊断</h3>
        {renderField(FIELD_CONFIG[7])}
        {renderField(FIELD_CONFIG[8])}
        {renderField(FIELD_CONFIG[9])}
      </div>

      {/* 签名区提示 */}
      {signatureBlocks.length > 0 && (
        <div className="bg-purple-50 rounded-xl border border-purple-100 p-3 flex items-start gap-2">
          <PenLine className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-purple-700">检测到 {signatureBlocks.length} 个签名区域</p>
            <p className="text-[10px] text-purple-500 mt-0.5">手写签名无需编辑，已自动标记</p>
          </div>
        </div>
      )}

      {/* 检验项目 */}
      {editedData.testItems && editedData.testItems.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
          <h3 className="text-xs font-semibold text-[var(--color-text)] mb-2">
            检验项目 ({editedData.testItems.length}项)
          </h3>
          <div className="space-y-2">
            {editedData.testItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                  item.isAbnormal ? 'bg-red-50' : 'bg-[var(--color-bg)]'
                }`}
              >
                <div className="flex-1">
                  <span className="font-medium">{item.name}</span>
                  {item.nameEn && (
                    <span className="text-[var(--color-text-muted)] ml-1">({item.nameEn})</span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${item.isAbnormal ? 'text-[var(--color-danger)]' : ''}`}>
                    {item.result}
                    {item.isAbnormal && (item.abnormalDirection === 'high' ? ' ↑' : ' ↓')}
                  </span>
                  <span className="text-[var(--color-text-muted)] ml-1">{item.unit}</span>
                  <span className="text-[var(--color-text-muted)] ml-2">{item.referenceRange}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 药品 */}
      {editedData.medications && editedData.medications.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
          <h3 className="text-xs font-semibold text-[var(--color-text)] mb-2">
            药品 ({editedData.medications.length}种)
          </h3>
          <div className="space-y-2">
            {editedData.medications.map((med, i) => (
              <div key={i} className="p-2 bg-[var(--color-bg)] rounded-lg text-xs">
                <p className="font-medium">{med.name}</p>
                <p className="text-[var(--color-text-muted)] mt-0.5">
                  {med.specification} · {med.dosage} · {med.frequency}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 底部编辑抽屉 ====================

function EditDrawer({
  label,
  value,
  onChange,
  onSave,
  onClose,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* 抽屉 */}
      <div className="relative bg-white rounded-t-2xl shadow-2xl animate-slide-up">
        {/* 把手 */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
          <h3 className="text-sm font-semibold">编辑{label}</h3>
          <button onClick={onSave} className="p-2 -mr-2 hover:bg-[var(--color-primary)]/10 rounded-lg">
            <Save className="w-4 h-4 text-[var(--color-primary)]" />
          </button>
        </div>
        {/* 输入区 */}
        <div className="p-4 pb-8">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-32 px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 resize-none"
            placeholder={`请输入${label}...`}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg)] rounded-xl"
            >
              取消
            </button>
            <button
              onClick={onSave}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-[var(--color-primary)] rounded-xl"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
