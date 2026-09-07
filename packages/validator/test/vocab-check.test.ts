import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { updateManifest } from '../src/manifest-tool.js';
import { validateBundle } from '../src/validate.js';
import { copyFixture } from './helpers.js';

function withHarvest(patch: Record<string, unknown>) {
  const dir = copyFixture('minimal');
  const p = join(dir, 'harvests.json');
  const h = JSON.parse(readFileSync(p, 'utf8'));
  Object.assign(h[0], patch);
  writeFileSync(p, JSON.stringify(h));
  updateManifest(dir);
  return dir;
}

describe('vocab check', () => {
  it('errors on an unknown species code', () => {
    const r = validateBundle(withHarvest({ species: 'martian' }));
    const e = r.errors.find((f) => f.check === 'vocab');
    expect(e?.message).toMatch(/"martian" is not in vocab species/);
    expect(e?.path).toBe('harvests.json#/0/species');
  });

  it('warns on "other" without the paired _text field', () => {
    const r = validateBundle(withHarvest({ weapon: 'other' }));
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.check === 'vocab' && w.path === 'harvests.json#/0/weapon')).toBe(true);
  });

  it('accepts "other" with the paired _text field', () => {
    const r = validateBundle(withHarvest({ weapon: 'other', weapon_text: 'Atlatl' }));
    expect(r.warnings.filter((w) => w.check === 'vocab')).toHaveLength(0);
  });

  it('checks moon phase inside weather', () => {
    const r = validateBundle(withHarvest({ weather: { moon: { phase: 'blue' } } }));
    expect(r.errors.some((e) => e.path === 'harvests.json#/0/weather/moon/phase')).toBe(true);
  });
});
