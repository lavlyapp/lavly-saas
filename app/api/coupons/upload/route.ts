import { NextResponse } from 'next/server';
import { parseCouponWorksheet, saveCoupons } from '@/lib/processing/coupons';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const coupons = await parseCouponWorksheet(buffer);

        if (coupons.length === 0) {
            return NextResponse.json({ error: 'No valid coupons found in file' }, { status: 400 });
        }

        saveCoupons(coupons);

        return NextResponse.json({
            success: true,
            count: coupons.length,
            coupons
        });

    } catch (error) {
        console.error('Coupon Upload Error:', error);
        return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
    }
}

export async function GET() {
    // Also allow fetching current coupons
    const { loadCoupons } = await import('@/lib/processing/coupons');
    return NextResponse.json(loadCoupons());
}
