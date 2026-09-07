import type { Context, MediaEntry } from '../context.js';
import { sha256 } from '../hash.js';
import { KIND_BY_NAME } from '../kinds.js';

/** Check 8: media.json agrees with media/ on disk, and record media refs / owners resolve. */
export function checkMedia(ctx: Context): void {
  const { bundle } = ctx;
  const onDisk = bundle.list().filter((p) => p.startsWith('media/'));
  const entries = (ctx.records.get('media') as MediaEntry[] | undefined);

  if (!entries) {
    if (onDisk.length > 0) ctx.error('media', `${onDisk.length} file(s) under media/ without media.json`);
    return;
  }

  const listed = new Set<string>();
  for (const e of entries) {
    if (listed.has(e.path)) ctx.error('media', `duplicate media.json entry for ${e.path}`, e.path);
    listed.add(e.path);
    if (!bundle.has(e.path)) {
      ctx.error('media', 'media.json entry has no file in the bundle', e.path);
      continue;
    }
    const bytes = bundle.readBytes(e.path);
    if (bytes.length !== e.bytes) ctx.error('media', `bytes mismatch: media.json says ${e.bytes}, actual ${bytes.length}`, e.path);
    const actual = sha256(bytes);
    if (actual !== e.sha256) ctx.error('media', `sha256 mismatch: media.json says ${e.sha256.slice(0, 12)}…, actual ${actual.slice(0, 12)}…`, e.path);
    for (const owner of e.owners) {
      const recs = ctx.records.get(owner.kind);
      if (!recs || !recs.some((r) => r.id === owner.id)) {
        ctx.warn('media', `owner ${owner.kind}/${owner.id} does not resolve to a record`, e.path);
      }
    }
  }
  for (const p of onDisk) {
    if (!listed.has(p)) ctx.warn('media', 'file under media/ is not listed in media.json', p);
  }

  for (const [kind, records] of ctx.records) {
    if (kind === 'media') continue;
    const file = KIND_BY_NAME.get(kind)!.file;
    records.forEach((rec, i) => {
      const refs = Array.isArray(rec.media) ? (rec.media as string[]) : [];
      for (const ref of refs) {
        if (!listed.has(ref)) ctx.warn('media', `record references ${ref}, which is not in media.json`, `${file}#/${i}/media`);
      }
    });
  }
}
