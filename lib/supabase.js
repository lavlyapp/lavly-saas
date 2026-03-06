"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
var ssr_1 = require("@supabase/ssr");
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
var supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials missing. Database features will be unavailable.');
}
// Client configuration using @supabase/ssr browser client.
// This allows the frontend to automatically extract the session token from cookies
// to ensure RLS policies can authenticate DB requests on the client side.
exports.supabase = (0, ssr_1.createBrowserClient)(supabaseUrl, supabaseAnonKey);
