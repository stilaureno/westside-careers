import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Get the base URL from the request headers
  const baseUrl = request.headers.get('origin') || 'https://westside-careers.vercel.app';
  
  const response = NextResponse.redirect(new URL('/admin/login', baseUrl));
  response.cookies.set('admin_session', '', { path: '/', maxAge: 0 });
  return response;
}