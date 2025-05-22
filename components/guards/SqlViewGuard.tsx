'use client';

import { useEffect, useState } from 'react';
import { useSqlViewStore } from '@/lib/stores/sqlViewStore';
import { useAdminSqlViewStore } from '@/lib/stores/adminSqlViewStore';
import Link from 'next/link';

interface Props {
  children: React.ReactNode;
  requiredTemplates?: string[];
}

export default function SqlViewGuard({ children, requiredTemplates = [] }: Props) {
  const { configuredViews, mappedViews } = useSqlViewStore();
  const { templates } = useAdminSqlViewStore();
  
  const [missingTemplates, setMissingTemplates] = useState<string[]>([]);

  useEffect(() => {
    const allConfigured = { ...configuredViews, ...mappedViews };
    const missing = requiredTemplates.filter(templateId => !allConfigured[templateId]);
    setMissingTemplates(missing);
  }, [configuredViews, mappedViews, requiredTemplates]);

  if (missingTemplates.length > 0) {
    const missingNames = missingTemplates.map(id => 
      templates.find(t => t.id === id)?.name || id
    );

    return (
      <div className="container mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-3">
            SQL Views Required
          </h2>
          <p className="text-yellow-800 mb-4">
            This page requires the following SQL views to be configured:
          </p>
          <ul className="list-disc list-inside text-yellow-800 mb-4 space-y-1">
            {missingNames.map(name => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <Link
            href="/setup/sql-views"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Configure SQL Views
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 