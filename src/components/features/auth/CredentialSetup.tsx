'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';

export default function CredentialSetup() {
  const { setCredentials, isAuthenticated, dhisBaseUrl, clearCredentials } = useAuthStore();
  const [formData, setFormData] = useState({
    baseUrl: dhisBaseUrl || 'https://your-dhis2-instance.org',
    username: '',
    password: ''
  });
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Load existing values on component mount
  useEffect(() => {
    if (dhisBaseUrl) {
      setFormData(prev => ({ ...prev, baseUrl: dhisBaseUrl }));
    }
  }, [dhisBaseUrl]);

  const normalizeBaseUrl = (url: string): string => {
    let normalizedUrl = url.trim();
    
    // Remove trailing slash if present
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }
    
    // Ensure URL has protocol
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    
    return normalizedUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Normalize the base URL
      const normalizedBaseUrl = normalizeBaseUrl(formData.baseUrl);
      
      // Test the credentials using the API proxy route
      const response = await fetch('/api/dhis2/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverUrl: normalizedBaseUrl,
          username: formData.username,
          password: formData.password
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.connected) {
        // Save credentials to the store
        setCredentials(normalizedBaseUrl, formData.username, formData.password);
        setSuccess(true);
        
        // Reset error if there was one
        setError(null);
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
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">✓ Authenticated</h3>
        <p className="text-green-800 text-sm mb-3">Connected to: {dhisBaseUrl}</p>
        
        <button
          onClick={handleReset}
          className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
        >
          Reset Credentials
        </button>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h3 className="font-semibold text-yellow-900 mb-4">DHIS2 Credentials Setup</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
          <p className="text-green-700 text-sm">Credentials saved successfully!</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">DHIS2 Base URL</label>
          <input
            type="url"
            value={formData.baseUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder="https://your-dhis2-instance.org"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Example: https://play.dhis2.org/demo
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={testing}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {testing ? 'Testing Connection...' : 'Save & Test Credentials'}
        </button>
      </form>
    </div>
  );
} 