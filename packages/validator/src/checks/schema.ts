import type { AnyRecord, Context } from '../context.js';
import { KINDS, type KindSpec } from '../kinds.js';
import { getValidator } from '../schemas.js';

interface FeatureLike { id?: string; geometry: unknown; properties: Record<string, unknown> }

function normalize(spec: KindSpec, data: unknown): AnyRecord[] {
  if (spec.geojson) {
    const fc = data as { features: FeatureLike[] };
    return fc.features.map((f) => ({ ...f.properties, id: (f.properties.id as string | undefined) ?? f.id, geometry: f.geometry }));
  }
  return data as AnyRecord[];
}

/** Check 4: every kind file present parses and matches its JSON Schema. Fills ctx.records. */
export function checkSchemas(ctx: Context): void {
  for (const spec of KINDS) {
    if (!ctx.bundle.has(spec.file)) continue;
    let data: unknown;
    try {
      data = JSON.parse(ctx.bundle.readText(spec.file));
    } catch (e) {
      ctx.error('json', `not valid JSON: ${(e as Error).message}`, spec.file);
      continue;
    }
    const validate = getValidator(spec.schema);
    if (!validate(data)) {
      for (const err of validate.errors ?? []) {
        ctx.error('schema', `${err.instancePath || '/'} ${err.message ?? ''}`.trim(), spec.file);
      }
      continue;
    }
    const records = normalize(spec, data);
    ctx.records.set(spec.kind, records);
    const entry = ctx.manifest?.files.find((f) => f.path === spec.file);
    if (entry?.count !== undefined && entry.count !== records.length) {
      ctx.error('files', `manifest count ${entry.count} but file has ${records.length} records`, spec.file);
    }
  }
}
