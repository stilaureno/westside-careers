import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/admin-session';
import LoginForm from './login-form';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  
  if (session?.value === ADMIN_SESSION_VALUE) {
    redirect('/admin/dashboard');
  }

  return <LoginForm />;
}
