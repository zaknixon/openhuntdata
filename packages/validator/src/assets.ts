import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function locate(name: string): string {
  // Repo checkout first (src/ or dist/ -> packages/validator -> packages -> repo root),
  // then the package-local copy produced by scripts/copy-assets.mjs for published installs.
  const candidates = [join(here, '..', '..', '..', name), join(here, '..', name)];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`Cannot locate ${name}/ directory (looked in ${candidates.join(', ')})`);
}

export const SCHEMA_DIR = locate('schemas');
export const VOCAB_DIR = locate('vocab');
