import { createClient } from '@supabase/supabase-js';
import { upsertSales } from '../lib/persistence';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

async function test() {
  const mockRecord = {
    id: 'test-123',
    data: new Date(),
    loja: 'Lavateria JARDIM NAZARETH (São José do Rio Preto - SP)',
    cliente: 'Test',
    customerId: '123',
    produto: 'Test',
    valor: 10,
    formaPagamento: 'Test',
    tipoCartao: '',
    categoriaVoucher: '',
    desconto: 0,
    telefone: '',
    items: [],
    originalRow: 0
  };

  console.log("Upserting test record...");
  const result = await upsertSales([mockRecord], supabase);
  console.log("Result:", result);
}

test();
