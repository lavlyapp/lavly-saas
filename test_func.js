const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const { data, error } = await s.rpc('execute_sql_query', { 
    query: "SELECT pg_get_functiondef('get_financial_dashboard_metrics'::regproc);" 
  });
  console.log(data);
  if (error) console.log(error);
}
test();
