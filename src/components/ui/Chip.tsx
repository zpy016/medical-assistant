/**
 * 标签/状态芯片
 * 支持颜色变体和可关闭
 */
import { X } from 'lucide-react';

type ChipColor = 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'info';

interface ChipProps {
  label: string;
  color?: ChipColor;
  size?: 'sm' | 'md';
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
}

const colorStyles: Record<ChipColor, string> = {
  primary: 'bg-teal-50 text-teal-700 border-teal-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  gray: 'bg-gray-50 text-gray-600 border-gray-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

const sizeStyles = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export default function Chip({
  label,
  color = 'gray',
  size = 'md',
  onClose,
  onClick,
  className = '',
}: ChipProps) {
  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${colorStyles[color]}
        ${sizeStyles[size]}
        ${onClick ? 'cursor-pointer touch-feedback' : ''}
        ${className}
      `}
    >
      {label}
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ml-0.5 hover:opacity-70 touch-feedback"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
