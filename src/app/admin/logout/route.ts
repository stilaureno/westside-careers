import {
  ADMIN_SESSION_COOKIE,
  SUPER_ADMIN_SESSION_COOKIE,
  getAdminSessionCookieOptions,
} from '@/lib/admin-session';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url));

  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...getAdminSessionCookieOptions(request),
    expires: new Date(0),
    maxAge: 0,
  });

  response.cookies.set(SUPER_ADMIN_SESSION_COOKIE, '', {
    ...getAdminSessionCookieOptions(request),
    expires: new Date(0),
    maxAge: 0,
  });

  response.cookies.set('admin_key', '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });

  response.cookies.set('allowed_departments', '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}