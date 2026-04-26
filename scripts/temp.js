const { syncVMPaySales } = require('./vmpay-client');
const { getVMPayCredentials } = require('./vmpay-config');
const { createClient } = require('@supabase/supabase-js');

// ... wait, I cannot require TypeScript files directly without a compiler in Node.
