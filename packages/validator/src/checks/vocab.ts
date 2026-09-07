import type { AnyRecord, Context } from '../context.js';
import { KIND_BY_NAME, type Kind } from '../kinds.js';
import { loadVocab } from '../vocab.js';

/** Vocab-controlled fields per kind, as JSON-pointer-style paths relative to the record. */
const FIELDS: Partial<Record<Kind, { path: string; vocab: string }[]>> = {
  harvests: [
    { path: 'species', vocab: 'species' }, { path: 'sex', vocab: 'sex' }, { path: 'age_class', vocab: 'age_class' },
    { path: 'weapon', vocab: 'weapon' }, { path: 'weather/moon/phase', vocab: 'moon_phase' },
  ],
  sightings: [{ path: 'weather/moon/phase', vocab: 'moon_phase' }],
  hunts: [
    { path: 'moon/phase', vocab: 'moon_phase' },
    { path: 'weather_forecast/moon/phase', vocab: 'moon_phase' },
    { path: 'weather_actual/moon/phase', vocab: 'moon_phase' },
  ],
  waypoints: [{ path: 'category', vocab: 'waypoint_category' }],
  areas: [{ path: 'category', vocab: 'area_category' }],
  tracks: [{ path: 'category', vocab: 'track_category' }],
};

const OBSERVATION_FIELDS = [
  { path: 'species', vocab: 'species' }, { path: 'sex', vocab: 'sex' }, { path: 'age_class', vocab: 'age_class' },
];

function get(obj: unknown, path: string): unknown {
  return path.split('/').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function checkValue(ctx: Context, obj: unknown, path: string, vocab: string, where: string): void {
  const value = get(obj, path);
  if (value === undefined || value === null) return;
  if (typeof value !== 'string') return; // schema already reported the type
  const codes = loadVocab(vocab);
  if (!codes.has(value)) {
    ctx.error('vocab', `"${value}" is not in vocab ${vocab}`, `${where}/${path}`);
    return;
  }
  if (value === 'other') {
    const text = get(obj, `${path}_text`);
    if (typeof text !== 'string' || text.length === 0) {
      ctx.warn('vocab', `"other" without ${path.split('/').pop()}_text; importers cannot show the original label`, `${where}/${path}`);
    }
  }
}

/** Check 6: every vocab-controlled value is a known code; "other" carries its _text. */
export function checkVocab(ctx: Context): void {
  for (const [kind, records] of ctx.records) {
    const file = KIND_BY_NAME.get(kind)!.file;
    const fields = FIELDS[kind] ?? [];
    records.forEach((rec: AnyRecord, i) => {
      const where = `${file}#/${i}`;
      for (const f of fields) checkValue(ctx, rec, f.path, f.vocab, where);
      if (kind === 'sightings' && Array.isArray(rec.observations)) {
        rec.observations.forEach((obs, j) => {
          for (const f of OBSERVATION_FIELDS) checkValue(ctx, obs, f.path, f.vocab, `${where}/observations/${j}`);
        });
      }
    });
  }
}
