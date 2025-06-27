import { NextRequest, NextResponse } from 'next/server';
import { DictionaryProcessingService } from '@/lib/services/dictionaryProcessingService';
import { DictionaryService } from '@/lib/services/dictionaryService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: 'start' | 'check' };

    if (action === 'start') {
      console.log('🚀 Manual trigger: Processing all pending dictionaries');
      
      // Trigger background processing
      DictionaryProcessingService.processAllPending()
        .then(() => {
          console.log('✅ All pending dictionaries processing started');
        })
        .catch(error => {
          console.error('❌ Error starting pending processing:', error);
        });

      return NextResponse.json({
        success: true,
        message: 'Processing started for all pending dictionaries'
      });
    }

    if (action === 'check') {
      // Get all dictionaries and check status
      const dictionaries = await DictionaryService.getDictionaries();
      const pending = dictionaries.filter(d => d.status === 'generating');
      const activeJobs = DictionaryProcessingService.getActiveProcessingJobs();

      return NextResponse.json({
        success: true,
        data: {
          totalDictionaries: dictionaries.length,
          pendingDictionaries: pending.length,
          activeProcessingJobs: activeJobs.length,
          pendingIds: pending.map(d => ({ id: d.id, name: d.name })),
          activeJobIds: activeJobs
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "start" or "check"'
    }, { status: 400 });

  } catch (error: unknown) {
    console.error('❌ Error in process-all endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const dictionaries = await DictionaryService.getDictionaries();
    const pending = dictionaries.filter(d => d.status === 'generating');
    const activeJobs = DictionaryProcessingService.getActiveProcessingJobs();

    return NextResponse.json({
      success: true,
      data: {
        totalDictionaries: dictionaries.length,
        pendingDictionaries: pending.length,
        activeProcessingJobs: activeJobs.length,
        pendingIds: pending.map(d => ({ 
          id: d.id, 
          name: d.name, 
          created_at: d.created_at,
          metadata_type: d.metadata_type 
        })),
        activeJobIds: activeJobs
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error checking processing status:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 