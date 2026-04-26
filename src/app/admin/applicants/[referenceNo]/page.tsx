import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE, SUPER_ADMIN_SESSION_COOKIE, SUPER_ADMIN_SESSION_VALUE } from '@/lib/admin-session';
import { getApplicant } from '@/lib/actions/admin';
import DetailContent from './detail-content';

export default async function ApplicantDetailPage({ params }: { params: Promise<{ referenceNo: string }> }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  const superSession = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE);
  
  if (session?.value !== ADMIN_SESSION_VALUE) {
    redirect('/admin/login');
  }

  const isSuperAdmin = superSession?.value === SUPER_ADMIN_SESSION_VALUE;
  const { referenceNo } = await params;
  const res = await getApplicant(referenceNo, '');

  if (!res.data) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#991b1b' }}>
        Applicant not found.
      </div>
    );
  }

  return <DetailContent initialData={res.data} isSuperAdmin={isSuperAdmin} />;
}
