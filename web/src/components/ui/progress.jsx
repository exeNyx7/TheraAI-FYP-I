import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Reusable Progress Component
 * @param {number} value - Progress value (0-100)
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} color - 'blue' | 'green' | 'purple' | 'red' | 'yellow'
 * @param {boolean} showPercentage - Whether to show percentage text
 * @param {string} className - Additional CSS classes
 */
const Progress = React.forwardRef(({ 
  className, 
  value = 0, 
  size = 'md',
  color = 'blue',
  showPercentage = false,
  animated = false,
  ...props 
}, ref) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600'
  };

  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      <div
        ref={ref}
        className={cn(
          'w-full overflow-hidden rounded-full bg-gray-200',
          sizeClasses[size]
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full transition-all duration-500 ease-in-out rounded-full',
            colorClasses[color],
            animated && 'bg-gradient-to-r from-current to-current animate-pulse'
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showPercentage && (
        <div className="mt-1 text-xs text-gray-600 text-right">
          {Math.round(clampedValue)}%
        </div>
      )}
    </div>
  );
});

Progress.displayName = "Progress"

export { Progress }