import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference_no, last_name, first_name, email, rating, comments } = body;

    if (!reference_no || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Invalid feedback data' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('application_feedback')
      .insert({
        reference_no,
        last_name,
        first_name,
        email,
        rating,
        comments: comments || null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Feedback insertion error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Feedback API error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
