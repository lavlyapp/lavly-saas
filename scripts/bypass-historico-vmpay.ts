import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { runGlobalSync } from '../lib/automation/sync-manager';

// Inicializar variáveis de ambiente
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Cliente Supabase local usando a Chave de Serviço (Bypass de RLS e Políticas)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function injectHistory() {
    console.log("=================================================");
    console.log(" INJEÇÃO DE HISTÓRICO VMPAY (6 MESES) INICIADA ");
    console.log("=================================================");
    
    try {
        console.log("Invocando rotina Core (runGlobalSync) com Force=TRUE...");
        
        // isManual=true, force=true, supabaseAdmin
        const sales = await runGlobalSync(true, true, supabaseAdmin);
        
        console.log("=================================================");
        console.log(`✅ Sucesso! Injetamos ${sales.length} vendas consolidadas no Banco de Dados!`);
        console.log("=================================================");
        process.exit(0);
    } catch (e: any) {
        console.error("❌ Ocorreu um erro catastrófico na injeção:", e);
        process.exit(1);
    }
}

injectHistory();
