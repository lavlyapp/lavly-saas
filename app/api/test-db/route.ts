import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, isAuthError } from '@/lib/api-auth';

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (isAuthError(auth)) return auth;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    let supabase = createClient(supabaseUrl, supabaseKey);

    const { data: sales } = await supabase.from('sales')
        .select('id, data, valor, cliente, telefone')
        .ilike('cliente', '%eduardofbmoura%');

    const { data: sales2 } = await supabase.from('sales')
        .select('id, data, valor, cliente, telefone')
        .ilike('cliente', '%lavly%');

    const { data: c1 } = await supabase.from('sales').select('cliente, sum(valor)').ilike('cliente', '%eduardo %').group('cliente');

    return NextResponse.json({
        eduardofbmoura: sales,
        lavly: sales2,
        eduardos: c1
    });
}
