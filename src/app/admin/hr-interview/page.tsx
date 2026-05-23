import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/admin-session';
import { createClient } from '@/lib/supabase/server';
import HrInterviewContent from './hr-interview-content';

export default async function HrInterviewPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);
  if (session?.value !== ADMIN_SESSION_VALUE) {
    redirect('/admin/login');
  }

  const supabase = await createClient();
  const { data: applicants } = await supabase
    .from('applicants')
    .select('reference_no, first_name, last_name, applicant_number')
    .order('created_at', { ascending: false });

  return <HrInterviewContent initialApplicants={applicants || []} />;
}
