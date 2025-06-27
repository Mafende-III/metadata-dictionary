import { NextRequest, NextResponse } from 'next/server';
import { DictionaryProcessingService, ProcessingOptions } from '@/lib/services/dictionaryProcessingService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, options } = body as { 
      action: 'start' | 'cancel' | 'reprocess', 
      options?: ProcessingOptions 
    };

    console.log(`🔄 Dictionary processing action: ${action} for ${id}`);

    switch (action) {
      case 'start':
        // Check if already processing
        if (DictionaryProcessingService.isProcessing(id)) {
          return NextResponse.json({
            success: false,
            error: 'Dictionary is already being processed'
          }, { status: 409 });
        }

        // Start processing in background
        DictionaryProcessingService.processDictionary(id, options || {})
          .then(result => {
            console.log(`✅ Dictionary processing completed for ${id}:`, result);
          })
          .catch(error => {
            console.error(`❌ Dictionary processing failed for ${id}:`, error);
          });

        return NextResponse.json({
          success: true,
          message: 'Dictionary processing started',
          dictionaryId: id
        });

      case 'cancel':
        const cancelled = DictionaryProcessingService.cancelProcessing(id);
        return NextResponse.json({
          success: cancelled,
          message: cancelled ? 'Processing cancelled' : 'No active processing found',
          dictionaryId: id
        });

      case 'reprocess':
        // Check if already processing
        if (DictionaryProcessingService.isProcessing(id)) {
          return NextResponse.json({
            success: false,
            error: 'Dictionary is already being processed'
          }, { status: 409 });
        }

        // Start reprocessing in background
        DictionaryProcessingService.reprocessDictionary(id)
          .then(result => {
            console.log(`✅ Dictionary reprocessing completed for ${id}:`, result);
          })
          .catch(error => {
            console.error(`❌ Dictionary reprocessing failed for ${id}:`, error);
          });

        return NextResponse.json({
          success: true,
          message: 'Dictionary reprocessing started',
          dictionaryId: id
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "start", "cancel", or "reprocess"'
        }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('❌ Error in dictionary processing endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const isProcessing = DictionaryProcessingService.isProcessing(id);
    const activeJobs = DictionaryProcessingService.getActiveProcessingJobs();

    return NextResponse.json({
      success: true,
      data: {
        dictionaryId: id,
        isProcessing,
        activeJobs: activeJobs.length,
        allActiveJobs: activeJobs
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