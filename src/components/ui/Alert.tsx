'use client';

import { ReactNode } from 'react';
import { 
  InformationCircleIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  XCircleIcon 
} from '@heroicons/react/24/outline';

export type AlertVariant = 'info' | 'warning' | 'success' | 'error';

export interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
}

export interface AlertDescriptionProps {
  children: ReactNode;
  className?: string;
}

const variantStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

const iconMap = {
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
  success: CheckCircleIcon,
  error: XCircleIcon,
};

export default function Alert({ 
  children, 
  variant = 'info', 
  className = '' 
}: AlertProps) {
  const Icon = iconMap[variant];
  
  return (
    <div className={`rounded-md border p-4 ${variantStyles[variant]} ${className}`}>
      <div className="flex items-start">
        <Icon className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AlertDescription({ children, className = '' }: AlertDescriptionProps) {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  );
}