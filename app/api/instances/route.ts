import { NextRequest, NextResponse } from 'next/server';
import { InstanceService } from '@/lib/services/instanceService';

export async function GET() {
  try {
    const instances = await InstanceService.getInstances();
    return NextResponse.json(instances);
  } catch (error) {
    console.error('Error fetching instances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instances' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, base_url, username, password } = body;

    if (!name || !base_url || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const instance = await InstanceService.createInstance({
      name,
      base_url,
      username,
      password
    });

    return NextResponse.json(instance, { status: 201 });
  } catch (error) {
    console.error('Error creating instance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create instance' },
      { status: 500 }
    );
  }
} 