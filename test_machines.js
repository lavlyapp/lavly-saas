const fetch = require('node-fetch');
async function r() {
  try {
    const res = await fetch('http://localhost:3000/api/metrics/machines?store=Todas&period=today', {
      headers: { Authorization: `Bearer ${process.env.SUPABASE_KEY}` }
    });
    const j = await res.json();
    console.log(j.payload.activeMachines.length, j.payload.activeMachines[0]);
  } catch(e) { console.error(e) }
}
r();
