import { describe, expect, it } from 'vitest';
import { appendFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateBundle } from '../src/validate.js';
import { copyFixture, zipDir } from './helpers.js';

function readManifest(dir: string) {
  return JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
}

function checks(report: ReturnType<typeof validateBundle>) {
  return report.errors.map((e) => `${e.check}:${e.path ?? ''}`);
}

describe('container checks', () => {
  it('passes the minimal example as a directory and as a zip', () => {
    const dir = copyFixture('minimal');
    expect(validateBundle(dir).ok).toBe(true);
    expect(validateBundle(zipDir(dir)).ok).toBe(true);
  });

  it('errors when manifest.json is missing', () => {
    const dir = copyFixture('minimal');
    rmSync(join(dir, 'manifest.json'));
    const r = validateBundle(dir);
    expect(r.ok).toBe(false);
    expect(r.errors[0].check).toBe('container');
  });

  it('errors on invalid manifest JSON', () => {
    const dir = copyFixture('minimal');
    writeFileSync(join(dir, 'manifest.json'), '{ not json');
    expect(validateBundle(dir).errors[0].message).toMatch(/not valid JSON/);
  });

  it('errors on a manifest that fails its schema', () => {
    const dir = copyFixture('minimal');
    const m = readManifest(dir);
    delete m.coverage;
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
    expect(checks(validateBundle(dir))).toContain('manifest:manifest.json');
  });

  it('errors on a non-1.x ohd_version', () => {
    const dir = copyFixture('minimal');
    const m = readManifest(dir);
    m.ohd_version = '2.0.0';
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
    expect(validateBundle(dir).errors[0].message).toMatch(/not a 1\.x version/);
  });

  it('errors on a sha256 mismatch', () => {
    const dir = copyFixture('minimal');
    appendFileSync(join(dir, 'harvests.json'), '\n');
    expect(checks(validateBundle(dir))).toContain('files:harvests.json');
  });

  it('errors on a listed file that does not exist', () => {
    const dir = copyFixture('minimal');
    const m = readManifest(dir);
    m.files.push({ path: 'sightings.json', kind: 'sightings', sha256: 'a'.repeat(64) });
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
    expect(validateBundle(dir).errors.some((e) => e.path === 'sightings.json' && /does not exist/.test(e.message))).toBe(true);
  });

  it('errors on an unlisted file, including an x- file, unless it is dot-prefixed or under media/', () => {
    const dir = copyFixture('minimal');
    writeFileSync(join(dir, 'stray.txt'), 'x');
    writeFileSync(join(dir, 'x-stray.txt'), 'x');
    writeFileSync(join(dir, '.DS_Store'), 'x');
    const r = validateBundle(dir);
    expect(r.errors.map((e) => e.path).sort()).toEqual(['stray.txt', 'x-stray.txt']);
  });

  it('errors when a kind file is listed with the wrong kind', () => {
    const dir = copyFixture('minimal');
    const m = readManifest(dir);
    m.files[0].kind = 'sightings';
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
    expect(validateBundle(dir).errors.some((e) => /does not match file name/.test(e.message))).toBe(true);
  });
});
