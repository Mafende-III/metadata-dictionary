'use client';

import CredentialSetup from '../../components/auth/CredentialSetup';

export default function AuthPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">DHIS2 Connection Setup</h1>
        <p className="text-gray-600 mt-2">
          Configure your DHIS2 instance connection details
        </p>
      </div>
      
      <div className="max-w-md mx-auto">
        <CredentialSetup />
      </div>
    </div>
  );
} 