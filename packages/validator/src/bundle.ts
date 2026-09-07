import AdmZip from 'adm-zip';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface Bundle {
  readonly label: string;
  /** Sorted, forward-slash relative paths of every file (no directories). */
  list(): string[];
  has(path: string): boolean;
  readBytes(path: string): Buffer;
  readText(path: string): string;
}

/** Guardrails against zip bombs. These are validator limits, not format limits. */
export interface BundleLimits {
  /** Total uncompressed bytes of all entries. */
  maxUncompressedBytes: number;
  /** Total number of file entries. */
  maxEntries: number;
}

export const DEFAULT_LIMITS: BundleLimits = {
  maxUncompressedBytes: 2 * 1024 ** 3,
  maxEntries: 50_000,
};

/**
 * True when `p` is a relative, forward-slash path that stays inside the bundle.
 * Rejects absolute paths, drive letters, backslashes, empty names, and any `..` segment.
 */
export function isSafeBundlePath(p: string): boolean {
  if (!p) return false;
  if (p.includes('\\')) return false;
  if (p.startsWith('/')) return false;
  if (/^[A-Za-z]:/.test(p)) return false;
  return !p.split('/').includes('..');
}

function checkLimits(entries: number, bytes: number, limits: BundleLimits): void {
  if (entries > limits.maxEntries) {
    throw new Error(`bundle exceeds limits: ${entries} entries (max ${limits.maxEntries})`);
  }
  if (bytes > limits.maxUncompressedBytes) {
    throw new Error(`bundle exceeds limits: ${bytes} uncompressed bytes (max ${limits.maxUncompressedBytes})`);
  }
}

class DirBundle implements Bundle {
  private cached?: { files: string[]; set: Set<string> };
  constructor(private readonly root: string, private readonly limits: BundleLimits) {
    this.list();
  }
  get label(): string { return this.root; }
  list(): string[] {
    if (!this.cached) {
      const out: string[] = [];
      let bytes = 0;
      const walk = (dir: string): void => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, e.name);
          if (e.isDirectory()) walk(full);
          else {
            bytes += statSync(full).size;
            out.push(relative(this.root, full).split(sep).join('/'));
            checkLimits(out.length, bytes, this.limits);
          }
        }
      };
      walk(this.root);
      checkLimits(out.length, bytes, this.limits);
      out.sort();
      this.cached = { files: out, set: new Set(out) };
    }
    return this.cached.files;
  }
  has(p: string): boolean {
    this.list();
    return this.cached!.set.has(p);
  }
  readBytes(p: string): Buffer { return readFileSync(join(this.root, p)); }
  readText(p: string): string { return this.readBytes(p).toString('utf8'); }
}

/** macOS Finder adds these when compressing a folder; they are not part of the bundle. */
function isMacOsCruft(entryName: string): boolean {
  const parts = entryName.split('/');
  return parts[0] === '__MACOSX' || parts[parts.length - 1].startsWith('._');
}

class ZipBundle implements Bundle {
  private readonly entries = new Map<string, AdmZip.IZipEntry>();
  constructor(zip: AdmZip, public readonly label: string, limits: BundleLimits) {
    const files = zip.getEntries().filter((e) => !e.isDirectory && !isMacOsCruft(e.entryName));

    const unsafe = files.map((e) => e.entryName).filter((n) => !isSafeBundlePath(n));
    if (unsafe.length) throw new Error(`unsafe entry name(s) in zip: ${unsafe.join(', ')}`);

    // Bound the work before any entry is decompressed.
    let bytes = 0;
    for (const e of files) bytes += e.header.size;
    checkLimits(files.length, bytes, limits);

    // If manifest.json is not at the root but every entry shares one top-level folder that
    // contains it (Finder-style "compress folder"), strip that folder.
    let prefix = '';
    if (!files.some((e) => e.entryName === 'manifest.json')) {
      const tops = new Set(files.map((e) => e.entryName.split('/')[0]));
      if (tops.size === 1) {
        const top = [...tops][0];
        if (files.some((e) => e.entryName === `${top}/manifest.json`)) prefix = `${top}/`;
      }
    }
    for (const e of files) {
      const name = prefix && e.entryName.startsWith(prefix) ? e.entryName.slice(prefix.length) : e.entryName;
      this.entries.set(name, e);
    }
  }
  list(): string[] { return [...this.entries.keys()].sort(); }
  has(p: string): boolean { return this.entries.has(p); }
  readBytes(p: string): Buffer {
    const e = this.entries.get(p);
    if (!e) throw new Error(`No such entry in bundle: ${p}`);
    return e.getData();
  }
  readText(p: string): string { return this.readBytes(p).toString('utf8'); }
}

export function openBundle(input: string | Buffer, limits: BundleLimits = DEFAULT_LIMITS): Bundle {
  if (Buffer.isBuffer(input)) return new ZipBundle(new AdmZip(input), '<buffer>', limits);
  const st = statSync(input);
  if (st.isDirectory()) return new DirBundle(input, limits);
  return new ZipBundle(new AdmZip(input), input, limits);
}
