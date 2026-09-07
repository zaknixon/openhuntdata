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

class DirBundle implements Bundle {
  constructor(private readonly root: string) {}
  get label(): string { return this.root; }
  list(): string[] {
    const out: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else out.push(relative(this.root, full).split(sep).join('/'));
      }
    };
    walk(this.root);
    return out.sort();
  }
  has(p: string): boolean { return this.list().includes(p); }
  readBytes(p: string): Buffer { return readFileSync(join(this.root, p)); }
  readText(p: string): string { return this.readBytes(p).toString('utf8'); }
}

class ZipBundle implements Bundle {
  private readonly entries = new Map<string, AdmZip.IZipEntry>();
  constructor(zip: AdmZip, public readonly label: string) {
    const files = zip.getEntries().filter((e) => !e.isDirectory);
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

export function openBundle(input: string | Buffer): Bundle {
  if (Buffer.isBuffer(input)) return new ZipBundle(new AdmZip(input), '<buffer>');
  const st = statSync(input);
  if (st.isDirectory()) return new DirBundle(input);
  return new ZipBundle(new AdmZip(input), input);
}
