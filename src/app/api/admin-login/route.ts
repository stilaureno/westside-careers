import { createClient } from '@/lib/supabase/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_VALUE,
  getAdminSessionCookieOptions,
} from '@/lib/admin-session';
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

    const response = NextResponse.json({ success: true });

    response.cookies.set(ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE, {
      ...getAdminSessionCookieOptions(request),
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
