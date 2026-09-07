// Verifies that every relative link in site/index.html and README.md points at an existing file.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['site/index.html', 'README.md'];
const PATTERNS = [/href="([^"#]+)(?:#[^"]*)?"/g, /src="([^"#]+)"/g, /\]\(([^)#\s]+)(?:#[^)]*)?\)/g];

let broken = 0;
for (const rel of FILES) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) { console.error(`missing source file: ${rel}`); broken++; continue; }
  const text = readFileSync(file, 'utf8');
  for (const re of PATTERNS) {
    for (const m of text.matchAll(re)) {
      const target = m[1];
      if (/^(https?:|mailto:|data:|\/\/)/.test(target)) continue;
      const path = join(dirname(file), target);
      if (!existsSync(path)) { console.error(`${rel}: broken link -> ${target}`); broken++; }
    }
  }
}
if (broken) { console.error(`${broken} broken link(s)`); process.exit(1); }
console.log('links ok');
