/**
 * 数据统计卡片
 * 大数字 + 标签 + 趋势箭头
 */
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  onClick?: () => void;
  className?: string;
}

export default function StatCard({
  value,
  label,
  icon: Icon,
  iconColor = 'var(--color-primary)',
  iconBgColor = 'rgb(13 148 136 / 0.1)',
  trend,
  trendValue,
  onClick,
  className = '',
}: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-green-600' :
    trend === 'down' ? 'text-red-500' :
    'text-gray-400';

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-[var(--color-border)] p-4
        flex flex-col gap-2 min-w-[120px]
        ${onClick ? 'cursor-pointer touch-feedback active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: iconBgColor }}
          >
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
        )}
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-[var(--color-text)] leading-tight">
          {value}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}
