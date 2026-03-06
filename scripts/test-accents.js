const samples = [
    { type: "TEF", card: "Débito", val: 16.9 },
    { type: "TEF", card: "Crédito", val: 16.9 }
];

samples.forEach(s => {
    const type = String(s.type).toLowerCase();
    const cardType = String(s.card).toLowerCase();

    // Normalize safely to test
    const normCard = cardType.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let cat = "Other";
    if (type.includes('pix') || type.includes('qrcode')) cat = "Pix";
    else if (type.includes('credito') || type.includes('crédito') || cardType.includes('credito') || cardType.includes('crédito') || normCard.includes('credito')) cat = "Credit";
    else if (type.includes('debito') || type.includes('débito') || cardType.includes('debito') || cardType.includes('débito') || normCard.includes('debito')) cat = "Debit";

    console.log(`Original: ${s.type} / ${s.card} | Lower Type: ${type} | Lower Card: ${cardType} | Norm Card: ${normCard} | Result: ${cat}`);
});
