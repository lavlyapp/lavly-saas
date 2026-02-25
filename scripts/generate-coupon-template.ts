
import ExcelJS from 'exceljs';
import path from 'path';

async function generateTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cupons');

    // Define Columns
    worksheet.columns = [
        { header: 'LOJA', key: 'store', width: 20 },
        { header: 'CUPOM', key: 'code', width: 20 },
        { header: 'TEXTO', key: 'description', width: 40 },
        { header: 'DESCONTO (%)', key: 'discount', width: 15 },
        { header: 'VALIDADE', key: 'expiry', width: 15 },
        { header: 'DIAS SEMANA', key: 'days', width: 20 },
        { header: 'HORÁRIOS', key: 'hours', width: 15 },
        { header: 'FINALIDADE', key: 'type', width: 20 },
    ];

    // Add Example Data
    worksheet.addRow({
        store: 'Lavly Cocó',
        code: 'PARABENS10',
        description: 'Parabéns! Ganhe 10% de desconto no seu aniversário.',
        discount: 10,
        expiry: '',
        days: 'Todos',
        hours: '08:00-22:00',
        type: 'ANIVERSARIO'
    });

    worksheet.addRow({
        code: 'SECA_TERCA',
        description: 'Terça da Secagem com 50% OFF.',
        discount: 50,
        expiry: '',
        days: 'Terca',
        hours: '',
        type: 'SECA_TERCA'
    });

    worksheet.addRow({
        code: 'CHUVA_OFF',
        description: 'Dia de chuva? Seque com desconto!',
        discount: 20,
        expiry: '2024-12-31',
        days: 'Todos',
        hours: '',
        type: 'CHUVA'
    });

    // Style Header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF000000' } // Black header
    };

    // Save to Docs folder (Consistently writable)
    const docsDir = path.join(process.cwd(), 'docs');
    const filePath = path.join(docsDir, 'Modelo_Cupons_VMPay.xlsx');

    await workbook.xlsx.writeFile(filePath);
    console.log(`Template gerado em: ${filePath}`);
}

generateTemplate().catch(console.error);
