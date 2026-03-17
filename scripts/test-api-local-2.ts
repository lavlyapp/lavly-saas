import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Since Next.js Request requires polyfills in native node, let's just use node-fetch to call localhost
// Actually, since this is a NextJS app, let's just hit the localhost:3000 endpoint 
// Assuming the dev server is NOT running, let's just invoke the function manually with a mock Request.

import { GET } from '../app/api/admin/profiles/route';

async function testApi() {
    const req = new Request('http://localhost:3000/api/admin/profiles', {
        headers: { 'Authorization': 'Bearer ADMIN_REQUEST' }
    });
    
    const res = await GET(req);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

testApi();
