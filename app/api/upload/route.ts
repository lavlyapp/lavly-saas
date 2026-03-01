import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/lib/processing/etl';
import { logActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
        }

        console.log(`[UPLOAD API] Received file: ${file.name}, size: ${file.size} bytes`);

        const result = await parseFile(file);

        console.log(`[UPLOAD API] Parsed Records: ${result.records?.length}, Errors: ${result.errors?.length}`);

        // 3. Log the upload activity
        await logActivity("UPLOAD_FILE", null, {
            fileName: file.name,
            fileSize: file.size,
            recordsCount: result.records?.length,
            type: result.type
        });

        // --- FIXED: Valid Return Syntax ---
        return NextResponse.json({
            success: true,
            type: result.type, // Make sure type is returned!
            summary: (result as any).summary, // Type guard needed if result is union
            records: result.records,
            logs: (result as any).logs || [],
            errors: result.errors
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
