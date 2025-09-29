import { cn } from "../../lib/utils"

/**
 * Reusable Skeleton Component for loading states
 * @param {string} className - Additional CSS classes
 * @param {string} variant - 'default' | 'circle' | 'rectangular'
 * @param {string} animation - 'pulse' | 'wave' | 'none'
 */
function Skeleton({ 
  className, 
  variant = 'default',
  animation = 'pulse',
  ...props 
}) {
  const variantClasses = {
    default: 'rounded-md',
    circle: 'rounded-full',
    rectangular: 'rounded-none'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse', // Could be enhanced with custom wave animation
    none: ''
  };

  return (
    <div
      className={cn(
        "bg-gray-200",
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      {...props}
    />
  )
}

// Predefined skeleton patterns
const SkeletonText = ({ lines = 1, className }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        className={cn(
          "h-4",
          i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
        )} 
      />
    ))}
  </div>
);

const SkeletonCard = ({ className }) => (
  <div className={cn("space-y-3", className)}>
    <Skeleton className="h-4 w-3/4" />
    <SkeletonText lines={2} />
    <Skeleton className="h-8 w-1/3" />
  </div>
);

const SkeletonAvatar = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10', 
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <Skeleton 
      variant="circle" 
      className={cn(sizeClasses[size], className)} 
    />
  );
};

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar }