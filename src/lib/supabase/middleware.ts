import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for static files and API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If no env vars, return raw response without auth redirect
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const isAdminRoute = pathname.startsWith('/admin');
    const isLoginRoute = pathname === '/admin/login';
    const isPublicRoute =
      pathname === '/' ||
      pathname.startsWith('/apply') ||
      pathname.startsWith('/status') ||
      pathname.startsWith('/exam');

    // Protected: redirect to login if no user
    if (isAdminRoute && !isLoginRoute && !user) {
      return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url));
    }

    // Already logged in: redirect to dashboard
    if (isLoginRoute && user) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    return supabaseResponse;
  } catch {
    return supabaseResponse;
  }
}