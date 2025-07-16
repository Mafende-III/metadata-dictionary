'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';

export default function Home() {
  const router = useRouter();
  const { setCredentials, isAuthenticated, dhisBaseUrl, clearCredentials } = useAuthStore();
  
  const [formData, setFormData] = useState({
    baseUrl: 'https://play.im.dhis2.org/stable-2-40-8-1/',
    username: 'admin',
    password: 'district'
  });
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [currentInstance, setCurrentInstance] = useState('demo');

  // Redirect to data elements page if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dictionaries');
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
        
        // Navigate to dictionaries page
        setTimeout(() => {
          router.push('/dictionaries');
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

  const switchInstance = () => {
    if (currentInstance === 'new') {
      alert('Add new instance functionality will be available after authentication.');
      setCurrentInstance('demo');
    }
  };

  // Login Form Modal
  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between py-4">
              <div 
                className="flex items-center gap-2 text-blue-600 font-bold text-xl cursor-pointer"
                onClick={() => setShowLoginForm(false)}
              >
                <span className="text-2xl">📊</span>
                DHIS2 Metadata Dictionary
              </div>
              <div className="user-menu">
                <div className="instance-selector">
                  <span>Instance:</span>
                  <select 
                    value={currentInstance} 
                    onChange={(e) => {
                      setCurrentInstance(e.target.value);
                      switchInstance();
                    }}
                  >
                    <option value="demo">Demo DHIS2</option>
                    <option value="production">Production</option>
                    <option value="new">+ Add New Instance</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Login Form */}
        <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4">
          <div className="w-full max-w-md">
            <div className="bg-white shadow-lg rounded-lg p-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Sign In to DHIS2
                </h1>
                <p className="text-gray-600">
                  Connect to your DHIS2 instance to explore metadata dictionaries
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
                    placeholder="https://play.im.dhis2.org/stable-2-40-8-1/"
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
                <button
                  onClick={() => setShowLoginForm(false)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-2">✓ Authenticated</h3>
            <p className="text-green-800 text-sm mb-3">Connected to: {dhisBaseUrl}</p>
            
            <div className="space-y-2">
              <button
                onClick={() => router.push('/dictionaries')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Go to Dictionaries
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

  // Enhanced Home Page matching the HTML prototype exactly
  return (
    <div className="min-h-screen bg-gray-50 page-transition">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xl cursor-pointer">
              <span className="text-2xl">📊</span>
              DHIS2 Metadata Dictionary
            </div>
            <div className="flex items-center gap-4">
              <div className="instance-selector">
                <span>Instance:</span>
                <select 
                  value={currentInstance} 
                  onChange={(e) => {
                    setCurrentInstance(e.target.value);
                    switchInstance();
                  }}
                >
                  <option value="demo">Demo DHIS2</option>
                  <option value="production">Production</option>
                  <option value="new">+ Add New Instance</option>
                </select>
              </div>
              <button
                onClick={() => setShowLoginForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center py-16">
          <h1 className="text-6xl font-extrabold mb-6">
            <span className="gradient-text">DHIS2 Metadata Dictionary</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Centralized platform for exploring, generating, and managing metadata dictionaries across multiple DHIS2 instances
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div 
            className="feature-card card-hover"
            onClick={() => router.push('/dictionaries')}
          >
            <div className="feature-icon">
              📚
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              Explore Metadata Dictionaries
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              Browse existing dictionaries, view versions, and explore metadata from multiple DHIS2 instances
            </p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Explore Now
            </button>
          </div>
          
          <div 
            className="feature-card card-hover"
            onClick={() => setShowLoginForm(true)}
          >
            <div className="feature-icon">
              ➕
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              Generate New Dictionary
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              Create new metadata dictionaries using SQL views with versioning and period-based generation
            </p>
            <button className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">
              Create Dictionary
            </button>
          </div>
          
          <div 
            className="feature-card card-hover"
            onClick={() => setShowLoginForm(true)}
          >
            <div className="feature-icon">
              🔗
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              Manage Instances
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              Configure and connect multiple DHIS2 instances for comprehensive metadata management
            </p>
            <button className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">
              Configure
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold mb-8 text-center">System Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-600">
              <div className="text-3xl font-bold text-gray-800">12</div>
              <div className="text-sm text-gray-600">Saved Dictionaries</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-600">
              <div className="text-3xl font-bold text-gray-800">3</div>
              <div className="text-sm text-gray-600">Connected Instances</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-600">
              <div className="text-3xl font-bold text-gray-800">4,562</div>
              <div className="text-sm text-gray-600">Total Variables</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-600">
              <div className="text-3xl font-bold text-gray-800">28</div>
              <div className="text-sm text-gray-600">SQL Views</div>
            </div>
          </div>
        </div>

        {/* Enhanced Features Overview */}
        <div className="mt-16 bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <span>🚀</span>
            Enhanced Dictionary Generation Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div className="space-y-3">
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span><strong>Group-Based Filtering:</strong> Process metadata by groups to prevent timeout errors on large datasets</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span><strong>Individual Processing:</strong> Real-time processing with progress tracking and statistics</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span><strong>Processing Queue:</strong> Live visualization of items being processed with success/error tracking</span>
              </p>
            </div>
            <div className="space-y-3">
              <p className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Version Management:</strong> Track dictionary versions with change history and rollback capability</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Multi-Instance Support:</strong> Connect and manage multiple DHIS2 instances from one interface</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>SQL View Management:</strong> Create, test, and manage custom SQL views with built-in templates</span>
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-100 rounded-lg">
            <p className="text-yellow-800 text-sm flex items-start gap-2">
              <span className="text-lg">💡</span>
              <span>
                <strong>Advanced Processing:</strong> The system automatically detects large datasets and recommends 
                individual processing to prevent 504 Gateway Timeout errors. Processing statistics show real-time 
                performance metrics including items per minute, success rates, and estimated completion times.
              </span>
            </p>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => setShowLoginForm(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              Get Started - Sign In Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 