'use client';

import { useState, useEffect } from 'react';
import { useAdminSqlViewStore } from '@/lib/stores/adminSqlViewStore';
import { SqlViewTemplate, SqlViewField } from '@/types/sqlView';

interface Props {
  template: SqlViewTemplate | null;
  onClose: () => void;
}

export default function SqlViewTemplateEditor({ template, onClose }: Props) {
  const { addTemplate, updateTemplate } = useAdminSqlViewStore();
  const [formData, setFormData] = useState<Partial<SqlViewTemplate>>({
    name: '',
    description: '',
    category: 'custom',
    sqlQuery: '',
    dhisVersions: ['2.40'],
    requiredTables: [],
    outputFields: [],
    isActive: true
  });

  const [newTable, setNewTable] = useState('');
  const [newField, setNewField] = useState<Partial<SqlViewField>>({
    name: '',
    column: '',
    type: 'string'
  });

  useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.sqlQuery) {
      alert('Name and SQL Query are required');
      return;
    }

    const templateData = {
      ...formData,
      createdBy: 'user'
    } as Omit<SqlViewTemplate, 'id' | 'createdAt' | 'updatedAt'>;

    if (template) {
      updateTemplate(template.id, templateData);
    } else {
      addTemplate(templateData);
    }
    
    onClose();
  };

  const addTable = () => {
    if (newTable && !formData.requiredTables?.includes(newTable)) {
      setFormData(prev => ({
        ...prev,
        requiredTables: [...(prev.requiredTables || []), newTable]
      }));
      setNewTable('');
    }
  };

  const removeTable = (table: string) => {
    setFormData(prev => ({
      ...prev,
      requiredTables: prev.requiredTables?.filter(t => t !== table) || []
    }));
  };

  const addField = () => {
    if (newField.name && newField.column) {
      setFormData(prev => ({
        ...prev,
        outputFields: [...(prev.outputFields || []), newField as SqlViewField]
      }));
      setNewField({ name: '', column: '', type: 'string' });
    }
  };

  const removeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      outputFields: prev.outputFields?.filter((_, i) => i !== index) || []
    }));
  };

  const toggleVersion = (version: string) => {
    setFormData(prev => ({
      ...prev,
      dhisVersions: prev.dhisVersions?.includes(version)
        ? prev.dhisVersions.filter(v => v !== version)
        : [...(prev.dhisVersions || []), version]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="data_elements">Data Elements</option>
                <option value="indicators">Indicators</option>
                <option value="categories">Categories</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          {/* DHIS2 Versions */}
          <div>
            <label className="block text-sm font-medium mb-2">Compatible DHIS2 Versions</label>
            <div className="flex gap-2">
              {['2.40', '2.41', '2.42'].map(version => (
                <label key={version} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.dhisVersions?.includes(version)}
                    onChange={() => toggleVersion(version)}
                    className="mr-2"
                  />
                  {version}
                </label>
              ))}
            </div>
          </div>

          {/* Required Tables */}
          <div>
            <label className="block text-sm font-medium mb-2">Required Database Tables</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTable}
                onChange={(e) => setNewTable(e.target.value)}
                placeholder="Table name"
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                type="button"
                onClick={addTable}
                className="bg-blue-500 text-white px-3 py-2 rounded"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.requiredTables?.map(table => (
                <span
                  key={table}
                  className="bg-gray-100 px-2 py-1 rounded text-sm flex items-center gap-1"
                >
                  {table}
                  <button
                    type="button"
                    onClick={() => removeTable(table)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Output Fields */}
          <div>
            <label className="block text-sm font-medium mb-2">Output Fields</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <input
                type="text"
                value={newField.name}
                onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Display name"
                className="border rounded px-3 py-2"
              />
              <input
                type="text"
                value={newField.column}
                onChange={(e) => setNewField(prev => ({ ...prev, column: e.target.value }))}
                placeholder="Column name"
                className="border rounded px-3 py-2"
              />
              <select
                value={newField.type}
                onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value as any }))}
                className="border rounded px-3 py-2"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
              </select>
              <button
                type="button"
                onClick={addField}
                className="bg-blue-500 text-white px-3 py-2 rounded"
              >
                Add Field
              </button>
            </div>
            <div className="space-y-2">
              {formData.outputFields?.map((field, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <div className="text-sm">
                    <span className="font-medium">{field.name}</span>
                    <span className="text-gray-600 ml-2">({field.column}, {field.type})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SQL Query */}
          <div>
            <label className="block text-sm font-medium mb-2">SQL Query *</label>
            <textarea
              value={formData.sqlQuery}
              onChange={(e) => setFormData(prev => ({ ...prev, sqlQuery: e.target.value }))}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              rows={15}
              placeholder="SELECT ..."
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {template ? 'Update' : 'Create'} Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 