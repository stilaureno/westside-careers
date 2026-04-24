import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const host = request.headers.get('host') || '';
  const isProduction = host.includes('vercel.app') || host.includes('westside-careers');
  const baseUrl = request.headers.get('origin') || (isProduction ? 'https://westside-careers.vercel.app' : 'http://localhost:3000');
  
  const response = NextResponse.redirect(new URL('/admin/login', baseUrl));
  
  // Clear cookie - Vercel handles cookie domain automatically
  response.cookies.set('admin_session', '', { 
    path: '/', 
    maxAge: 0,
    sameSite: 'lax',
    secure: isProduction,
  });
  
  return response;
}