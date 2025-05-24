'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SqlViewsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">SQL Views</h1>
      <p className="mt-4 text-gray-600">SQL Views page - under construction</p>
      <a 
        href="/setup/sql-views" 
        className="mt-4 inline-block text-blue-500 hover:underline"
      >
        Go to SQL Views Setup
      </a>
    </div>
  );
} 