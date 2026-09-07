import AdmZip from 'adm-zip';
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXAMPLES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'examples');

/** Copies examples/<name> into a fresh temp dir and returns its path. */
export function copyFixture(name: string): string {
  const dest = mkdtempSync(join(tmpdir(), `ohd-${name}-`));
  cpSync(join(EXAMPLES_DIR, name), dest, { recursive: true });
  return dest;
}

/** Zips a directory (contents at the zip root) and returns the bytes. */
export function zipDir(dir: string, prefix = ''): Buffer {
  const zip = new AdmZip();
  zip.addLocalFolder(dir, prefix);
  return zip.toBuffer();
}
