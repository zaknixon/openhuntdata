import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

for (const dir of ['schemas', 'vocab']) {
  const dest = fileURLToPath(new URL(`../${dir}/`, import.meta.url));
  const src = fileURLToPath(new URL(`../../../${dir}/`, import.meta.url));
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`copied ${dir}/`);
}
