import { getCanonicalStoreName } from './lib/vmpay-config';

const testCases = [
    { raw: "Lavateria BEZERRA MENEZES", expected: "Lavateria Cascavel" },
    { raw: "BEZERRA MENEZES", expected: "Lavateria Cascavel" },
    { raw: "SANTOS DUMONT", expected: "Lavateria SANTOS DUMONT" },
    { raw: "Lavateria JOSE WALTER", expected: "Lavateria JOSE WALTER" },
    { raw: "Maracanau", expected: "Lavateria SHOPPING (Maracanau)" },
    { raw: "Unknown Store", expected: "Unknown Store" }
];

console.log("--- Testing Store Normalization ---");
testCases.forEach(({ raw, expected }) => {
    const result = getCanonicalStoreName(raw);
    const passed = result === expected;
    console.log(`${passed ? '✅' : '❌'} Raw: "${raw}" -> Result: "${result}" (Expected: "${expected}")`);
});
