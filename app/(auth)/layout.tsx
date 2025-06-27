'use client';

import { ReactNode } from 'react';
import Header from '@/src/components/layout/Header';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}