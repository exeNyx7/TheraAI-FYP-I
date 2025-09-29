import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

/**
 * Enhanced Button Variants with more options for TheraAI
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg",
        outline: "border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: "hover:bg-gray-100 hover:text-gray-900",
        link: "text-blue-600 underline-offset-4 hover:underline hover:text-blue-700",
        gradient: "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl",
        success: "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 shadow-md hover:shadow-lg",
        purple: "bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 py-3 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Enhanced Button Component with loading state and icon support
 * @param {string} variant - Button style variant
 * @param {string} size - Button size
 * @param {boolean} loading - Show loading spinner
 * @param {React.ReactNode} leftIcon - Icon to show on the left
 * @param {React.ReactNode} rightIcon - Icon to show on the right
 * @param {boolean} disabled - Disable button
 * @param {string} className - Additional CSS classes
 */
const Button = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props 
}, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {!loading && leftIcon && (
        <span className="mr-2">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }