import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Enhanced Input Component with variants and states
 * @param {string} type - Input type
 * @param {string} variant - 'default' | 'error' | 'success'
 * @param {string} size - 'sm' | 'default' | 'lg'
 * @param {React.ReactNode} leftIcon - Icon to show on the left
 * @param {React.ReactNode} rightIcon - Icon to show on the right
 * @param {string} className - Additional CSS classes
 */
const Input = React.forwardRef(({ 
  className, 
  type = "text", 
  variant = "default",
  size = "default",
  leftIcon,
  rightIcon,
  error,
  success,
  ...props 
}, ref) => {
  const baseClasses = "flex w-full rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  
  const variantClasses = {
    default: "border-gray-300 focus-visible:border-blue-500 focus-visible:ring-blue-500/20",
    error: "border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20 bg-red-50",
    success: "border-green-300 focus-visible:border-green-500 focus-visible:ring-green-500/20 bg-green-50"
  };

  const sizeClasses = {
    sm: "h-8 text-xs",
    default: "h-10",
    lg: "h-12 text-base"
  };

  // Determine variant based on props
  let currentVariant = variant;
  if (error) currentVariant = "error";
  if (success) currentVariant = "success";

  if (leftIcon || rightIcon) {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            baseClasses,
            variantClasses[currentVariant],
            sizeClasses[size],
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      type={type}
      className={cn(
        baseClasses,
        variantClasses[currentVariant],
        sizeClasses[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }