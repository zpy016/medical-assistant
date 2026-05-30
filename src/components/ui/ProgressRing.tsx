/**
 * SVG 环形进度条
 * 用于依从率 / 接种进度 / 完成率
 */
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  showText?: boolean;
  textSize?: number;
  className?: string;
}

export default function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 5,
  color = 'var(--color-primary)',
  bgColor = '#e5e7eb',
  showText = true,
  textSize = 14,
  className = '',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  // 根据进度自动选择颜色
  const autoColor =
    progress >= 100 ? '#f59e0b' : // 金色
    progress >= 90 ? 'var(--color-success)' :
    progress >= 70 ? 'var(--color-warning)' :
    'var(--color-danger)';

  const finalColor = color === 'auto' ? autoColor : color;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={finalColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      {showText && (
        <span
          className="absolute inset-0 flex items-center justify-center font-bold"
          style={{ fontSize: textSize, color: finalColor }}
        >
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}
