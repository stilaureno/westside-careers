import {
  ADMIN_SESSION_COOKIE,
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

  return response;
}
