import type { Context } from '../context.js';
import { KIND_BY_NAME, type Kind } from '../kinds.js';

const SINGLE_REFS: [field: string, target: Kind][] = [
  ['hunt_id', 'hunts'], ['waypoint_id', 'waypoints'], ['area_id', 'areas'], ['property_id', 'properties'],
];
const ARRAY_REFS: [field: string, target: Kind][] = [['harvest_ids', 'harvests'], ['sighting_ids', 'sightings']];

/** Check 7: ids are unique per kind; cross-references resolve (dangling = one warning per kind.field with a count). */
export function checkRefs(ctx: Context): void {
  const ids = new Map<Kind, Set<string>>();
  for (const [kind, records] of ctx.records) {
    if (kind === 'media') continue;
    const seen = new Set<string>();
    const file = KIND_BY_NAME.get(kind)!.file;
    records.forEach((rec, i) => {
      const id = rec.id as string | undefined;
      if (!id) return;
      if (seen.has(id)) ctx.error('refs', `duplicate id ${id}`, `${file}#/${i}/id`);
      seen.add(id);
    });
    ids.set(kind, seen);
  }

  for (const [kind, records] of ctx.records) {
    if (kind === 'media') continue;
    const file = KIND_BY_NAME.get(kind)!.file;
    for (const [field, target] of [...SINGLE_REFS, ...ARRAY_REFS]) {
      const targetIds = ids.get(target) ?? new Set<string>();
      let dangling = 0;
      for (const rec of records) {
        const v = rec[field];
        const list = Array.isArray(v) ? (v as string[]) : typeof v === 'string' ? [v] : [];
        for (const ref of list) if (!targetIds.has(ref)) dangling++;
      }
      if (dangling > 0) {
        const targetFile = KIND_BY_NAME.get(target)!.file;
        ctx.warn('refs', `${dangling} ${kind}.${field} reference(s) do not resolve to a record in ${targetFile}`, file);
      }
    }
  }
}
