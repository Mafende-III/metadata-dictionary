'use client';

import { useState } from 'react';
import { useAdminSqlViewStore } from '@/lib/stores/adminSqlViewStore';
import { SqlViewTemplate } from '@/types/sqlView';
import SqlViewTemplateEditor from './SqlViewTemplateEditor';

export default function SqlViewTemplateManager() {
  const { templates, deleteTemplate, duplicateTemplate } = useAdminSqlViewStore();
  const [editingTemplate, setEditingTemplate] = useState<SqlViewTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'data_elements', 'indicators', 'categories', 'custom'];
  
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const handleEdit = (template: SqlViewTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">SQL View Templates</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Create Template
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded capitalize ${
              selectedCategory === category
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates List */}
      <div className="grid gap-4">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-semibold">{template.name}</h3>
                <p className="text-gray-600 text-sm">{template.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => duplicateTemplate(template.id)}
                  className="text-green-500 hover:text-green-700"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
            
            <div className="flex gap-4 text-sm text-gray-500">
              <span>Category: {template.category}</span>
              <span>DHIS2: {template.dhisVersions.join(', ')}</span>
              <span>Fields: {template.outputFields.length}</span>
            </div>
            
            <div className="mt-2">
              <details className="cursor-pointer">
                <summary className="text-sm font-medium">View SQL Query</summary>
                <pre className="bg-gray-100 p-2 rounded text-xs mt-2 overflow-x-auto">
                  {template.sqlQuery}
                </pre>
              </details>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <SqlViewTemplateEditor
          template={editingTemplate}
          onClose={handleEditorClose}
        />
      )}
    </div>
  );
} 