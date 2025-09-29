import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Reusable Avatar Component
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text for accessibility
 * @param {string} fallback - Fallback text (initials)
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} className - Additional CSS classes
 */
const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <img
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = "AvatarFallback"

// Compound Avatar with built-in logic
const UserAvatar = ({ 
  src, 
  alt, 
  fallback, 
  size = 'md', 
  className, 
  ...props 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg'
  };

  const [imgError, setImgError] = React.useState(false);

  return (
    <Avatar className={cn(sizeClasses[size], className)} {...props}>
      {src && !imgError ? (
        <AvatarImage 
          src={src} 
          alt={alt} 
          onError={() => setImgError(true)}
        />
      ) : (
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          {fallback || alt?.charAt(0)?.toUpperCase() || '?'}
        </AvatarFallback>
      )}
    </Avatar>
  );
};

export { Avatar, AvatarImage, AvatarFallback, UserAvatar }