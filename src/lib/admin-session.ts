export const ADMIN_SESSION_COOKIE = 'admin_session';
export const ADMIN_SESSION_VALUE = 'authenticated';
export const SUPER_ADMIN_SESSION_COOKIE = 'super_admin_session';
export const SUPER_ADMIN_SESSION_VALUE = 'super';

export function isValidAdminSession(value?: string) {
  return value === ADMIN_SESSION_VALUE;
}

export function isValidSuperAdminSession(value?: string) {
  return value === SUPER_ADMIN_SESSION_VALUE;
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
