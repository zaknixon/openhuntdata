import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256 } from '../src/hash.js';
import { updateManifest } from '../src/manifest-tool.js';

function scratch(): string { return mkdtempSync(join(tmpdir(), 'ohd-')); }

const baseManifest = {
  ohd_version: '1.0.0', exported_at: '2026-09-07T10:00:00-05:00',
  exporter: { name: 'Test', version: '1' }, files: [], coverage: { included: ['harvests'], omitted: [] },
};

describe('sha256', () => {
  it('hashes bytes to lowercase hex', () => {
    expect(sha256(Buffer.from('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('updateManifest', () => {
  it('fills files[] with hash, count and bytes for kind files and x- files', () => {
    const dir = scratch();
    const harvests = '[]\n';
    writeFileSync(join(dir, 'harvests.json'), harvests);
    writeFileSync(join(dir, 'x-notes.txt'), 'hello');
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(baseManifest));
    const m = updateManifest(dir);
    expect(m.files).toEqual([
      { path: 'harvests.json', kind: 'harvests', count: 0, sha256: sha256(Buffer.from(harvests)), bytes: harvests.length },
      { path: 'x-notes.txt', kind: 'extension', sha256: sha256(Buffer.from('hello')), bytes: 5 },
    ]);
    const onDisk = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    expect(onDisk.files).toEqual(m.files);
    expect(onDisk.exporter.name).toBe('Test');
  });

  it('refreshes media.json bytes/sha256 before hashing media.json itself', () => {
    const dir = scratch();
    mkdirSync(join(dir, 'media'));
    const photo = Buffer.from('not really a jpeg');
    const name = `media/${sha256(photo)}.jpg`;
    writeFileSync(join(dir, name), photo);
    writeFileSync(join(dir, 'media.json'), JSON.stringify([{ path: name, mime: 'image/jpeg', bytes: 0, sha256: '0'.repeat(64), owners: [] }]));
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(baseManifest));
    updateManifest(dir);
    const media = JSON.parse(readFileSync(join(dir, 'media.json'), 'utf8'));
    expect(media[0].bytes).toBe(photo.length);
    expect(media[0].sha256).toBe(sha256(photo));
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    const entry = manifest.files.find((f: { path: string }) => f.path === 'media.json');
    expect(entry.sha256).toBe(sha256(readFileSync(join(dir, 'media.json'))));
  });

  it('throws when manifest.json is absent', () => {
    const dir = scratch();
    expect(() => updateManifest(dir)).toThrow(/manifest\.json not found/);
  });
});
