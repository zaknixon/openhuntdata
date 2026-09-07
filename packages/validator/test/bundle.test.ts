import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openBundle } from '../src/bundle.js';
import { copyFixture, zipDir } from './helpers.js';

describe('openBundle', () => {
  it('reads a directory bundle', () => {
    const dir = copyFixture('minimal');
    const b = openBundle(dir);
    expect(b.list()).toEqual(['harvests.json', 'manifest.json']);
    expect(b.has('manifest.json')).toBe(true);
    expect(JSON.parse(b.readText('manifest.json')).ohd_version).toBe('1.0.0');
  });

  it('reads a zip bundle from a Buffer and from a path', () => {
    const dir = copyFixture('minimal');
    const buf = zipDir(dir);
    expect(openBundle(buf).list()).toEqual(['harvests.json', 'manifest.json']);
    const zipPath = join(dir, '..', 'minimal-test.ohd');
    writeFileSync(zipPath, buf);
    expect(openBundle(zipPath).readBytes('harvests.json').length).toBeGreaterThan(10);
  });

  it('strips a single wrapping folder inside a zip (Finder-style)', () => {
    const dir = copyFixture('minimal');
    const b = openBundle(zipDir(dir, 'mybundle'));
    expect(b.list()).toEqual(['harvests.json', 'manifest.json']);
  });

  it('throws on a path that is neither a directory nor a zip', () => {
    const dir = copyFixture('minimal');
    expect(() => openBundle(join(dir, 'harvests.json'))).toThrow();
  });
});
