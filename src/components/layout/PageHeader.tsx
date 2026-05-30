/**
 * 统一页面顶部导航栏
 * 粘性定位 + 背景模糊 + 底部细线分隔
 */
import { ArrowLeft, type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
  };
  transparent?: boolean;
}

export default function PageHeader({ title, onBack, rightAction, transparent = false }: PageHeaderProps) {
  return (
    <div className={`sticky top-0 z-30 ${transparent ? '' : 'bg-white/95 backdrop-blur-md border-b border-[var(--color-border)]'}`}>
      <div className="flex items-center justify-between px-4 py-3">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] touch-feedback p-1 -ml-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回</span>
          </button>
        ) : (
          <div className="w-16" />
        )}

        <h1 className="text-base font-semibold text-[var(--color-text)] truncate max-w-[200px]">
          {title}
        </h1>

        {rightAction ? (
          <button
            onClick={rightAction.onClick}
            className="flex items-center gap-1 text-sm text-[var(--color-primary)] touch-feedback p-1 -mr-1 rounded-lg hover:bg-teal-50"
            title={rightAction.label}
          >
            <rightAction.icon className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>
    </div>
  );
}
