'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';

export default function Home() {
  const router = useRouter();
  const { setCredentials, isAuthenticated, dhisBaseUrl, clearCredentials } = useAuthStore();
  
  const [formData, setFormData] = useState({
    baseUrl: 'https://play.dhis2.org/40/api',
    username: 'admin',
    password: 'district'
  });
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Redirect to data elements page if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/sql-views');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Test the credentials using the API proxy route
      const response = await fetch('/api/dhis2/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverUrl: formData.baseUrl,
          username: formData.username,
          password: formData.password
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.connected) {
        // Save credentials to the store
        setCredentials(formData.baseUrl, formData.username, formData.password);
        setSuccess(true);
        
        // Navigate to SQL views page
        setTimeout(() => {
          router.push('/sql-views');
        }, 1000);
      } else {
        setError(result.error || `Connection failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      setError(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleReset = () => {
    clearCredentials();
    setSuccess(false);
  };

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-2">✓ Authenticated</h3>
            <p className="text-green-800 text-sm mb-3">Connected to: {dhisBaseUrl}</p>
            
            <div className="space-y-2">
              <button
                onClick={() => router.push('/sql-views')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Go to SQL Views
              </button>
              <button
                onClick={handleReset}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200"
              >
                Reset Credentials
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              DHIS2 Metadata Dictionary
            </h1>
            <p className="text-gray-600">
              Sign in to your DHIS2 instance to explore SQL views
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
              <p className="text-green-700 text-sm">✓ Connection successful! Redirecting...</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DHIS2 Base URL
              </label>
              <input
                type="url"
                value={formData.baseUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://play.dhis2.org/40/api"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Pre-filled with demo instance. Change to your DHIS2 server.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={testing}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
            >
              {testing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing Connection...
                </span>
              ) : (
                'Sign In & Test Connection'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              A tool for exploring and documenting DHIS2 metadata with enhanced SQL views.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 