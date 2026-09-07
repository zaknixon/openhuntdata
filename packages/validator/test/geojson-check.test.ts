import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ringArea } from '../src/checks/geojson.js';
import { updateManifest } from '../src/manifest-tool.js';
import { validateBundle } from '../src/validate.js';
import { copyFixture } from './helpers.js';

const envelope = {
  id: '00000000-0000-4000-8000-00000000a001',
  created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  source: { app: 'Test', app_version: '1', record_id: 'a1' }, visibility: 'private',
};
const ccw = [[-86.8, 36.1], [-86.78, 36.1], [-86.78, 36.12], [-86.8, 36.12], [-86.8, 36.1]];
const cw = [...ccw].reverse();

function withAreas(features: unknown[]) {
  const dir = copyFixture('minimal');
  writeFileSync(join(dir, 'areas.geojson'), JSON.stringify({ type: 'FeatureCollection', features }));
  const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  m.coverage.included.push('areas');
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
  updateManifest(dir);
  return dir;
}
const area = (geometry: unknown, id = envelope.id) => ({ type: 'Feature', id, geometry, properties: { ...envelope, id, name: 'A', category: 'boundary' } });

describe('ringArea', () => {
  it('is positive for counter-clockwise and negative for clockwise rings', () => {
    expect(ringArea(ccw)).toBeGreaterThan(0);
    expect(ringArea(cw)).toBeLessThan(0);
  });
});

describe('geojson check', () => {
  it('accepts a counter-clockwise polygon with no findings', () => {
    const r = validateBundle(withAreas([area({ type: 'Polygon', coordinates: [ccw] })]));
    expect(r.ok).toBe(true);
    expect(r.warnings.filter((w) => w.check === 'geojson')).toHaveLength(0);
  });

  it('warns on a clockwise exterior ring by default and errors under --strict', () => {
    const dir = withAreas([area({ type: 'Polygon', coordinates: [cw] })]);
    const lax = validateBundle(dir);
    expect(lax.ok).toBe(true);
    expect(lax.warnings.some((w) => w.check === 'geojson' && /clockwise/.test(w.message))).toBe(true);
    const strict = validateBundle(dir, { strict: true });
    expect(strict.ok).toBe(false);
  });

  it('errors on an unclosed ring', () => {
    const open = ccw.slice(0, 4);
    const r = validateBundle(withAreas([area({ type: 'Polygon', coordinates: [[...open, [-86.79, 36.11]]] })]));
    expect(r.errors.some((e) => e.check === 'geojson' && /not closed/.test(e.message))).toBe(true);
  });

  it('errors when the feature id differs from properties.id', () => {
    const r = validateBundle(withAreas([{ ...area({ type: 'Polygon', coordinates: [ccw] }), id: '00000000-0000-4000-8000-00000000ffff' }]));
    expect(r.errors.some((e) => /feature id .* differs from properties\.id/.test(e.message))).toBe(true);
  });
});
