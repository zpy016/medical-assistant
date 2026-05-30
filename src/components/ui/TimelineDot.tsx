/**
 * 时间轴节点
 * 支持不同状态（default/active/completed/warning）
 */
interface TimelineDotProps {
  status?: 'default' | 'active' | 'completed' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const statusStyles = {
  default: 'bg-gray-300 border-gray-300',
  active: 'bg-[var(--color-primary)] border-[var(--color-primary)]',
  completed: 'bg-[var(--color-success)] border-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)] border-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)] border-[var(--color-danger)]',
};

const sizeStyles = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export default function TimelineDot({
  status = 'default',
  size = 'md',
  pulse = false,
  className = '',
}: TimelineDotProps) {
  return (
    <div className={`relative ${className}`}>
      {/* 脉冲动画环 */}
      {pulse && status === 'danger' && (
        <span className="absolute inset-0 rounded-full animate-pulse-soft bg-red-400/30" />
      )}
      <div
        className={`
          rounded-full border-2 border-white shadow-sm
          ${statusStyles[status]}
          ${sizeStyles[size]}
        `}
      />
    </div>
  );
}
