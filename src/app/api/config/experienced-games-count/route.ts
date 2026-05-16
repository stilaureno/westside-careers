import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'EXPERIENCED_DEALER_REQUIRED_GAMES')
    .single();

  const count = data?.value ? parseInt(data.value, 10) : 2;
  
  return NextResponse.json({ count });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { count } = body;

    if (!count || count < 1 || count > 10) {
      return NextResponse.json({ success: false, error: 'Invalid count' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { error } = await supabase
      .from('config')
      .upsert({ 
        key: 'EXPERIENCED_DEALER_REQUIRED_GAMES', 
        value: count.toString() 
      }, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}