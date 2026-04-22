import { getCanonicalStoreName } from './lib/vmpay-config.ts';

console.log("Lavateria Cascavel ->", getCanonicalStoreName("Lavateria Cascavel"));
console.log("Cascavel ->", getCanonicalStoreName("Cascavel"));
console.log("Lavateria MUFFATO ->", getCanonicalStoreName("Lavateria MUFFATO"));
