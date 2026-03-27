const baseUrl = "https://apps.vmhub.vmtecnologia.io/vmlav/api/externa/v1";
const key = "3f7509f7-4f65-4fea-b6a9-55901d1b22d6";

async function main() {
    console.log("Fetching /lavanderias...");
    const url = `${baseUrl}/lavanderias?pagina=0&quantidade=50`;
    const res = await fetch(url, { headers: { 'x-api-key': key }, cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    
    const data = await res.json();
    console.log("\nLavanderias array length:", data.length || 0);
    
    data.forEach((l: any, i: number) => {
        console.log(`[Store ${i+1}] ID: ${l.id} | Nome: ${l.nome} | CNPJ: ${l.documentoEmpresa?.identificador}`);
    });
    
    console.log("\nFull dump:");
    console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
