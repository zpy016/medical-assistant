/**
 * 空状态占位组件
 * 大图标 + 主文案 + 辅助文案 + 操作按钮
 */
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--color-text-muted)]" />
      </div>
      <p className="text-sm font-medium text-[var(--color-text-secondary)] text-center">
        {title}
      </p>
      {description && (
        <p className="text-xs text-[var(--color-text-muted)] text-center mt-1 max-w-[240px]">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-xl touch-feedback active:scale-95 transition-transform"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
