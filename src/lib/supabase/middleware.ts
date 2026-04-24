import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const adminSession = request.cookies.get('admin_session');
  
  console.log('Middleware:', pathname, 'session:', adminSession?.value);
  
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

  // If trying to access admin but not logged in, redirect to login
  if (isAdminRoute && !isLoginRoute && !adminSession) {
    console.log('Redirecting to login - no session');
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // If already logged in and trying to access login, redirect to dashboard
  if (isLoginRoute && adminSession) {
    console.log('Redirecting to dashboard - has session');
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  console.log('Allowing through');
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};