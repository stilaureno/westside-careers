import { NextResponse, type NextRequest } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSession,
} from '@/lib/admin-session';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE);
  const hasValidAdminSession = isValidAdminSession(adminSession?.value);
  
  // Skip middleware for static files, API routes, favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({ request });
  }

  // Public routes that don't require auth
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/apply') ||
    pathname.startsWith('/status') ||
    pathname.startsWith('/exam');

  // Allow public routes through
  if (isPublicRoute) {
    return NextResponse.next({ request });
  }

  // Admin routes
  const isLoginRoute = pathname === '/admin/login';
  const isAdminRoute = pathname.startsWith('/admin');

  // If already logged in and trying to access login, redirect to admin landing
  if (isLoginRoute && hasValidAdminSession) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  if (isAdminRoute && !isLoginRoute && !hasValidAdminSession) {
    const response = NextResponse.redirect(new URL('/admin/login', request.url));

    if (adminSession) {
      response.cookies.delete(ADMIN_SESSION_COOKIE);
    }

    return response;
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
