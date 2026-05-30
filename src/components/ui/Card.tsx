/**
 * 统一卡片容器
 * variant: default(白底+边框) / elevated(白底+阴影) / ghost(透明)
 */
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'ghost';
  onClick?: () => void;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

const variantStyles = {
  default: 'bg-white rounded-xl border border-[var(--color-border)]',
  elevated: 'bg-white rounded-xl shadow-md shadow-gray-200/50',
  ghost: 'bg-transparent',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export default function Card({
  children,
  variant = 'default',
  onClick,
  className = '',
  padding = 'md',
  style,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${onClick ? 'cursor-pointer touch-feedback active:scale-[0.99]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
