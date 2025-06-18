'use client';

import { useSqlViewStore } from '@/lib/stores/sqlViewStore';
import { useAdminSqlViewStore } from '@/lib/stores/adminSqlViewStore';

interface Props {
  category?: string;
  onViewSelect: (templateId: string) => void;
  selectedView?: string;
}

export default function SqlViewSelector({ category, onViewSelect, selectedView }: Props) {
  const { templates } = useAdminSqlViewStore();
  const { isViewConfigured } = useSqlViewStore();

  const availableTemplates = templates.filter(template => 
    template.isActive && 
    (!category || template.category === category) &&
    isViewConfigured(template.id)
  );

  if (availableTemplates.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">No SQL Views Configured</h3>
        <p className="text-yellow-800 text-sm mb-3">
          {category 
            ? `No SQL views configured for category: ${category}`
            : 'No SQL views have been configured yet.'
          }
        </p>
        <a 
          href="/setup/sql-views" 
          className="bg-yellow-500 text-white px-3 py-2 rounded text-sm hover:bg-yellow-600"
        >
          Configure SQL Views
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Available Views</h3>
      <div className="grid gap-3">
        {availableTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => onViewSelect(template.id)}
            className={`text-left p-3 border rounded-lg hover:bg-gray-50 ${
              selectedView === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="font-medium">{template.name}</div>
            <div className="text-sm text-gray-600 mt-1">{template.description}</div>
            <div className="flex gap-2 mt-2">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {template.outputFields.length} fields
              </span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                ✓ Configured
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
} 