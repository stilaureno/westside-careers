import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_VALUE,
  SUPER_ADMIN_SESSION_COOKIE,
  SUPER_ADMIN_SESSION_VALUE,
} from '@/lib/admin-session';
import { getApplicantsPageData } from '@/lib/db/applicants';
import ApplicantsContent from './applicants-content';

export default async function ApplicantsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  const superSession = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE);
  
  if (session?.value !== ADMIN_SESSION_VALUE) {
    redirect('/admin/login');
  }

  const isSuperAdmin = superSession?.value === SUPER_ADMIN_SESSION_VALUE;
  const allowedDepartmentsCookie = cookieStore.get('allowed_departments')?.value;
  let allowedDepartments: string[] = [];

  if (allowedDepartmentsCookie) {
    try {
      const parsed = JSON.parse(allowedDepartmentsCookie);
      if (Array.isArray(parsed)) {
        allowedDepartments = parsed.filter((value): value is string => typeof value === 'string');
      }
    } catch {
      allowedDepartments = [];
    }
  }

  const initialApplicants = await getApplicantsPageData({
    limit: 300,
    allowedDepartments,
    isSuperAdmin,
  });

  return (
    <ApplicantsContent
      initialApplicants={initialApplicants}
      isSuperAdmin={isSuperAdmin}
      allowedDepartments={allowedDepartments}
    />
  );
}
