import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSafeBundlePath, openBundle } from '../src/bundle.js';
import { validateBundle } from '../src/validate.js';
import { copyFixture, zipDir } from './helpers.js';

const HOSTILE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'hostile');
const hostile = (name: string) => join(HOSTILE_DIR, name);

describe('isSafeBundlePath', () => {
  it.each([
    ['media/a.jpg', true],
    ['harvests.json', true],
    ['../x', false],
    ['a/../x', false],
    ['/etc/passwd', false],
    ['C:\\x', false],
    ['', false],
  ])('%j -> %s', (p, expected) => {
    expect(isSafeBundlePath(p as string)).toBe(expected);
  });
});

describe('zip slip', () => {
  it('refuses to open a zip with a traversing entry name', () => {
    const r = validateBundle(hostile('traversal.ohd'));
    expect(r.ok).toBe(false);
    expect(r.errors[0].check).toBe('container');
    expect(r.errors[0].message).toMatch(/unsafe entry/);
  });

  it('errors on a manifest that lists a traversing path', () => {
    const dir = copyFixture('minimal');
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    m.files.push({ path: '../x.json', kind: 'extension', sha256: 'a'.repeat(64) });
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
    const r = validateBundle(dir);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.check === 'files' && /unsafe path/.test(e.message))).toBe(true);
  });

  it('still skips basename dotfiles at the root and under media/', () => {
    const dir = copyFixture('minimal');
    writeFileSync(join(dir, '.DS_Store'), 'x');
    mkdirSync(join(dir, 'media'));
    writeFileSync(join(dir, 'media', '.DS_Store'), 'x');
    // Neither dotfile is reported as an unlisted file. (The separate media check still
    // counts anything under media/ when there is no media.json; that is not the files check.)
    expect(validateBundle(dir).errors.filter((e) => e.check === 'files')).toEqual([]);
  });
});

describe('__MACOSX unwrapping', () => {
  it('validates a Finder-style zip and ignores the resource-fork entries', () => {
    expect(validateBundle(hostile('macosx.ohd')).ok).toBe(true);
    expect(openBundle(hostile('macosx.ohd')).list()).toEqual(['harvests.json', 'manifest.json']);
  });
});

describe('decompression limits', () => {
  it('refuses a bundle over maxUncompressedBytes', () => {
    const r = validateBundle(copyFixture('minimal'), { limits: { maxUncompressedBytes: 10, maxEntries: 50_000 } });
    expect(r.ok).toBe(false);
    expect(r.errors[0].check).toBe('container');
    expect(r.errors[0].message).toMatch(/exceeds limits/);
  });

  it('refuses a zip over maxUncompressedBytes before reading any entry', () => {
    const r = validateBundle(zipDir(copyFixture('minimal')), { limits: { maxUncompressedBytes: 10, maxEntries: 50_000 } });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/exceeds limits/);
  });

  it('refuses a bundle over maxEntries', () => {
    const r = validateBundle(copyFixture('minimal'), { limits: { maxUncompressedBytes: 2 * 1024 ** 3, maxEntries: 1 } });
    expect(r.ok).toBe(false);
    expect(r.errors[0].check).toBe('container');
    expect(r.errors[0].message).toMatch(/exceeds limits/);
  });
});
