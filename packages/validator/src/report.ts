export type Severity = 'error' | 'warning';

export interface Finding {
  severity: Severity;
  /** Which check produced this: container, manifest, files, json, schema, geojson, vocab, refs, media, coverage. */
  check: string;
  message: string;
  /** File path inside the bundle, optionally with a JSON-pointer-ish suffix after '#'. */
  path?: string;
}

export interface Report {
  ok: boolean;
  errors: Finding[];
  warnings: Finding[];
}

export function buildReport(findings: Finding[]): Report {
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  return { ok: errors.length === 0, errors, warnings };
}
