import React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'default' | 'lg'
  showLabel?: boolean
  animated?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value = 0, 
    max = 100, 
    variant = 'default',
    size = 'default',
    showLabel = false,
    animated = false,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    const progressVariants = {
      default: 'bg-green-700',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500'
    }
    
    const sizeVariants = {
      sm: 'h-1',
      default: 'h-2',
      lg: 'h-3'
    }

    return (
      <div className={cn('relative w-full', className)} ref={ref} {...props}>
        <div
          className={cn(
            'relative w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800',
            sizeVariants[size]
          )}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
        >
          <div
            className={cn(
              'h-full w-full flex-1 transition-all duration-300 ease-in-out',
              progressVariants[variant],
              animated && 'animate-pulse'
            )}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </div>
        {showLabel && (
          <div className="mt-1 flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{Math.round(percentage)}%</span>
            <span>{value}/{max}</span>
          </div>
        )}
      </div>
    )
  }
)

Progress.displayName = 'Progress'

export { Progress }