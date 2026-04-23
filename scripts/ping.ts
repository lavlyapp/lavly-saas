async function ping() {
    console.log("Pinging JOQUEI Live...");
    // The force=true flag ignores cache. isManual=true bypasses the Store's "Auto-Sync Disabled" setting.
    const url = "https://www.teste.lavly.com.br/api/vmpay/sync?cnpj=50741565000106&force=true&isManual=true";
    try {
        const r = await fetch(url);
        const data = await r.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
ping();
