import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Manifest, ManifestFile, MediaEntry } from './context.js';
import { sha256 } from './hash.js';
import { KINDS } from './kinds.js';

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

/**
 * Rewrites manifest.files[] (hash, count, bytes) for every kind file and x- file in `dir`,
 * and refreshes bytes/sha256 on every media.json entry whose file exists. Everything else in
 * manifest.json (exporter, subject, coverage) is preserved verbatim.
 */
export function updateManifest(dir: string): Manifest {
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error('manifest.json not found; write exporter, subject and coverage by hand first');
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;

  const mediaPath = join(dir, 'media.json');
  if (existsSync(mediaPath)) {
    const entries = JSON.parse(readFileSync(mediaPath, 'utf8')) as MediaEntry[];
    for (const e of entries) {
      const f = join(dir, e.path);
      if (!existsSync(f)) continue;
      const buf = readFileSync(f);
      e.bytes = buf.length;
      e.sha256 = sha256(buf);
    }
    writeJson(mediaPath, entries);
  }

  const files: ManifestFile[] = [];
  for (const spec of KINDS) {
    const p = join(dir, spec.file);
    if (!existsSync(p)) continue;
    const buf = readFileSync(p);
    const data = JSON.parse(buf.toString('utf8')) as unknown;
    const count = Array.isArray(data)
      ? data.length
      : Array.isArray((data as { features?: unknown[] }).features)
        ? (data as { features: unknown[] }).features.length
        : undefined;
    files.push({ path: spec.file, kind: spec.kind, ...(count !== undefined ? { count } : {}), sha256: sha256(buf), bytes: buf.length });
  }
  for (const name of readdirSync(dir).filter((n) => n.startsWith('x-')).sort()) {
    const buf = readFileSync(join(dir, name));
    files.push({ path: name, kind: 'extension', sha256: sha256(buf), bytes: buf.length });
  }
  manifest.files = files;
  writeJson(manifestPath, manifest);
  return manifest;
}
