import { SqlViewService } from './sqlViewService';
import { useSqlViewStore } from '@/lib/stores/sqlViewStore';
import { useAdminSqlViewStore } from '@/lib/stores/adminSqlViewStore';

export class MetadataService {
  private sqlViewService: SqlViewService;
  private sqlViewStore = useSqlViewStore.getState();
  private templateStore = useAdminSqlViewStore.getState();

  constructor(baseUrl: string, auth: string) {
    this.sqlViewService = new SqlViewService(baseUrl, auth);
  }

  private async executeTemplate(templateId: string): Promise<any> {
    const viewUid = this.sqlViewStore.getViewUid(templateId);
    const mapping = this.sqlViewStore.getViewMapping(templateId);
    
    if (!viewUid) {
      throw new Error(`SQL View not configured for template: ${templateId}`);
    }

    const rawData = await this.sqlViewService.executeView(viewUid);
    
    // If there's a mapping, transform the data
    if (mapping) {
      return this.transformMappedData(rawData, mapping, templateId);
    }
    
    // Otherwise, use direct template field mapping
    return this.transformDirectData(rawData, templateId);
  }

  private transformMappedData(rawData: any, mapping: any, templateId: string): any[] {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) return rawData.rows;

    return rawData.rows.map((row: any[]) => {
      const transformed: any = {};
      
      template.outputFields.forEach(field => {
        const mappedColumn = mapping.fieldMappings[field.column];
        if (mappedColumn) {
          const columnIndex = rawData.headers.findIndex((h: any) => h.column === mappedColumn);
          if (columnIndex >= 0) {
            transformed[field.column] = this.convertFieldValue(row[columnIndex], field.type);
          }
        }
      });
      
      return transformed;
    });
  }

  private transformDirectData(rawData: any, templateId: string): any[] {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) return rawData.rows;

    return rawData.rows.map((row: any[]) => {
      const transformed: any = {};
      
      template.outputFields.forEach((field, index) => {
        if (index < row.length) {
          transformed[field.column] = this.convertFieldValue(row[index], field.type);
        }
      });
      
      return transformed;
    });
  }

  private convertFieldValue(value: any, type: string): any {
    switch (type) {
      case 'number':
        return value ? Number(value) : null;
      case 'boolean':
        return Boolean(value);
      case 'date':
        return value ? new Date(value) : null;
      default:
        return value;
    }
  }

  // Public methods for different metadata types
  async getActiveDataElements() {
    return this.executeTemplate('active_data_elements');
  }

  async getDataElementCompleteness() {
    return this.executeTemplate('data_element_completeness');
  }

  async getIndicators() {
    return this.executeTemplate('indicators_summary');
  }

  async getCustomMetadata(templateId: string) {
    return this.executeTemplate(templateId);
  }

  // Export functionality
  async exportToCSV(templateId: string): Promise<string> {
    const data = await this.executeTemplate(templateId);
    const template = this.templateStore.getTemplate(templateId);
    
    if (!template || !data.length) return '';

    const headers = template.outputFields.map(f => f.name).join(',');
    const rows = data.map(row => 
      template.outputFields.map(field => row[field.column] || '').join(',')
    ).join('\n');

    return `${headers}\n${rows}`;
  }

  async exportToJSON(templateId: string): Promise<any> {
    const data = await this.executeTemplate(templateId);
    const template = this.templateStore.getTemplate(templateId);
    
    return {
      template: {
        id: template?.id,
        name: template?.name,
        description: template?.description
      },
      exportedAt: new Date().toISOString(),
      data
    };
  }
} 