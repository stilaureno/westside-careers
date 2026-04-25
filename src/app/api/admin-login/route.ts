import { createClient } from '@/lib/supabase/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_VALUE,
  SUPER_ADMIN_SESSION_COOKIE,
  SUPER_ADMIN_SESSION_VALUE,
  getAdminSessionCookieOptions,
  getSuperAdminSessionCookieOptions,
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
    
    const { data: adminConfig } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'ADMIN_PASSWORD')
      .single();

    const { data: superAdminConfig } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'SUPER_ADMIN_PASSWORD')
      .single();

    const { data: adminDeptsConfig } = await supabase
      .from('config')
      .select('allowed_departments')
      .eq('key', 'ADMIN_PASSWORD')
      .single();

    const isSuperAdmin = superAdminConfig?.value === password;
    const isAdmin = adminConfig?.value === password;

    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    const allowedDepartments = adminDeptsConfig?.allowed_departments || null;

    const response = NextResponse.json({ success: true, isSuperAdmin, allowedDepartments });

    response.cookies.set(ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE, {
      ...getAdminSessionCookieOptions(request),
      maxAge: 60 * 60 * 24,
    });

    if (allowedDepartments && allowedDepartments.length > 0) {
      response.cookies.set('allowed_departments', JSON.stringify(allowedDepartments), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
      });
    }

    if (isSuperAdmin) {
      response.cookies.set(SUPER_ADMIN_SESSION_COOKIE, SUPER_ADMIN_SESSION_VALUE, {
        ...getSuperAdminSessionCookieOptions(request),
        maxAge: 60 * 60 * 24,
      });
    }

    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}