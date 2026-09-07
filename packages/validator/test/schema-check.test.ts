import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { updateManifest } from '../src/manifest-tool.js';
import { validateBundle } from '../src/validate.js';
import { copyFixture } from './helpers.js';

/** Mutates harvests.json in a copy of minimal and refreshes the manifest so only the schema check can fail. */
function withHarvests(mutate: (h: Record<string, unknown>[]) => unknown) {
  const dir = copyFixture('minimal');
  const p = join(dir, 'harvests.json');
  const h = JSON.parse(readFileSync(p, 'utf8'));
  const out = mutate(h) ?? h;
  writeFileSync(p, JSON.stringify(out));
  updateManifest(dir);
  return dir;
}

describe('schema check', () => {
  it('errors on a kind file that is not JSON', () => {
    const dir = copyFixture('minimal');
    writeFileSync(join(dir, 'harvests.json'), '[');
    updateManifest(dir);
    const r = validateBundle(dir);
    expect(r.errors.some((e) => e.check === 'json' && e.path === 'harvests.json')).toBe(true);
  });

  it('errors with the instance path when a record fails its schema', () => {
    const dir = withHarvests((h) => { delete h[0].species; });
    const r = validateBundle(dir);
    const err = r.errors.find((e) => e.check === 'schema');
    expect(err?.path).toBe('harvests.json');
    expect(err?.message).toMatch(/species/);
  });

  it('errors when manifest count disagrees with the file', () => {
    const dir = copyFixture('minimal');
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    m.files[0].count = 7;
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
    const r = validateBundle(dir);
    expect(r.errors.some((e) => /manifest count 7 but file has 1/.test(e.message))).toBe(true);
  });

  it('accepts unknown fields on a record', () => {
    const dir = withHarvests((h) => { h[0].favorite_color = 'blaze orange'; });
    expect(validateBundle(dir).ok).toBe(true);
  });
});
