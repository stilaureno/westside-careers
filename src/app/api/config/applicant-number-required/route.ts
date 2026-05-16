import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'APPLICANT_NUMBER_REQUIRED')
    .single();

  const required = data?.value === 'true';
  
  return NextResponse.json({ required });
}