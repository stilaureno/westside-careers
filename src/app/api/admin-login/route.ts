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
    
    // Set cookie - use secure settings for production
    const isProduction = request.headers.get('host')?.includes('vercel.app') || 
                        request.headers.get('host')?.includes('westside-careers');
    
    response.cookies.set('admin_session', 'authenticated', {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      ...(isProduction ? { domain: '.vercel.app' } : {}),
    });

    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}