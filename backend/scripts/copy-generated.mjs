import { cp, rm } from 'node:fs/promises';

const source = new URL('../src/generated/', import.meta.url);
const target = new URL('../dist/generated/', import.meta.url);

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });

console.log('Cliente do Prisma copiado para dist/generated');
