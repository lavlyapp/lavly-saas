import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStores() {
    const { data: stores, error } = await supabaseAdmin.from("stores").select("*");
    if (error) {
        console.error("Error reading stores:", error);
    } else {
        console.log("Total stores in DB:", stores.length);
        console.log(stores.map(s => ({ id: s.id, name: s.name, cnpj: s.cnpj })));
    }
}

checkStores();
