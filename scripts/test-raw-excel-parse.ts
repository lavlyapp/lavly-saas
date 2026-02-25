import ExcelJS from 'exceljs';
import * as fs from 'fs';

async function probeExcel(filepath: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filepath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
        console.log("No worksheet found");
        return;
    }

    let headerRowIndex = 1;

    // Output First Row cells explicitly
    console.log("--- ROW 1 ---");
    const row1 = worksheet.getRow(1);
    const headers: string[] = [];
    row1.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const val = String(cell.value || '').trim();
        headers.push(val);
        console.log(`[${colNumber}] ${val}`);
    });

    console.log("\n--- ROW 2 (Sample Data) ---");
    const row2 = worksheet.getRow(2);
    row2.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const val = cell.value;
        const type = typeof val;
        let displayVal = val;

        if (type === 'object' && val !== null) {
            displayVal = JSON.stringify(val).substring(0, 100);
        }
        console.log(`[${colNumber}] (${headers[colNumber - 1] || 'UNKNOWN'}): ${displayVal}`);
    });
}

const file = process.argv[2] || "C:/Users/eduar/Downloads/Vendas geral desde o começo 2021 a 2026.xlsx";
probeExcel(file).catch(console.error);
