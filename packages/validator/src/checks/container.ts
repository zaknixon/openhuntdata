import type { Context, Manifest } from '../context.js';
import { sha256 } from '../hash.js';
import { KIND_BY_FILE } from '../kinds.js';
import { getValidator } from '../schemas.js';

/** Checks 1 to 3: container, manifest, listed files. Returns false when later checks cannot run. */
export function checkContainer(ctx: Context): boolean {
  const { bundle } = ctx;
  if (!bundle.has('manifest.json')) {
    ctx.error('container', 'manifest.json is missing');
    return false;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(bundle.readText('manifest.json'));
  } catch (e) {
    ctx.error('container', `manifest.json is not valid JSON: ${(e as Error).message}`, 'manifest.json');
    return false;
  }
  const validate = getValidator('manifest.schema.json');
  if (!validate(raw)) {
    for (const err of validate.errors ?? []) ctx.error('manifest', `${err.instancePath || '/'} ${err.message ?? ''}`.trim(), 'manifest.json');
    return false;
  }
  const manifest = raw as Manifest;
  if (Number(manifest.ohd_version.split('.')[0]) !== 1) {
    ctx.error('manifest', `ohd_version ${manifest.ohd_version} is not a 1.x version`, 'manifest.json');
    return false;
  }
  ctx.manifest = manifest;

  const listed = new Set<string>();
  for (const f of manifest.files) {
    listed.add(f.path);
    if (!bundle.has(f.path)) {
      ctx.error('files', 'listed file does not exist in the bundle', f.path);
      continue;
    }
    const bytes = bundle.readBytes(f.path);
    const actual = sha256(bytes);
    if (actual !== f.sha256) {
      ctx.error('files', `sha256 mismatch: manifest says ${f.sha256.slice(0, 12)}…, actual ${actual.slice(0, 12)}…`, f.path);
    }
    if (f.bytes !== undefined && f.bytes !== bytes.length) {
      ctx.error('files', `bytes mismatch: manifest says ${f.bytes}, actual ${bytes.length}`, f.path);
    }
    const spec = KIND_BY_FILE.get(f.path);
    if (spec && f.kind !== spec.kind) {
      ctx.error('files', `kind "${f.kind}" does not match file name (expected "${spec.kind}")`, f.path);
    }
  }
  for (const p of bundle.list()) {
    if (p === 'manifest.json' || listed.has(p)) continue;
    if (p.startsWith('media/') || p.startsWith('x-') || p.startsWith('.') || p.includes('/.')) continue;
    ctx.error('files', 'file is present in the bundle but not listed in manifest.files and not x- prefixed', p);
  }
  return true;
}
