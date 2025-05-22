'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDHIS2Auth } from '../../hooks/useDHIS2Auth';
import { Layout } from '../../components/layout/Layout';
import { Loading } from '../../components/ui/Loading';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated, session, logout } = useDHIS2Auth();
  
  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading
          size="lg"
          text="Loading authentication..."
        />
      </div>
    );
  }
  
  // Show loading state if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading
          size="lg"
          text="Redirecting to login..."
        />
      </div>
    );
  }
  
  // Render the layout with authenticated session
  return (
    <Layout
      session={session}
      onLogout={logout}
    >
      {children}
    </Layout>
  );
}