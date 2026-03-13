import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const apiKey = searchParams.get('key');
        if (!apiKey) return NextResponse.json({ error: "Missing key" }, { status: 400 });

        const url = `https://pagamento.vmpay.com.br/api/vendas?pagina=0&quantidade=10`;

        const res = await fetch(url, {
            headers: { 'x-api-key': apiKey },
            signal: AbortSignal.timeout(10000)
        });

        const status = res.status;
        const text = await res.text();

        return NextResponse.json({
            status,
            ok: res.ok,
            headers: Object.fromEntries(res.headers.entries()),
            textPreview: text.substring(0, 500)
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
