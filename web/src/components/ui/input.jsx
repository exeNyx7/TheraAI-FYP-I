import * as React from "react"
import { cn } from "../../lib/utils"

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
  const baseClasses = "flex w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

  const variantClasses = {
    default: "border-input focus-visible:border-ring",
    error: "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
    success: "border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20",
  };

  const sizeClasses = {
    sm: "h-8 text-xs",
    default: "h-10",
    lg: "h-12 text-base",
  };

  let currentVariant = variant;
  if (error) currentVariant = "error";
  if (success) currentVariant = "success";

  if (leftIcon || rightIcon) {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
  );
});
Input.displayName = "Input";

export { Input };
