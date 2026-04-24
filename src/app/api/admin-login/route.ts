import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data: config } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'ADMIN_PASSWORD')
      .single();

    if (!config || config.value !== password) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    // Success - set cookie in response
    const response = NextResponse.json({ success: true });
    
    // Detect production environment
    const host = request.headers.get('host') || '';
    const isProduction = host.includes('vercel.app') || host.includes('westside-careers');
    
    // Set cookie - Vercel handles cookie domain automatically
    response.cookies.set('admin_session', 'authenticated', {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}