import { HTMLAttributes, ReactNode } from 'react';

// Badge variants
export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

// Badge sizes
export type BadgeSize = 'sm' | 'md' | 'lg';

// Badge props
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  rounded = true,
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}: BadgeProps) => {
  // Base styles
  const baseStyles = 'inline-flex items-center font-medium';
  
  // Variant styles
  const variantStyles = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-purple-100 text-purple-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-cyan-100 text-cyan-800',
  };
  
  // Size styles
  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };
  
  // Rounded styles
  const roundedStyles = rounded ? 'rounded-full' : 'rounded';
  
  // Icon spacing
  const iconSpacing = icon ? (iconPosition === 'left' ? 'mr-1' : 'ml-1') : '';
  
  // Combined styles
  const badgeStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${roundedStyles} ${className}`;
  
  return (
    <span className={badgeStyles} {...props}>
      {icon && iconPosition === 'left' && (
        <span className={iconSpacing}>{icon}</span>
      )}
      
      {children}
      
      {icon && iconPosition === 'right' && (
        <span className={iconSpacing}>{icon}</span>
      )}
    </span>
  );
}; 