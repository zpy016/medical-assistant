/**
 * 上传页面
 * 支持拍照上传、相册选择、文件拖拽
 * 核心功能入口：病历OCR处理流程起点
 */

import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordStore } from '../stores/recordStore';
import { performOCR } from '../services/ocrService';
import { parseOCRResult } from '../services/ocrService';
import { compressImage } from '../utils/helpers';
import { Camera, ImagePlus, FileUp, X, Loader2, CheckCircle2 } from 'lucide-react';

export default function UploadPage() {
  const navigate = useNavigate();
  const { uploadTasks, addUploadTask, updateTaskStatus, setTaskOCRResult, removeUploadTask } = useRecordStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      const taskId = addUploadTask(file);
      updateTaskStatus(taskId, 'processing', 10);

      try {
        // 图片压缩
        updateTaskStatus(taskId, 'processing', 30);
        const compressed = await compressImage(file, 1920, 0.85);
        const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' });

        // OCR识别
        updateTaskStatus(taskId, 'processing', 50);
        const ocrResult = await performOCR(compressedFile, { useMock: true });

        updateTaskStatus(taskId, 'processing', 90);
        setTaskOCRResult(taskId, ocrResult);

        // 自动跳转到确认页面
        navigate(`/ocr-confirm/${taskId}`);
      } catch (error) {
        console.error('OCR处理失败:', error);
        updateTaskStatus(taskId, 'error', 0);
      }
    }
  }, [addUploadTask, updateTaskStatus, setTaskOCRResult, navigate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="min-h-full px-5 pt-6 pb-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text)]">上传病历</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          拍照或选择图片，AI自动识别并整理
        </p>
      </div>

      {/* 上传区域 */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-[var(--color-primary)]/30 rounded-2xl p-8 text-center bg-[var(--color-primary)]/5 transition-colors hover:border-[var(--color-primary)]/50"
      >
        <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-[var(--color-primary)]" />
        </div>
        <p className="text-sm font-medium text-[var(--color-text)]">点击拍照或选择图片</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
          支持 JPG、PNG 格式，单张不超过 10MB
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          也可将图片拖拽到此处
        </p>

        <div className="flex justify-center gap-3 mt-5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
          >
            <ImagePlus className="w-4 h-4" />
            选择图片
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-[var(--color-primary)] border border-[var(--color-primary)]/20 rounded-xl text-sm font-medium active:scale-95 transition-transform"
          >
            <FileUp className="w-4 h-4" />
            选择文件
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* 上传提示 */}
      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">支持识别</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { icon: '📋', label: '门诊/住院病历', desc: '主诉、诊断、病史' },
            { icon: '🧪', label: '检验报告', desc: '血常规、生化指标' },
            { icon: '📷', label: '影像报告', desc: 'CT、MRI、X光' },
            { icon: '💊', label: '处方笺', desc: '药品、剂量、用法' },
            { icon: '🧾', label: '收费票据', desc: '费用明细、医保信息' },
            { icon: '📄', label: '出院小结', desc: '入院诊断、治疗经过' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-2.5 p-3 bg-white rounded-xl">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-xs font-medium text-[var(--color-text)]">{item.label}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 上传任务列表 */}
      {uploadTasks.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">处理中</h3>
          <div className="space-y-2">
            {uploadTasks.map(task => (
              <div key={task.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
                <img
                  src={task.previewUrl}
                  alt="preview"
                  className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text)] truncate">
                    {task.file.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {task.status === 'processing' && (
                      <>
                        <Loader2 className="w-3 h-3 text-[var(--color-primary)] animate-spin" />
                        <span className="text-[10px] text-[var(--color-text-secondary)]">
                          AI识别中 {task.progress}%
                        </span>
                      </>
                    )}
                    {task.status === 'completed' && (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-[var(--color-success)]" />
                        <span className="text-[10px] text-[var(--color-success)]">识别完成</span>
                      </>
                    )}
                    {task.status === 'error' && (
                      <span className="text-[10px] text-[var(--color-danger)]">识别失败</span>
                    )}
                  </div>
                  {/* 进度条 */}
                  <div className="w-full h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeUploadTask(task.id)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-[var(--color-text-muted)]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
