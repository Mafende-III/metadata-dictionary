'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SqlViewsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the setup page
    router.push('/setup/sql-views');
  }, [router]);

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Redirecting...</h1>
        <p className="text-gray-600">Please wait while we redirect you to SQL Views</p>
      </div>
    </div>
  );
} 