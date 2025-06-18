import { HTMLAttributes, ReactNode } from 'react';

// Card variants
export type CardVariant = 'default' | 'outlined' | 'elevated';

// Card props
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  header?: ReactNode;
  footer?: ReactNode;
  rounded?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = ({
  children,
  variant = 'default',
  header,
  footer,
  rounded = true,
  padding = 'md',
  border = true,
  shadow = 'sm',
  className = '',
  ...props
}: CardProps) => {
  // Base styles
  const baseStyles = 'bg-white';
  
  // Border styles
  const borderStyles = border ? 'border border-gray-200' : '';
  
  // Shadow styles
  const shadowStyles = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };
  
  // Padding styles
  const paddingStyles = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };
  
  // Rounded styles
  const roundedStyles = rounded ? 'rounded-lg' : '';
  
  // Variant styles
  const variantStyles = {
    default: '',
    outlined: 'border border-gray-300',
    elevated: 'shadow-md',
  };
  
  // Combined styles
  const cardStyles = `
    ${baseStyles}
    ${borderStyles}
    ${shadowStyles[shadow]}
    ${roundedStyles}
    ${variantStyles[variant]}
    ${className}
  `;
  
  // Content padding
  const contentPadding = paddingStyles[padding];
  
  return (
    <div className={cardStyles} {...props}>
      {header && (
        <div className={`border-b border-gray-200 ${contentPadding}`}>
          {header}
        </div>
      )}
      
      <div className={contentPadding}>
        {children}
      </div>
      
      {footer && (
        <div className={`border-t border-gray-200 ${contentPadding}`}>
          {footer}
        </div>
      )}
    </div>
  );
}; 