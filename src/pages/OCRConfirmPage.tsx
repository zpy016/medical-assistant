/**
 * OCR结果确认页面
 * PRD核心交互：原图 ↔ 转录结果 左右对比界面
 * 特征：
 * - 点击转录字段 → 原图对应区域高亮
 * - 点击原图区域 → 转录字段高亮
 * - 字段可编辑修正
 * - 自动标记异常指标
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { parseOCRResult } from '../services/ocrService';
import type { StructuredData, DocumentType, OCRTextBlock, UploadTask } from '../types';
import { DOCUMENT_TYPE_CONFIG, getDocumentTypeLabel } from '../utils/helpers';
import { ArrowLeft, Edit2, Check, AlertTriangle, Sparkles, Type, Image as ImageIcon } from 'lucide-react';

export default function OCRConfirmPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { uploadTasks, confirmRecord } = useRecordStore();
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const task = uploadTasks.find(t => t.id === taskId);

  const [viewMode, setViewMode] = useState<'split' | 'fields'>('fields');
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<StructuredData>({});
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('medical_record');

  // 初始化结构化数据
  useEffect(() => {
    if (task?.ocrResult) {
      const parsed = parseOCRResult(task.ocrResult);
      setEditedData(parsed.structuredData);
      setSelectedDocType(parsed.documentType);
    }
  }, [task]);

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

  const handleFieldClick = useCallback((blockIndex: number) => {
    setSelectedBlock(blockIndex);
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // 找到最近的文本块
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
    }
  }, [task.ocrResult]);

  const handleConfirm = async () => {
    if (!taskId) return;
    await confirmRecord(taskId, editedData, selectedDocType);
    navigate('/timeline');
  };

  const handleFieldEdit = (field: string, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const ocrResult = task.ocrResult;
  const confidence = ocrResult?.confidence ?? 0;

  return (
    <div className="min-h-full bg-white animate-fade-in">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-[var(--color-border)]">
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
      <div className="flex border-b border-[var(--color-border)]">
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
            onImageClick={handleImageClick}
            onFieldClick={handleFieldClick}
          />
        ) : (
          <FieldsView
            editedData={editedData}
            selectedDocType={selectedDocType}
            onDocTypeChange={setSelectedDocType}
            editingField={editingField}
            onEditStart={setEditingField}
            onEditEnd={() => setEditingField(null)}
            onFieldEdit={handleFieldEdit}
          />
        )}
      </div>

      {/* 底部确认按钮 */}
      <div className="sticky bottom-0 bg-white border-t border-[var(--color-border)] p-4">
        <button
          onClick={handleConfirm}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          确认并归档
        </button>
        <p className="text-[10px] text-center text-[var(--color-text-muted)] mt-2">
          点击字段可直接编辑修正 · 确认后将加入您的病历时间线
        </p>
      </div>
    </div>
  );
}

// ==================== 图文对照视图 ====================

function SplitView({
  task,
  imageRef,
  containerRef,
  selectedBlock,
  onImageClick,
  onFieldClick,
}: {
  task: UploadTask;
  imageRef: React.RefObject<HTMLImageElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectedBlock: number | null;
  onImageClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onFieldClick: (index: number) => void;
}) {
  const textBlocks = task.ocrResult?.textBlocks ?? [];

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
        {textBlocks.map((block, i) => (
          <div
            key={i}
            className={`absolute border-2 rounded transition-all cursor-pointer ${
              selectedBlock === i
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
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
              onFieldClick(i);
            }}
          />
        ))}
      </div>

      {/* 转录文本列表 */}
      <div className="bg-[var(--color-bg)] rounded-xl p-3">
        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">识别文本</p>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {textBlocks.map((block, i) => (
            <div
              key={i}
              onClick={() => onFieldClick(i)}
              className={`text-xs p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                selectedBlock === i
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                  : 'bg-white hover:bg-white/80'
              }`}
            >
              <span>{block.text}</span>
              <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0 ml-2">
                {(block.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== 结构化字段视图 ====================

function FieldsView({
  editedData,
  selectedDocType,
  onDocTypeChange,
  editingField,
  onEditStart,
  onEditEnd,
  onFieldEdit,
}: {
  editedData: StructuredData;
  selectedDocType: DocumentType;
  onDocTypeChange: (type: DocumentType) => void;
  editingField: string | null;
  onEditStart: (field: string) => void;
  onEditEnd: () => void;
  onFieldEdit: (field: string, value: string) => void;
}) {
  const renderField = (label: string, field: keyof StructuredData, placeholder?: string) => {
    const value = editedData[field] as string | undefined;
    const isEditing = editingField === field;

    return (
      <div className="py-2.5 border-b border-[var(--color-border)]/50 last:border-0">
        <div className="flex items-center justify-between">
          <label className="text-xs text-[var(--color-text-secondary)]">{label}</label>
          {!isEditing && (
            <button
              onClick={() => onEditStart(field)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <Edit2 className="w-3 h-3 text-[var(--color-text-muted)]" />
            </button>
          )}
        </div>
        {isEditing ? (
          <input
            autoFocus
            type="text"
            defaultValue={value ?? ''}
            placeholder={placeholder}
            className="w-full mt-1 px-2 py-1.5 text-sm border border-[var(--color-primary)] rounded-lg outline-none"
            onBlur={(e) => {
              onFieldEdit(field, e.target.value);
              onEditEnd();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onFieldEdit(field, e.currentTarget.value);
                onEditEnd();
              }
            }}
          />
        ) : (
          <p className={`text-sm mt-0.5 ${value ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
            {value || placeholder || '未识别'}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
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

      {/* 基本信息 */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
        <h3 className="text-xs font-semibold text-[var(--color-text)] mb-1">基本信息</h3>
        {renderField('姓名', 'patientName', '例如：张芃越')}
        {renderField('性别', 'gender')}
        {renderField('年龄', 'age')}
      </div>

      {/* 就诊信息 */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
        <h3 className="text-xs font-semibold text-[var(--color-text)] mb-1">就诊信息</h3>
        {renderField('医院', 'hospital', '例如：北京协和医院')}
        {renderField('科室', 'department', '例如：心内科')}
        {renderField('就诊日期', 'visitDate', 'YYYY-MM-DD')}
        {renderField('主诉', 'chiefComplaint')}
      </div>

      {/* 诊断 */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3">
        <h3 className="text-xs font-semibold text-[var(--color-text)] mb-1">诊断</h3>
        {renderField('初步诊断', 'diagnosis', '多个诊断用逗号分隔')}
        {renderField('过敏史', 'allergies')}
      </div>

      {/* 检验项目（如果是检验报告） */}
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

      {/* 药品（如果是处方） */}
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
