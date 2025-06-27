import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { preview_id, raw_data, headers } = body;

    if (!preview_id || !raw_data) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: preview_id and raw_data'
      }, { status: 400 });
    }

    console.log(`🔄 Converting JSON to table for preview: ${preview_id}`);

    // Detect columns from the data
    const detectColumns = (data: any[]): string[] => {
      if (!data || data.length === 0) return [];
      
      const allKeys = new Set<string>();
      
      // Sample first 10 rows to detect all possible columns
      data.slice(0, 10).forEach(item => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(key => allKeys.add(key));
        }
      });
      
      return Array.from(allKeys).sort();
    };

    // Clean and structure the data
    const structureData = (data: any[], detectedColumns: string[]) => {
      return data.map(item => {
        const structuredItem: any = {};
        
        detectedColumns.forEach(column => {
          const value = item[column];
          
          // Clean up the value
          if (value === null || value === undefined) {
            structuredItem[column] = '';
          } else if (typeof value === 'string') {
            structuredItem[column] = value.trim();
          } else if (typeof value === 'object') {
            structuredItem[column] = JSON.stringify(value);
          } else {
            structuredItem[column] = String(value);
          }
        });
        
        return structuredItem;
      });
    };

    // Generate column metadata
    const generateColumnMetadata = (data: any[], columns: string[]) => {
      const metadata: any = {};
      
      columns.forEach(column => {
        const values = data.map(item => item[column]).filter(v => v !== null && v !== undefined && v !== '');
        const sampleValues = values.slice(0, 10);
        
        // Detect data type
        let dataType = 'text';
        if (values.every(v => !isNaN(Number(v)) && v !== '')) {
          dataType = 'number';
        } else if (values.every(v => {
          const date = new Date(v);
          return !isNaN(date.getTime()) && v.toString().match(/\d{4}-\d{2}-\d{2}/);
        })) {
          dataType = 'date';
        } else if (values.every(v => typeof v === 'boolean' || v === 'true' || v === 'false')) {
          dataType = 'boolean';
        }
        
        metadata[column] = {
          dataType,
          nonEmptyCount: values.length,
          totalCount: data.length,
          completeness: Math.round((values.length / data.length) * 100),
          sampleValues: sampleValues.slice(0, 3),
          uniqueValues: [...new Set(values)].length
        };
      });
      
      return metadata;
    };

    // Process the data
    const detectedColumns = headers && headers.length > 0 ? headers : detectColumns(raw_data);
    const structuredData = structureData(raw_data, detectedColumns);
    const columnMetadata = generateColumnMetadata(structuredData, detectedColumns);

    // Calculate quality score
    const calculateQualityScore = (data: any[], metadata: any) => {
      if (!data || data.length === 0) return 0;
      
      const scores = Object.keys(metadata).map(column => {
        const meta = metadata[column];
        let score = 0;
        
        // Completeness score (0-40 points)
        score += (meta.completeness / 100) * 40;
        
        // Data consistency score (0-30 points)
        if (meta.dataType !== 'text') score += 30;
        else if (meta.uniqueValues / meta.totalCount > 0.1) score += 15;
        
        // Uniqueness score (0-30 points)
        const uniquenessRatio = meta.uniqueValues / meta.totalCount;
        if (uniquenessRatio > 0.8) score += 30;
        else if (uniquenessRatio > 0.5) score += 20;
        else if (uniquenessRatio > 0.2) score += 10;
        
        return Math.min(score, 100);
      });
      
      return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    };

    const qualityScore = calculateQualityScore(structuredData, columnMetadata);

    console.log(`✅ Table conversion completed: ${detectedColumns.length} columns, ${structuredData.length} rows, ${qualityScore}% quality`);

    return NextResponse.json({
      success: true,
      data: {
        preview_id,
        structured_data: structuredData,
        detected_columns: detectedColumns,
        column_metadata: columnMetadata,
        quality_score: qualityScore,
        total_rows: structuredData.length,
        status: 'converted'
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error converting table:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to convert table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 