import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SqlViewTemplate } from '../../types/sqlView';

interface AdminSqlViewStore {
  templates: SqlViewTemplate[];
  addTemplate: (template: Omit<SqlViewTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<SqlViewTemplate>) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => SqlViewTemplate | undefined;
  getTemplatesByCategory: (category: string) => SqlViewTemplate[];
  duplicateTemplate: (id: string) => void;
}

export const useAdminSqlViewStore = create<AdminSqlViewStore>()(
  persist(
    (set, get) => ({
      templates: [
        {
          id: 'active_data_elements',
          name: 'Active Data Elements Summary',
          description: 'Summary of active aggregate data elements with core metadata',
          category: 'data_elements',
          dhisVersions: ['2.40', '2.41', '2.42'],
          requiredTables: ['dataelement', 'dataelementattributevalues', 'attributevalue'],
          sqlQuery: `SELECT 
  de.uid AS data_element_id,
  de.name AS data_element_name,
  de.valuetype AS value_type,
  de.domaintype AS domain_type,
  de.aggregationtype AS aggregation_type,
  de.zeroissignificant AS zero_significant,
  de.lastupdated::DATE AS last_updated,
  COALESCE(active_attr.value, 'true') AS is_active,
  replace_attr.value AS replacing_variable_uid
FROM dataelement de
LEFT JOIN dataelementattributevalues deav_active 
  ON de.dataelementid = deav_active.dataelementid
WHERE de.domaintype = 'AGGREGATE'
ORDER BY de.name;`,
          outputFields: [
            { name: 'Data Element ID', column: 'data_element_id', type: 'string' },
            { name: 'Name', column: 'data_element_name', type: 'string' },
            { name: 'Value Type', column: 'value_type', type: 'string' },
            { name: 'Domain Type', column: 'domain_type', type: 'string' },
            { name: 'Aggregation Type', column: 'aggregation_type', type: 'string' },
            { name: 'Zero Significant', column: 'zero_significant', type: 'boolean' },
            { name: 'Last Updated', column: 'last_updated', type: 'date' },
            { name: 'Is Active', column: 'is_active', type: 'boolean' },
            { name: 'Replacing Variable UID', column: 'replacing_variable_uid', type: 'string' }
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system',
          isActive: true
        },
        {
          id: 'data_element_usage_timeline',
          name: 'Data Element Usage Timeline',
          description: 'Timeline analysis showing when data elements were created and first/last used with data values',
          category: 'data_elements',
          dhisVersions: ['2.40', '2.41', '2.42'],
          requiredTables: ['dataelement', 'datavalue', 'period'],
          sqlQuery: `SELECT 
    de.name AS data_element_name,
    de.created AS opening_date,
    MIN(p.startdate) AS first_period_start,
    MAX(p.enddate) AS last_period_end,
    MIN(dv.created) AS first_data_recorded,
    MAX(dv.lastupdated) AS last_data_updated
FROM 
    dataelement de
LEFT JOIN 
    datavalue dv ON de.dataelementid = dv.dataelementid
LEFT JOIN 
    period p ON dv.periodid = p.periodid
GROUP BY 
    de.dataelementid, de.name, de.created
ORDER BY 
    de.name;`,
          outputFields: [
            { name: 'Data Element Name', column: 'data_element_name', type: 'string', description: 'Name of the data element' },
            { name: 'Opening Date', column: 'opening_date', type: 'date', description: 'When the data element was created' },
            { name: 'First Period Start', column: 'first_period_start', type: 'date', description: 'Start date of first period with data' },
            { name: 'Last Period End', column: 'last_period_end', type: 'date', description: 'End date of last period with data' },
            { name: 'First Data Recorded', column: 'first_data_recorded', type: 'date', description: 'When first data value was recorded' },
            { name: 'Last Data Updated', column: 'last_data_updated', type: 'date', description: 'When data was last updated' }
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system',
          isActive: true
        }
      ],
      
      addTemplate: (templateData) => {
        const newTemplate: SqlViewTemplate = {
          ...templateData,
          id: `template_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          templates: [...state.templates, newTemplate]
        }));
      },
      
      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map(t => 
            t.id === id 
              ? { ...t, ...updates, updatedAt: new Date() }
              : t
          )
        }));
      },
      
      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter(t => t.id !== id)
        }));
      },
      
      getTemplate: (id) => {
        return get().templates.find(t => t.id === id);
      },
      
      getTemplatesByCategory: (category) => {
        return get().templates.filter(t => t.category === category && t.isActive);
      },
      
      duplicateTemplate: (id) => {
        const template = get().getTemplate(id);
        if (template) {
          get().addTemplate({
            ...template,
            name: `${template.name} (Copy)`,
            createdBy: 'user'
          });
        }
      }
    }),
    {
      name: 'admin-sql-view-templates',
    }
  )
); 