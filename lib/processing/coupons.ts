import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

export interface Coupon {
    store: string; // NEW
    code: string;
    description: string;
    discount: number;
    expiry?: string;
    days?: string;
    hours?: string;
    type: string;
    active: boolean;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const COUPONS_FILE = path.join(DATA_DIR, 'coupons.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function parseCouponWorksheet(buffer: Buffer): Promise<Coupon[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.getWorksheet(1); // First sheet
    const coupons: Coupon[] = [];

    if (!worksheet) return [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Process header in next logical block or skip if using map
    });

    // 1. Find Header Row (Assuming Row 1)
    const headerRow = worksheet.getRow(1);
    const headers: { [key: string]: number } = {};

    headerRow.eachCell((cell, colNumber) => {
        const value = cell.text?.trim().toUpperCase();
        if (value) headers[value] = colNumber;
    });

    // Helper to find column index by possible names
    const getColIndex = (possibleNames: string[]) => {
        for (const name of possibleNames) {
            if (headers[name]) return headers[name];
        }
        return -1;
    };

    const colStore = getColIndex(['LOJA', 'FANTASIA', 'EMPRESA']);
    const colCode = getColIndex(['CUPOM', 'CODIGO', 'CÓDIGO', 'CODE']);
    const colDesc = getColIndex(['TEXTO', 'DESCRICAO', 'DESCRIÇÃO', 'DESCRIPTION']);
    const colDiscount = getColIndex(['DESCONTO', 'PERCENTUAL', '%', 'VALOR']);
    const colExpiry = getColIndex(['VALIDADE', 'VENCIMENTO', 'EXPIRA']);
    const colDays = getColIndex(['DIAS', 'SEMANA', 'DIAS SEMANA']);
    const colHours = getColIndex(['HORARIOS', 'HORÁRIOS', 'HORA']);
    const colType = getColIndex(['FINALIDADE', 'TIPO', 'CATEGORIA', 'CAMPAIGN']);

    // Log found columns for debugging
    // console.log('[Parser] Columns found:', { colStore, colCode, colDesc, colDiscount, colExpiry, colDays, colHours, colType });

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const getCellText = (colIndex: number) => {
            return colIndex > 0 ? row.getCell(colIndex).text?.trim() : '';
        };

        const store = getCellText(colStore);
        const code = getCellText(colCode);
        const description = getCellText(colDesc);

        let discount = 0;
        if (colDiscount > 0) {
            const val = row.getCell(colDiscount).value;
            discount = typeof val === 'number' ? val : parseFloat(String(val || 0));
        }

        const expiry = getCellText(colExpiry);
        const days = getCellText(colDays);
        const hours = getCellText(colHours);
        const type = getCellText(colType)?.toUpperCase();

        if (code && type) {
            coupons.push({
                store: store || 'Todas',
                code,
                description: description || '',
                discount: isNaN(discount) ? 0 : discount,
                expiry: expiry || '',
                days: days || 'Todos',
                hours: hours || '00:00-23:59',
                type,
                active: true
            });
        }
    });

    console.log(`[Parser] Total valid coupons: ${coupons.length}`);
    return coupons;
}

export function saveCoupons(coupons: Coupon[]) {
    fs.writeFileSync(COUPONS_FILE, JSON.stringify(coupons, null, 2));
}

export function loadCoupons(): Coupon[] {
    if (!fs.existsSync(COUPONS_FILE)) return [];
    try {
        const data = fs.readFileSync(COUPONS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to load coupons", e);
        return [];
    }
}

export function findBestCoupon(type: string): Coupon | null {
    const coupons = loadCoupons();
    // Simple logic: returns the first active coupon of the matching type
    const match = coupons.find(c => c.active && c.type === type.toUpperCase());
    return match || null;
}
