import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * SENTINELA DE DADOS (Harness Fase 1)
 * Verifica a saúde do pipeline de dados do Lavly.
 * Chamado pelo GitHub Actions a cada 30min — falha visível se algo estiver parado.
 *
 * Checks:
 *  1. lastSale  — última venda recente (2h em horário comercial, 14h fora dele)
 *  2. matViews  — mv_orders_daily atualizada (dia >= anteontem)
 *  3. gender    — classificação de gênero dos clientes preservada (>= 50% M/F)
 *  4. financialRpc — RPC do dashboard financeiro responde
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const checks: Record<string, { ok: boolean; detail: string }> = {};

    // --- 1. Última venda recente ---
    try {
        const { data: lastSale } = await supabase
            .from('sales')
            .select('data')
            .order('data', { ascending: false })
            .limit(1)
            .single();

        if (!lastSale?.data) {
            checks.lastSale = { ok: false, detail: 'Nenhuma venda encontrada na tabela sales.' };
        } else {
            const ageHours = (Date.now() - new Date(lastSale.data).getTime()) / 3600000;
            // Hora local de Brasília (UTC-3)
            const hourBrt = (new Date().getUTCHours() - 3 + 24) % 24;
            const isBusinessHours = hourBrt >= 9 && hourBrt <= 22;
            const threshold = isBusinessHours ? 2 : 14;
            checks.lastSale = {
                ok: ageHours <= threshold,
                detail: `Última venda há ${ageHours.toFixed(1)}h (limite: ${threshold}h ${isBusinessHours ? 'comercial' : 'noturno'}).`
            };
        }
    } catch (e: any) {
        checks.lastSale = { ok: false, detail: `Erro: ${e.message}` };
    }

    // --- 2. Views materializadas atualizadas ---
    try {
        const { data: lastDia } = await supabase
            .from('mv_orders_daily')
            .select('dia')
            .order('dia', { ascending: false })
            .limit(1)
            .single();

        if (!lastDia?.dia) {
            checks.matViews = { ok: false, detail: 'mv_orders_daily vazia.' };
        } else {
            const ageDays = (Date.now() - new Date(lastDia.dia).getTime()) / 86400000;
            checks.matViews = {
                ok: ageDays <= 2,
                detail: `mv_orders_daily: último dia ${lastDia.dia} (${ageDays.toFixed(1)} dias atrás, limite 2).`
            };
        }
    } catch (e: any) {
        checks.matViews = { ok: false, detail: `Erro: ${e.message}` };
    }

    // --- 3. Classificação de gênero preservada (regra de negócio: nunca perder M/F) ---
    try {
        const [{ count: total }, { count: classified }] = await Promise.all([
            supabase.from('customers').select('*', { count: 'exact', head: true }),
            supabase.from('customers').select('*', { count: 'exact', head: true }).in('gender', ['M', 'F'])
        ]);

        const pct = total && total > 0 ? (classified || 0) / total : 0;
        checks.gender = {
            ok: pct >= 0.5,
            detail: `${classified}/${total} clientes com gênero M/F (${(pct * 100).toFixed(1)}%, mínimo 50%).`
        };
    } catch (e: any) {
        checks.gender = { ok: false, detail: `Erro: ${e.message}` };
    }

    // --- 4. RPC do dashboard financeiro responde ---
    try {
        const todayStart = new Date();
        todayStart.setUTCHours(3, 0, 0, 0); // 00:00 BRT
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_financial_dashboard_metrics', {
            p_store: 'Todas',
            p_start_date: todayStart.toISOString(),
            p_end_date: new Date().toISOString()
        });

        checks.financialRpc = {
            ok: !rpcError && !!rpcData,
            detail: rpcError ? `RPC falhou: ${rpcError.message}` : 'RPC respondeu normalmente.'
        };
    } catch (e: any) {
        checks.financialRpc = { ok: false, detail: `Erro: ${e.message}` };
    }

    const healthy = Object.values(checks).every(c => c.ok);

    return NextResponse.json(
        { healthy, checkedAt: new Date().toISOString(), checks },
        { status: healthy ? 200 : 500 }
    );
}
