import { getCanonicalStoreName } from '../lib/vmpay-config';

const start = performance.now();
let matched = 0;
for (let i = 0; i < 35000; i++) {
    if (getCanonicalStoreName("LAVATERIA BEZERRA MENEZES") === getCanonicalStoreName("Lavateria Cascavel")) {
        matched++;
    }
}
const end = performance.now();
console.log(`Matched: ${matched}`);
console.log(`Execution time: ${end - start} ms`);
