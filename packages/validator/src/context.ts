import type { Kind } from './kinds.js';

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
