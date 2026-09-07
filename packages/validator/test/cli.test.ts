import { describe, expect, it, vi } from 'vitest';
import { appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../src/cli.js';
import { copyFixture } from './helpers.js';

function capture(run: () => number) {
  const out: string[] = [];
  const err: string[] = [];
  const logSpy = vi.spyOn(console, 'log').mockImplementation((...a) => { out.push(a.join(' ')); });
  const errSpy = vi.spyOn(console, 'error').mockImplementation((...a) => { err.push(a.join(' ')); });
  const code = run();
  logSpy.mockRestore();
  errSpy.mockRestore();
  return { code, out: out.join('\n'), err: err.join('\n') };
}

describe('ohd validate', () => {
  it('exits 0 and prints a summary for a valid bundle', () => {
    const dir = copyFixture('minimal');
    const { code, out } = capture(() => main(['validate', dir]));
    expect(code).toBe(0);
    expect(out).toMatch(/0 error\(s\), 0 warning\(s\)/);
  });

  it('exits 1 and lists findings for an invalid bundle', () => {
    const dir = copyFixture('minimal');
    appendFileSync(join(dir, 'harvests.json'), '\n');
    const { code, out } = capture(() => main(['validate', dir]));
    expect(code).toBe(1);
    expect(out).toMatch(/error\s+files\s+harvests\.json: sha256 mismatch/);
  });

  it('prints JSON with --json', () => {
    const dir = copyFixture('minimal');
    const { code, out } = capture(() => main(['validate', dir, '--json']));
    expect(code).toBe(0);
    expect(JSON.parse(out).ok).toBe(true);
  });

  it('exits 2 on a missing argument', () => {
    expect(capture(() => main(['validate'])).code).toBe(2);
  });
});

describe('ohd cli error handling', () => {
  it('prints a one-line error and exits 1 when manifest.json is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ohd-empty-'));
    const { code, err } = capture(() => main(['manifest', dir]));
    expect(code).toBe(1);
    expect(err).toMatch(/manifest\.json not found/);
  });
});
