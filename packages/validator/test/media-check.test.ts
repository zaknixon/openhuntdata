import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from '../src/hash.js';
import { updateManifest } from '../src/manifest-tool.js';
import { validateBundle } from '../src/validate.js';
import { copyFixture } from './helpers.js';

const HARVEST_ID = '6f1c2a3e-0b1d-4c8e-9a7f-1234567890ab';

function withMedia(opts: { listInMediaJson?: boolean; refFromRecord?: boolean; owner?: string } = {}) {
  const { listInMediaJson = true, refFromRecord = true, owner = HARVEST_ID } = opts;
  const dir = copyFixture('minimal');
  mkdirSync(join(dir, 'media'));
  const photo = Buffer.from('photo bytes');
  const path = `media/${sha256(photo)}.jpg`;
  writeFileSync(join(dir, path), photo);
  if (listInMediaJson) {
    writeFileSync(join(dir, 'media.json'), JSON.stringify([{ path, mime: 'image/jpeg', bytes: 0, sha256: '0'.repeat(64), owners: [{ kind: 'harvests', id: owner }] }]));
  }
  if (refFromRecord) {
    const h = JSON.parse(readFileSync(join(dir, 'harvests.json'), 'utf8'));
    h[0].media = [path];
    writeFileSync(join(dir, 'harvests.json'), JSON.stringify(h));
  }
  const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  if (listInMediaJson) m.coverage.included.push('media');
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m));
  updateManifest(dir);
  return { dir, path };
}

describe('media check', () => {
  it('passes a consistent media bundle', () => {
    const r = validateBundle(withMedia().dir);
    expect(r.ok).toBe(true);
    expect(r.warnings.filter((w) => w.check === 'media')).toHaveLength(0);
  });

  it('errors when a media.json entry hash does not match the file', () => {
    const { dir, path } = withMedia();
    writeFileSync(join(dir, path), 'tampered');
    const r = validateBundle(dir);
    expect(r.errors.some((e) => e.check === 'media' && e.path === path)).toBe(true);
  });

  it('errors when media/ files exist without media.json', () => {
    const r = validateBundle(withMedia({ listInMediaJson: false, refFromRecord: false }).dir);
    expect(r.errors.some((e) => e.check === 'media' && /without media\.json/.test(e.message))).toBe(true);
  });

  it('warns on an owner id that does not resolve', () => {
    const r = validateBundle(withMedia({ owner: '00000000-0000-4000-8000-00000000dead' }).dir);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.check === 'media' && /owner/.test(w.message))).toBe(true);
  });

  it('warns on a record media ref that is not in media.json', () => {
    const { dir } = withMedia();
    const h = JSON.parse(readFileSync(join(dir, 'harvests.json'), 'utf8'));
    h[0].media = ['media/missing.jpg'];
    writeFileSync(join(dir, 'harvests.json'), JSON.stringify(h));
    updateManifest(dir);
    const r = validateBundle(dir);
    expect(r.warnings.some((w) => w.check === 'media' && /media\/missing\.jpg/.test(w.message))).toBe(true);
  });
});
