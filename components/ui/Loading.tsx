import { HTMLAttributes } from 'react';

// Loading sizes
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

// Loading variants
export type LoadingVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

// Loading props
export interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  size?: LoadingSize;
  variant?: LoadingVariant;
  text?: string;
  fullScreen?: boolean;
}

export const Loading = ({
  size = 'md',
  variant = 'primary',
  text,
  fullScreen = false,
  className = '',
  ...props
}: LoadingProps) => {
  // Size styles
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  
  // Color styles
  const colorStyles = {
    default: 'text-gray-500',
    primary: 'text-blue-600',
    secondary: 'text-purple-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };
  
  // Full screen styles
  const fullScreenStyles = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50'
    : 'flex items-center justify-center';
  
  // Combined styles
  const containerStyles = `${fullScreenStyles} ${className}`;
  const spinnerStyles = `animate-spin ${sizeStyles[size]} ${colorStyles[variant]}`;
  
  return (
    <div className={containerStyles} {...props}>
      <div className="flex flex-col items-center">
        <svg
          className={spinnerStyles}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        
        {text && (
          <span className="mt-2 text-sm font-medium text-gray-500">{text}</span>
        )}
      </div>
    </div>
  );
}; 