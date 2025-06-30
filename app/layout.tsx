import type { Metadata } from 'next';
// REMOVED: import { Inter } from 'next/font/google';  ← This was causing the app crash
import { Suspense } from 'react';
import QueryProvider from '@/src/providers/QueryProvider';
import './globals.css';

// REMOVED: const inter = Inter({ subsets: ['latin'] });  ← This too

export const metadata: Metadata = {
  title: 'DHIS2 Metadata Dictionary',
  description: 'Explore, assess, and document DHIS2 metadata quality',
  keywords: ['DHIS2', 'metadata', 'data quality', 'health information systems'],
  authors: [{ name: 'DHIS2 Metadata Dictionary Team' }],
  openGraph: {
    title: 'DHIS2 Metadata Dictionary',
    description: 'Explore, assess, and document DHIS2 metadata quality',
    type: 'website',
  },
};

// Global loading fallback
const GlobalLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading DHIS2 Metadata Dictionary...</p>
    </div>
  </div>
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <QueryProvider>
          <Suspense fallback={<GlobalLoader />}>
            {children}
          </Suspense>
        </QueryProvider>
      </body>
    </html>
  );
}
