'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';

export default function CredentialSetup() {
  const { setCredentials, isAuthenticated, dhisBaseUrl, clearCredentials } = useAuthStore();
  const [formData, setFormData] = useState({
    baseUrl: dhisBaseUrl || 'https://your-dhis2-instance.org',
    username: '',
    password: '',
    allowSelfSignedCerts: false,
    authType: 'basic' as 'basic' | 'token'
  });
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details: string[] } | null>(null);
  const [showCertificateOptions, setShowCertificateOptions] = useState(false);

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
    
    // If URL already has a protocol, don't change it
    if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
      return normalizedUrl;
    }
    
    // For URLs without protocol, try to be smart about it
    // Check if it's a local/private IP (likely HTTP)
    const isLocalIp = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|localhost)/i.test(normalizedUrl);
    const hasPort = /:\d+/.test(normalizedUrl);
    
    if (isLocalIp || hasPort) {
      // Local IPs and URLs with ports are often HTTP in development
      console.log(`🌐 Detected local/development instance, defaulting to HTTP: ${normalizedUrl}`);
      normalizedUrl = `http://${normalizedUrl}`;
    } else {
      // Public domains default to HTTPS
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
          password: formData.password,
          allowSelfSignedCerts: formData.allowSelfSignedCerts
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
        // Handle certificate issues in the main form
        if (result.certificateIssue) {
          setShowCertificateOptions(true);
        }
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

  const testConnection = async (bypassCertificates = false) => {
    if (!formData.baseUrl) {
      setError('Please enter a server URL first');
      return;
    }

    setTesting(true);
    setError('');
    setTestResult(null);

    try {
      console.log('🔍 Testing connection to:', formData.baseUrl);
      
      // Check if this is an HTTP instance
      const isHttpInstance = formData.baseUrl.toLowerCase().startsWith('http://');
      const isBrowser = typeof window !== 'undefined';
      const isHttpsPage = isBrowser && window.location.protocol === 'https:';
      
      if (isHttpInstance && isHttpsPage) {
        console.log('🌐 HTTP instance detected from HTTPS page - using server-side proxy to bypass mixed content policy');
      }

      const response = await fetch('/api/dhis2/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverUrl: formData.baseUrl,
          username: formData.username || undefined,
          password: formData.password || undefined,
          allowSelfSignedCerts: bypassCertificates || formData.allowSelfSignedCerts,
        }),
      });

      const result = await response.json();

      if (result.connected) {
        const securityNote = result.securityNote ? [result.securityNote] : [];
        
        setTestResult({
          success: true,
          message: `✅ Connected successfully!${isHttpInstance ? ' (via secure proxy)' : ''}${bypassCertificates ? ' (certificate verification disabled)' : ''}`,
          details: [
            `Instance: ${result.name || 'DHIS2'}`,
            `Version: ${result.version || 'Unknown'}`,
            ...(isHttpInstance ? ['🔒 HTTP instance accessed via HTTPS proxy'] : []),
            ...(result.serverInfo?.serverDate ? [`Server Date: ${new Date(result.serverInfo.serverDate).toLocaleString()}`] : []),
            ...securityNote
          ]
        });
        
        // If we bypassed certificates and it worked, update the form
        if (bypassCertificates) {
          setFormData(prev => ({ ...prev, allowSelfSignedCerts: true }));
        }
      } else {
        // Enhanced error handling for common issues
        let errorMessage = result.error || 'Connection failed';
        let helpfulTips: string[] = result.suggestions || [];

        // Handle certificate-specific errors
        if (result.certificateIssue) {
          setShowCertificateOptions(true);
          
          if (result.canBypassCertificate) {
            helpfulTips = [
              ...helpfulTips,
              '🔓 You can try bypassing certificate verification for internal instances',
              '⚠️ Only do this for trusted internal DHIS2 instances'
            ];
          }
        } else {
          // Existing error handling for other issues
          if (errorMessage.includes('Mixed Content') || (isHttpInstance && isHttpsPage)) {
            helpfulTips = [
              '💡 Tip: The system automatically uses a secure proxy for HTTP instances',
              '🔧 If this persists, check if your DHIS2 instance is running',
              '🌐 Try using your local IP address instead of localhost'
            ];
          } else if (errorMessage.includes('Network Error') || errorMessage.includes('ECONNREFUSED')) {
            helpfulTips = [
              '🔍 Check if DHIS2 instance is running',
              '🌐 Verify the URL and port are correct',
              '🔥 Check firewall settings',
              `💡 For local instances, try: http://${getLocalIpSuggestion()}:8080`
            ];
          } else if (errorMessage.includes('401') || errorMessage.includes('Authentication')) {
            helpfulTips = [
              '🔐 Check username and password',
              '👤 Ensure user account is active',
              '🔑 Verify API access permissions'
            ];
          } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
            helpfulTips = [
              '🔍 Check if URL includes /api path',
              '📋 Example: http://your-server:8080/api',
              '🆔 Verify DHIS2 version is 2.30+'
            ];
          }
        }

        setTestResult({
          success: false,
          message: `❌ ${errorMessage}`,
          details: helpfulTips
        });
      }
    } catch (err: any) {
      console.error('Connection test error:', err);
      
      setTestResult({
        success: false,
        message: '❌ Connection test failed',
        details: [
          err.message || 'Unknown error occurred',
          '🔍 Check console for detailed error information',
          '💡 Ensure DHIS2 instance is accessible from this server'
        ]
      });
    } finally {
      setTesting(false);
    }
  };

  // Helper function to suggest local IP
  const getLocalIpSuggestion = () => {
    // Common local IP ranges
    const suggestions = [
      '192.168.1.100', 
      '192.168.0.100', 
      '10.0.0.100'
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
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
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500">
              Examples: https://play.dhis2.org/demo or http://192.168.1.100:8080
            </p>
            
            {/* HTTP Instance Detection */}
            {formData.baseUrl.toLowerCase().startsWith('http://') && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <p className="text-xs text-blue-700">
                  🌐 <strong>HTTP Instance Detected:</strong> The system will automatically use a secure server-side proxy to connect to your HTTP instance, bypassing browser security restrictions.
                </p>
              </div>
            )}
            
            {/* HTTPS but potentially HTTP-only instance warning */}
            {formData.baseUrl.toLowerCase().startsWith('https://') && 
             (formData.baseUrl.includes('197.243.28.37') || 
              /^https:\/\/\d+\.\d+\.\d+\.\d+/.test(formData.baseUrl.toLowerCase())) && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2">
                <p className="text-xs text-amber-700">
                  ⚠️ <strong>IP Address with HTTPS:</strong> If this instance shows "Not Secure" in your browser, it's likely HTTP-only. 
                  Try changing the URL to start with <code className="bg-amber-100 px-1 rounded">http://</code> instead.
                </p>
              </div>
            )}
            
            {/* General guidance for HMIS instances */}
            {formData.baseUrl.toLowerCase().includes('197.243.28.37') && (
              <div className="bg-orange-50 border border-orange-200 rounded p-2">
                <p className="text-xs text-orange-700">
                  💡 <strong>Detected your HMIS instance:</strong> If you're getting certificate errors, this instance might be HTTP-only. Try: 
                  <code className="bg-orange-100 px-1 rounded ml-1">http://197.243.28.37/hmis</code>
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, baseUrl: 'http://197.243.28.37/hmis' }))}
                    className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded hover:bg-orange-200"
                  >
                    Use HTTP URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, allowSelfSignedCerts: true }))}
                    className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200"
                  >
                    Enable Certificate Bypass
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Authentication Type Toggle */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <label className="block text-sm font-medium mb-2">Authentication Method</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="authType"
                value="basic"
                checked={formData.authType === 'basic'}
                onChange={(e) => setFormData(prev => ({ ...prev, authType: 'basic' }))}
                className="mr-2"
              />
              Username & Password
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="authType"
                value="token"
                checked={formData.authType === 'token'}
                onChange={(e) => setFormData(prev => ({ ...prev, authType: 'token' }))}
                className="mr-2"
              />
              Personal Access Token
            </label>
          </div>
        </div>

        {formData.authType === 'basic' ? (
          <>
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
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                placeholder="Your DHIS2 username"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Personal Access Token</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                placeholder="d2pat_..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your DHIS2 Personal Access Token (starts with "d2pat_")
              </p>
            </div>
          </>
        )}

        {/* Test Connection Button */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => testConnection(false)}
            disabled={testing || !formData.baseUrl}
            className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600 disabled:bg-gray-300"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          
          <button
            type="submit"
            disabled={testing}
            className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {testing ? 'Testing Connection...' : 'Save & Test Credentials'}
          </button>
        </div>

        {/* Certificate Options (shown when certificate issues detected) */}
        {showCertificateOptions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              🔒 SSL Certificate Options
            </h4>
            <p className="text-xs text-yellow-700 mb-3">
              This instance appears to use a self-signed or untrusted SSL certificate. 
              For trusted internal instances, you can bypass certificate verification.
            </p>
            
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="allowSelfSignedCerts"
                checked={formData.allowSelfSignedCerts}
                onChange={(e) => setFormData(prev => ({ ...prev, allowSelfSignedCerts: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="allowSelfSignedCerts" className="text-xs text-yellow-700">
                Allow self-signed certificates (for internal instances only)
              </label>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => testConnection(true)}
                disabled={testing}
                className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 disabled:bg-gray-300"
              >
                {testing ? 'Testing...' : 'Test with Certificate Bypass'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowCertificateOptions(false)}
                className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
            
            <p className="text-xs text-yellow-600 mt-2">
              ⚠️ <strong>Security Warning:</strong> Only bypass certificate verification for internal instances you trust.
            </p>
          </div>
        )}

        {/* Test Results Display */}
        {testResult && (
          <div className={`border rounded p-3 ${
            testResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              testResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResult.message}
            </p>
            
            {testResult.details && testResult.details.length > 0 && (
              <ul className={`text-xs mt-2 space-y-1 ${
                testResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.details.map((detail, index) => (
                  <li key={index}>• {detail}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* HTTP Instance Help */}
        {formData.baseUrl.toLowerCase().startsWith('http://') && (
          <div className="bg-orange-50 border border-orange-200 rounded p-3">
            <h4 className="text-sm font-medium text-orange-800 mb-2">
              💡 Local Development Tips
            </h4>
            <ul className="text-xs text-orange-700 space-y-1">
              <li>• Use your local IP address for network access (e.g., http://192.168.1.100:8080)</li>
              <li>• Ensure DHIS2 is running and accessible</li>
              <li>• Check firewall settings if connection fails</li>
              <li>• The proxy automatically handles HTTP instances securely</li>
            </ul>
          </div>
        )}
      </form>
    </div>
  );
} 