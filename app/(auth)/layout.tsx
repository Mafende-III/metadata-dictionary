'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { Layout } from '@/src/components/layout/Layout';
import { Loading } from '@/src/components/ui/Loading';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, clearCredentials, username, dhisBaseUrl } = useAuthStore();
  
  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);
  
  
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
  
  // Create session object from auth store data
  const session = isAuthenticated ? {
    id: 'local-session',
    userId: username || 'user',
    serverUrl: dhisBaseUrl || '',
    username: username || '',
    displayName: username || '',
    token: '',
    expiresAt: '',
    lastUsed: new Date().toISOString()
  } : null;

  // Render the layout with authenticated session
  return (
    <Layout
      session={session}
      onLogout={clearCredentials}
    >
      {children}
    </Layout>
  );
}