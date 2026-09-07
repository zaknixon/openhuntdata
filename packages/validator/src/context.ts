import type { Bundle } from './bundle.js';
import type { Kind } from './kinds.js';
import type { Finding } from './report.js';

export interface ManifestFile {
  path: string;
  kind: Kind | 'extension';
  count?: number;
  sha256: string;
  bytes?: number;
}

export interface Manifest {
  ohd_version: string;
  exported_at: string;
  exporter: { name: string; version: string; url?: string };
  subject?: { display_name?: string; user_id_hash?: string };
  files: ManifestFile[];
  coverage: {
    included: Kind[];
    omitted: { kind: Kind; reason: string; count?: number }[];
    flags?: { strip_location?: boolean };
  };
}

export interface MediaEntry {
  path: string;
  mime: string;
  bytes: number;
  sha256: string;
  owners: { kind: Exclude<Kind, 'media'>; id: string }[];
  captured_at?: string;
  location?: unknown;
  camera?: { make?: string; model?: string };
  original_filename?: string;
}

/** A parsed record: a JSON array element, or a GeoJSON feature's properties plus `geometry`. */
export type AnyRecord = Record<string, unknown> & { id?: string };

export interface Context {
  bundle: Bundle;
  strict: boolean;
  findings: Finding[];
  manifest?: Manifest;
  /** Parsed records per kind, filled by the schema check. GeoJSON kinds are flattened to properties + geometry. */
  records: Map<Kind, AnyRecord[]>;
  error(check: string, message: string, path?: string): void;
  warn(check: string, message: string, path?: string): void;
  /** Error under --strict, warning otherwise. */
  flag(check: string, message: string, path?: string): void;
}

export function createContext(bundle: Bundle, strict: boolean): Context {
  const findings: Finding[] = [];
  const push = (severity: Finding['severity']) => (check: string, message: string, path?: string) => {
    findings.push(path === undefined ? { severity, check, message } : { severity, check, message, path });
  };
  return {
    bundle, strict, findings, records: new Map(),
    error: push('error'),
    warn: push('warning'),
    flag: push(strict ? 'error' : 'warning'),
  };
}
