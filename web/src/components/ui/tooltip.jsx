import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Simple Tooltip Component (CSS-only implementation)
 * @param {React.ReactNode} content - Tooltip content
 * @param {string} position - 'top' | 'bottom' | 'left' | 'right'
 * @param {boolean} disabled - Whether tooltip is disabled
 * @param {string} className - Additional CSS classes
 */
const Tooltip = ({ 
  children, 
  content, 
  position = "top", 
  disabled = false,
  className,
  ...props 
}) => {
  const [isVisible, setIsVisible] = React.useState(false);

  if (disabled || !content) {
    return children;
  }

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800"
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      {...props}
    >
      {children}
      {isVisible && (
        <div 
          className={cn(
            "absolute z-50 px-3 py-2 text-xs text-white bg-gray-800 rounded-md shadow-lg whitespace-nowrap pointer-events-none",
            positionClasses[position],
            className
          )}
        >
          {content}
          <div 
            className={cn(
              "absolute w-0 h-0 border-4",
              arrowClasses[position]
            )} 
          />
        </div>
      )}
    </div>
  )
}

Tooltip.displayName = "Tooltip"

export { Tooltip }