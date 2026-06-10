import { NextRequest, NextResponse } from 'next/server';
import { generateSupportResponse } from '@/services/geminiService';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const response = await generateSupportResponse(query);
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Support API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate support response' },
      { status: 500 }
    );
  }
}
