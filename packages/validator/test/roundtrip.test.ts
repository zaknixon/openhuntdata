import { describe, expect, it } from 'vitest';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { updateManifest } from '../src/manifest-tool.js';
import { roundtrip } from '../src/roundtrip.js';
import { copyFixture } from './helpers.js';

function edit(dir: string, file: string, fn: (d: any) => void) {
  const p = join(dir, file);
  const d = JSON.parse(readFileSync(p, 'utf8'));
  fn(d);
  writeFileSync(p, JSON.stringify(d));
  updateManifest(dir);
}

describe('roundtrip', () => {
  it('passes when only source and updated_at changed', () => {
    const a = copyFixture('edge-cases');
    const b = copyFixture('edge-cases');
    edit(b, 'harvests.json', (h) => { h[0].source = { app: 'Other App', app_version: '9', record_id: 'zzz' }; h[0].updated_at = '2026-01-01T00:00:00Z'; });
    const r = roundtrip(a, b);
    expect(r.ok, JSON.stringify(r)).toBe(true);
  });

  it('reports a changed core field with its path', () => {
    const a = copyFixture('edge-cases');
    const b = copyFixture('edge-cases');
    edit(b, 'harvests.json', (h) => { h[0].species_text = 'Blue bull'; });
    const r = roundtrip(a, b);
    expect(r.ok).toBe(false);
    expect(r.differences).toEqual([{ kind: 'harvests', id: '11111111-1111-4111-8111-111111111101', path: '/species_text', expected: 'Nilgai', actual: 'Blue bull' }]);
  });

  it('reports dropped extensions, unknown fields, and geometry changes', () => {
    const a = copyFixture('edge-cases');
    const b = copyFixture('edge-cases');
    edit(b, 'harvests.json', (h) => { delete h[0].extensions; delete h[0].favorite_color; });
    edit(b, 'tracks.geojson', (t) => { t.features[0].geometry.coordinates[1] = [-86.791, 36.11]; });
    const paths = roundtrip(a, b).differences.map((d) => `${d.kind}${d.path}`).sort();
    expect(paths).toEqual(['harvests/extensions', 'harvests/favorite_color', 'tracks/geometry/coordinates/1/0']);
  });

  it('reports missing records and a dropped x- file', () => {
    const a = copyFixture('edge-cases');
    const b = copyFixture('edge-cases');
    edit(b, 'sightings.json', (s) => { s.length = 0; });
    rmSync(join(b, 'x-legacy-notebook.txt'));
    updateManifest(b);
    const r = roundtrip(a, b);
    expect(r.missing).toEqual([{ kind: 'sightings', id: '11111111-1111-4111-8111-111111111201' }]);
    expect(r.extraFiles).toEqual([]);
    expect(r.differences.some((d) => d.path === '/x-legacy-notebook.txt')).toBe(true);
  });
});
