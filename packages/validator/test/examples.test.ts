import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateBundle } from '../src/validate.js';
import { EXAMPLES_DIR, zipDir } from './helpers.js';

describe('example bundles', () => {
  it('minimal validates with no findings at all', () => {
    const r = validateBundle(join(EXAMPLES_DIR, 'minimal'));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('typical validates with no findings, as a directory and as a zip', () => {
    const dir = join(EXAMPLES_DIR, 'typical');
    expect(existsSync(dir)).toBe(true);
    const r = validateBundle(dir);
    expect(r.errors, JSON.stringify(r.errors, null, 2)).toEqual([]);
    expect(r.warnings, JSON.stringify(r.warnings, null, 2)).toEqual([]);
    expect(validateBundle(zipDir(dir)).ok).toBe(true);
  });

  it('typical contains the full season it promises', () => {
    const dir = join(EXAMPLES_DIR, 'typical');
    expect(JSON.parse(readFileSync(join(dir, 'hunts.json'), 'utf8')).length).toBeGreaterThanOrEqual(12);
    expect(JSON.parse(readFileSync(join(dir, 'harvests.json'), 'utf8')).length).toBe(2);
    expect(JSON.parse(readFileSync(join(dir, 'sightings.json'), 'utf8')).length).toBe(5);
    expect(JSON.parse(readFileSync(join(dir, 'media.json'), 'utf8')).length).toBe(3);
  });

  it('edge-cases validates with zero errors and the expected warnings', () => {
    const r = validateBundle(join(EXAMPLES_DIR, 'edge-cases'));
    expect(r.errors, JSON.stringify(r.errors, null, 2)).toEqual([]);
    const checks = new Set(r.warnings.map((w) => w.check));
    expect([...checks].sort()).toEqual(['geojson', 'refs', 'vocab']);
  });

  it('edge-cases becomes invalid under --strict (clockwise ring)', () => {
    expect(validateBundle(join(EXAMPLES_DIR, 'edge-cases'), { strict: true }).ok).toBe(false);
  });
});
