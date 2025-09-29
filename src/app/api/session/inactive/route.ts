import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      );
    }

    // Mark session as inactive
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('session_token', token);

    if (error) {
      console.error('Error marking session inactive:', error);
      return NextResponse.json(
        { error: 'Failed to mark session inactive' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session inactive API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
