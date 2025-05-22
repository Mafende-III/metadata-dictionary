'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '../components/forms/LoginForm';
import { useDHIS2Auth } from '../hooks/useDHIS2Auth';
import { ROUTES } from '../lib/constants';

export default function Home() {
  const router = useRouter();
  const { isLoading, isAuthenticated, error, login, testConnection } = useDHIS2Auth();
  
  // Redirect to data elements page if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push(ROUTES.DATA_ELEMENTS);
    }
  }, [isAuthenticated, router]);
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <LoginForm
          onLogin={login}
          onTestConnection={testConnection}
          isLoading={isLoading}
          error={error}
        />
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            A tool for exploring and documenting DHIS2 metadata.
          </p>
        </div>
      </div>
    </div>
  );
} 