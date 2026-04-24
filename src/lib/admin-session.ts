export const ADMIN_SESSION_COOKIE = 'admin_session';
export const ADMIN_SESSION_VALUE = 'authenticated';

export function isValidAdminSession(value?: string) {
  return value === ADMIN_SESSION_VALUE;
}

export function getAdminSessionCookieOptions(request: Request) {
  const isSecure = new URL(request.url).protocol === 'https:';

  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecure,
  };
}
