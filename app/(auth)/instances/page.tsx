'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import Alert from '@/src/components/ui/Alert';
import { InstanceService, DHIS2Instance, CreateInstanceData } from '@/lib/services/instanceService';

export default function InstancesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  
  const [instances, setInstances] = useState<DHIS2Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [newInstance, setNewInstance] = useState<CreateInstanceData>({
    name: '',
    base_url: '',
    username: '',
    password: '',
    allowSelfSignedCerts: false
  });
  
  // Handle redirect parameters
  const redirectTo = searchParams?.get('redirect');
  const redirectReason = searchParams?.get('reason');
  const isRedirectedFromGenerate = redirectTo === 'generate' && redirectReason === 'no-instances';

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await InstanceService.getInstances();
      setInstances(data);
    } catch (err) {
      console.error('Error loading instances:', err);
      setError('Failed to load instances. Please try again.');
      setInstances([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <span className="badge badge-success">Connected</span>;
      case 'disconnected':
        return <span className="badge badge-warning">Disconnected</span>;
      case 'error':
        return <span className="badge badge-danger">Error</span>;
      default:
        return <span className="badge badge-primary">{status}</span>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'border-green-500';
      case 'disconnected':
        return 'border-yellow-500';
      case 'error':
        return 'border-red-500';
      default:
        return 'border-gray-300';
    }
  };

  const handleTestConnection = async (instanceId: string) => {
    try {
      setTesting(true);
      await InstanceService.syncMetadata(instanceId);
      await loadInstances(); // Refresh list to show updated status
      alert('Connection test completed successfully!');
    } catch (err) {
      alert('Connection test failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  const handleConfigure = (instanceId: string) => {
    alert(`Configure instance ${instanceId} - This would open a configuration modal`);
  };

  const handleSyncMetadata = async (instanceId: string) => {
    try {
      setTesting(true);
      await InstanceService.syncMetadata(instanceId);
      await loadInstances();
      alert('Metadata sync completed successfully!');
    } catch (err) {
      alert('Metadata sync failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  const handleReconnect = async (instanceId: string) => {
    try {
      await InstanceService.updateInstanceStatus(instanceId, 'connected');
      await loadInstances();
    } catch (err) {
      alert('Failed to reconnect: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleRemove = async (instanceId: string) => {
    if (confirm('Are you sure you want to remove this instance? This will also delete all associated dictionaries.')) {
      try {
        await InstanceService.deleteInstance(instanceId);
        await loadInstances();
        alert('Instance removed successfully!');
      } catch (err) {
        alert('Failed to remove instance: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }
  };

  const handleAddInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newInstance.name || !newInstance.base_url || !newInstance.username || !newInstance.password) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setTesting(true);
      await InstanceService.createInstance(newInstance);
      await loadInstances();
      setShowAddModal(false);
      setNewInstance({ name: '', base_url: '', username: '', password: '', allowSelfSignedCerts: false });
      
      // Show success message and redirect if came from generate page
      if (isRedirectedFromGenerate) {
        alert('Instance added successfully! Redirecting back to dictionary generation...');
        setTimeout(() => {
          router.push('/generate');
        }, 1000);
      } else {
        alert('Instance added successfully!');
      }
    } catch (err) {
      alert('Failed to add instance: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="warning">
          Please sign in to manage DHIS2 instances.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 page-transition">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DHIS2 Instances</h1>
            <p className="text-gray-600 mt-2">
              Manage your DHIS2 instance connections and monitor their status
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            ➕ Add New Instance
          </Button>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-4 border-l-4 border-blue-600">
            <div className="text-2xl font-bold text-gray-800">{instances.length}</div>
            <div className="text-sm text-gray-600">Total Instances</div>
          </Card>
          <Card className="p-4 border-l-4 border-green-600">
            <div className="text-2xl font-bold text-gray-800">
              {instances.filter(i => i.status === 'connected').length}
            </div>
            <div className="text-sm text-gray-600">Connected</div>
          </Card>
          <Card className="p-4 border-l-4 border-orange-600">
            <div className="text-2xl font-bold text-gray-800">
              {instances.reduce((sum, i) => sum + i.sql_views_count, 0)}
            </div>
            <div className="text-sm text-gray-600">Total SQL Views</div>
          </Card>
          <Card className="p-4 border-l-4 border-purple-600">
            <div className="text-2xl font-bold text-gray-800">
              {instances.reduce((sum, i) => sum + i.dictionaries_count, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Dictionaries</div>
          </Card>
        </div>
      </div>

      {/* Redirect Context Alert */}
      {isRedirectedFromGenerate && (
        <Alert variant="info" className="mb-6">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 text-xl">🔄</span>
            <div>
              <strong>Instance Required for Dictionary Generation</strong>
              <p className="text-sm mt-1">
                You were redirected here because no connected DHIS2 instances were found. 
                Please add and connect an instance to continue generating your metadata dictionary.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="error" className="mb-6">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadInstances}>
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading instances...</p>
        </div>
      ) : instances.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-gray-400 text-6xl mb-6">🏥</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {isRedirectedFromGenerate ? 'Instance Required' : 'No Instances Configured'}
            </h3>
            
            {isRedirectedFromGenerate ? (
              <div className="space-y-4">
                <p className="text-gray-600 text-lg mb-6">
                  To generate metadata dictionaries, you need to connect to a DHIS2 instance first.
                </p>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
                  <h4 className="font-semibold text-orange-900 mb-2">🔗 Quick Setup</h4>
                  <ol className="text-left text-sm text-orange-800 space-y-1">
                    <li>1. Click "Add Your First Instance" below</li>
                    <li>2. Enter your DHIS2 instance details</li>
                    <li>3. Test the connection (version auto-detected)</li>
                    <li>4. Return to dictionary generation</li>
                  </ol>
                </div>
                
                <Button 
                  onClick={() => setShowAddModal(true)} 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 text-lg font-semibold rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105"
                >
                  🚀 Add Your First Instance
                </Button>
                
                <div className="mt-4 text-sm text-gray-500">
                  After adding an instance, you'll be redirected back to continue generating your dictionary.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-500 mb-4">
                  Add your first DHIS2 instance to start generating metadata dictionaries
                </p>
                <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  ➕ Add Your First Instance
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Instance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {instances.map((instance) => (
              <Card key={instance.id} className={`p-6 border-l-4 ${getStatusColor(instance.status)}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{instance.name}</h3>
                  {getStatusBadge(instance.status)}
                </div>
                
                <p className="text-gray-600 mb-4 break-all">{instance.base_url}</p>
                
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <strong>Version:</strong> {instance.version || 'Unknown'}
                  </div>
                  <div>
                    <strong>SQL Views:</strong> {instance.sql_views_count}
                  </div>
                  <div>
                    <strong>Dictionaries:</strong> {instance.dictionaries_count}
                  </div>
                  <div>
                    <strong>Last Sync:</strong> {new Date(instance.last_sync).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleTestConnection(instance.id)}
                    disabled={testing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {testing ? '⏳' : '🔄'} Test
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSyncMetadata(instance.id)}
                    disabled={testing}
                  >
                    Sync
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConfigure(instance.id)}
                  >
                    Config
                  </Button>
                  
                  {instance.status === 'disconnected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReconnect(instance.id)}
                    >
                      Reconnect
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemove(instance.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Connection Help */}
          <Card className="p-6 bg-blue-50 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span>💡</span>
              Instance Management Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div className="space-y-2">
                <p>• <strong>Test Connection:</strong> Verify instance is reachable and credentials are valid</p>
                <p>• <strong>Sync Metadata:</strong> Update SQL views and other metadata from the instance</p>
                <p>• <strong>Configure:</strong> Adjust instance-specific settings and preferences</p>
              </div>
              <div className="space-y-2">
                <p>• <strong>Status Indicators:</strong> Green=Connected, Yellow=Disconnected, Red=Error</p>
                <p>• <strong>Regular Sync:</strong> Keep metadata up-to-date with periodic synchronization</p>
                <p>• <strong>Backup Credentials:</strong> Store instance credentials securely</p>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Add Instance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New DHIS2 Instance</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddInstance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instance Name
                </label>
                <input
                  type="text"
                  value={newInstance.name}
                  onChange={(e) => setNewInstance(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Regional HMIS"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DHIS2 URL
                </label>
                <input
                  type="url"
                  value={newInstance.base_url}
                  onChange={(e) => setNewInstance(prev => ({ ...prev, base_url: e.target.value }))}
                  placeholder="https://your-instance.dhis2.org/api"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newInstance.username}
                  onChange={(e) => setNewInstance(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newInstance.password}
                  onChange={(e) => setNewInstance(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="allowSelfSignedCerts"
                    checked={newInstance.allowSelfSignedCerts || false}
                    onChange={(e) => setNewInstance(prev => ({ ...prev, allowSelfSignedCerts: e.target.checked }))}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="allowSelfSignedCerts" className="text-sm font-medium text-yellow-800">
                      Allow self-signed certificates
                    </label>
                    <p className="text-xs text-yellow-700 mt-1">
                      Enable this for internal DHIS2 instances with self-signed SSL certificates. 
                      Only use this for trusted internal instances.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={testing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {testing ? '⏳ Testing...' : 'Add Instance'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={testing}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 