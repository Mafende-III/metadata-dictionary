'use client';

import { useState } from 'react';
import { useAuthStore } from '../../lib/stores/authStore';

export default function CredentialSetup() {
  const { setCredentials, isAuthenticated, dhisBaseUrl } = useAuthStore();
  const [formData, setFormData] = useState({
    baseUrl: 'https://your-dhis2-instance.org',
    username: '',
    password: ''
  });
  const [testing, setTesting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    
    try {
      // Test the credentials
      const authToken = btoa(`${formData.username}:${formData.password}`);
      const testUrl = `${formData.baseUrl}/api/me.json`;
      
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Basic ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setCredentials(formData.baseUrl, formData.username, formData.password);
        alert('Credentials saved successfully!');
      } else {
        alert(`Authentication failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">✓ Authenticated</h3>
        <p className="text-green-800 text-sm">Connected to: {dhisBaseUrl}</p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h3 className="font-semibold text-yellow-900 mb-4">DHIS2 Credentials Setup</h3>
      
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