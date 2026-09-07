import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateBundle } from '../src/validate.js';
import { copyFixture } from './helpers.js';

function withCoverage(fn: (c: any) => void) {
  const dir = copyFixture('minimal');
  const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  fn(m.coverage);
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
  return dir;
}

describe('coverage check', () => {
  it('errors when an included kind has no file', () => {
    const r = validateBundle(withCoverage((c) => { c.included.push('sightings'); }));
    expect(r.errors.some((e) => e.check === 'coverage' && /sightings/.test(e.message))).toBe(true);
  });

  it('warns when a kind file is present but not listed in included', () => {
    const r = validateBundle(withCoverage((c) => { c.included = []; }));
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.check === 'coverage' && /harvests/.test(w.message))).toBe(true);
  });
});
