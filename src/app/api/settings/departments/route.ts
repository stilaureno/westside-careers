import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: departments } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name');

    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('is_active', true)
      .order('name');

    return NextResponse.json({
      departments: departments || [],
      positions: positions || [],
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}