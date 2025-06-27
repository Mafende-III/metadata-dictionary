import { NextRequest, NextResponse } from 'next/server';
import { DictionaryService } from '@/lib/services/dictionaryService';

export async function GET() {
  try {
    const dictionaries = await DictionaryService.getDictionaries();
    return NextResponse.json(dictionaries);
  } catch (error) {
    console.error('Error fetching dictionaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dictionaries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      instance_id, 
      instance_name,
      metadata_type, 
      sql_view_id, 
      group_id, 
      processing_method, 
      period 
    } = body;

    if (!name || !instance_id || !instance_name || !metadata_type || !sql_view_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const dictionary = await DictionaryService.createDictionary({
      name,
      description,
      instance_id,
      instance_name,
      metadata_type,
      sql_view_id,
      group_id,
      processing_method: processing_method || 'batch',
      period
    });

    return NextResponse.json(dictionary, { status: 201 });
  } catch (error) {
    console.error('Error creating dictionary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create dictionary' },
      { status: 500 }
    );
  }
} 