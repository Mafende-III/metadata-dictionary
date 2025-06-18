import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { DHIS2AuthCredentials } from '@/types/dhis2';

interface LoginFormProps {
  onLogin: (credentials: DHIS2AuthCredentials) => Promise<void>;
  onTestConnection: (credentials: DHIS2AuthCredentials) => Promise<boolean>;
  isLoading?: boolean;
  error?: string | null;
}

export const LoginForm = ({
  onLogin,
  onTestConnection,
  isLoading = false,
  error = null,
}: LoginFormProps) => {
  const [testConnectionStatus, setTestConnectionStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<DHIS2AuthCredentials>({
    defaultValues: {
      serverUrl: 'https://play.dhis2.org/40',
      username: '',
      password: '',
    },
  });
  
  // Test connection
  const handleTestConnection = async () => {
    setTestConnectionStatus('loading');
    
    try {
      const values = getValues();
      const isConnected = await onTestConnection(values);
      
      setTestConnectionStatus(isConnected ? 'success' : 'error');
    } catch (error) {
      setTestConnectionStatus('error');
    }
  };
  
  // Handle form submission
  const onSubmit = async (data: DHIS2AuthCredentials) => {
    await onLogin(data);
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="flex justify-center mb-6 pt-8">
        <svg className="h-12 w-12 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        DHIS2 Metadata Dictionary
      </h2>
      
      <p className="text-center text-gray-600 mb-6">
        Sign in to your DHIS2 instance to explore metadata
      </p>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-8 pb-8">
        {/* Server URL */}
        <div>
          <Input
            label="DHIS2 Server URL"
            placeholder="https://your-dhis2-instance.org"
            {...register('serverUrl', {
              required: 'Server URL is required',
              pattern: {
                value: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
                message: 'Please enter a valid URL',
              },
            })}
            error={errors.serverUrl?.message}
            icon={
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            }
            fullWidth
          />
        </div>
        
        {/* Username */}
        <div>
          <Input
            label="Username"
            placeholder="Enter your username"
            {...register('username', {
              required: 'Username is required',
            })}
            error={errors.username?.message}
            icon={
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            }
            fullWidth
          />
        </div>
        
        {/* Password */}
        <div>
          <Input
            type="password"
            label="Password"
            placeholder="Enter your password"
            {...register('password', {
              required: 'Password is required',
            })}
            error={errors.password?.message}
            icon={
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
            fullWidth
          />
        </div>
        
        {/* Test connection button */}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isLoading || testConnectionStatus === 'loading'}
            isLoading={testConnectionStatus === 'loading'}
            fullWidth
          >
            Test Connection
          </Button>
          
          {testConnectionStatus === 'success' && (
            <p className="mt-1 text-sm text-green-600">
              Connection successful! You can now sign in.
            </p>
          )}
          
          {testConnectionStatus === 'error' && (
            <p className="mt-1 text-sm text-red-600">
              Connection failed. Please check your server URL.
            </p>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 p-3 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {/* Submit button */}
        <div>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading}
            fullWidth
          >
            Sign In
          </Button>
        </div>
      </form>
    </Card>
  );
}; 