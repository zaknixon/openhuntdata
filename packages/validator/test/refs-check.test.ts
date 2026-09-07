import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { updateManifest } from '../src/manifest-tool.js';
import { validateBundle } from '../src/validate.js';
import { copyFixture } from './helpers.js';

function edit(dir: string, file: string, fn: (d: any) => void) {
  const p = join(dir, file);
  const d = JSON.parse(readFileSync(p, 'utf8'));
  fn(d);
  writeFileSync(p, JSON.stringify(d));
}

describe('refs check', () => {
  it('warns with a count on dangling references', () => {
    const dir = copyFixture('minimal');
    edit(dir, 'harvests.json', (h) => { h[0].hunt_id = '00000000-0000-4000-8000-00000000dead'; });
    updateManifest(dir);
    const r = validateBundle(dir);
    expect(r.ok).toBe(true);
    const w = r.warnings.find((f) => f.check === 'refs');
    expect(w?.message).toBe('1 harvests.hunt_id reference(s) do not resolve to a record in hunts.json');
  });

  it('errors on duplicate ids within a kind', () => {
    const dir = copyFixture('minimal');
    edit(dir, 'harvests.json', (h) => { h.push({ ...h[0] }); });
    updateManifest(dir);
    const r = validateBundle(dir);
    expect(r.errors.some((e) => e.check === 'refs' && /duplicate id/.test(e.message))).toBe(true);
  });
});
