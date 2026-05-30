/**
 * 底部滑出面板
 * 遮罩层淡入 + 面板 slideUp 动画
 */
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  height?: 'auto' | 'half' | 'full';
}

const heightStyles = {
  auto: 'max-h-[70vh]',
  half: 'h-[50vh]',
  full: 'h-[85vh]',
};

export default function BottomSheet({ isOpen, onClose, title, children, height = 'auto' }: BottomSheetProps) {
  // 锁定背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />

      {/* 面板 */}
      <div className={`relative bg-white rounded-t-3xl animate-slide-up flex flex-col ${heightStyles[height]}`}>
        {/* 拖动指示条 */}
        <div className="flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full touch-feedback"
          >
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4 pb-[env(safe-area-inset-bottom,16px)]">
          {children}
        </div>
      </div>
    </div>
  );
}
