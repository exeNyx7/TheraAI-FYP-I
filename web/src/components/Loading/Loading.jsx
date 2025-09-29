/**
 * Loading Component
 * Reusable loading spinner with no overlapping issues
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Loading Component
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} message - Loading message to display
 * @param {boolean} fullScreen - Whether to show as fullscreen overlay
 * @param {string} variant - 'default' | 'dots' | 'pulse' | 'spinner'
 * @param {string} color - 'blue' | 'purple' | 'green' | 'gray'
 * @param {string} className - Additional CSS classes
 */
function Loading({ 
  size = 'md', 
  message = 'Loading...', 
  fullScreen = false, 
  variant = 'spinner',
  color = 'blue',
  className,
  showMessage = true,
  ...props 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
    gray: 'text-gray-600'
  };

  const messageSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const LoadingSpinner = () => {
    if (variant === 'dots') {
      return (
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'rounded-full animate-bounce',
                sizeClasses[size]?.replace('w-', 'w-').replace('h-', 'h-').split(' ')[0].replace('w-', 'w-2 h-2') || 'w-2 h-2',
                colorClasses[color]?.replace('text-', 'bg-') || 'bg-blue-600'
              )}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      );
    }

    if (variant === 'pulse') {
      return (
        <div className={cn(
          'rounded-full animate-pulse',
          sizeClasses[size] || 'w-8 h-8',
          colorClasses[color]?.replace('text-', 'bg-') || 'bg-blue-600'
        )} />
      );
    }

    // Default spinner variant
    return (
      <Loader2 className={cn(
        'animate-spin',
        sizeClasses[size] || 'w-8 h-8',
        colorClasses[color] || 'text-blue-600'
      )} />
    );
  };

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      className
    )} {...props}>
      <LoadingSpinner />
      {showMessage && message && (
        <p className={cn(
          'font-medium text-gray-600 text-center',
          messageSizeClasses[size] || 'text-sm'
        )}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}

export default Loading;