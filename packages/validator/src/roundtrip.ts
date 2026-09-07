import { openBundle } from './bundle.js';
import { checkContainer } from './checks/container.js';
import { checkSchemas } from './checks/schema.js';
import { createContext, type AnyRecord } from './context.js';
import { RECORD_KINDS, type Kind } from './kinds.js';

export interface Difference { kind: Kind | 'x-file'; id: string; path: string; expected: unknown; actual: unknown }
export interface RoundtripResult {
  ok: boolean;
  missing: { kind: Kind; id: string }[];
  differences: Difference[];
  /** Records present in `actual` but not in `expected` (informational; does not fail the check). */
  extraFiles: string[];
}

const IGNORED_FIELDS = new Set(['source', 'updated_at']);

interface Loaded { records: Map<Kind, AnyRecord[]>; xFiles: Map<string, Buffer> }

function load(input: string | Buffer): Loaded {
  const bundle = openBundle(input);
  const ctx = createContext(bundle, false);
  if (!checkContainer(ctx)) throw new Error(`${bundle.label}: ${ctx.findings.map((f) => f.message).join('; ')}`);
  checkSchemas(ctx);
  const errors = ctx.findings.filter((f) => f.severity === 'error');
  if (errors.length) throw new Error(`${bundle.label}: ${errors.map((f) => `${f.path ?? ''} ${f.message}`).join('; ')}`);
  const xFiles = new Map<string, Buffer>();
  for (const p of bundle.list()) if (p.startsWith('x-')) xFiles.set(p, bundle.readBytes(p));
  return { records: ctx.records, xFiles };
}

function diff(a: unknown, b: unknown, path: string, out: { path: string; expected: unknown; actual: unknown }[]): void {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) { out.push({ path, expected: a, actual: b }); return; }
    a.forEach((v, i) => diff(v, b[i], `${path}/${i}`, out));
    return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    for (const k of new Set([...Object.keys(ao), ...Object.keys(bo)])) diff(ao[k], bo[k], `${path}/${k}`, out);
    return;
  }
  if (a !== b) out.push({ path, expected: a, actual: b });
}

export function roundtrip(expected: string | Buffer, actual: string | Buffer): RoundtripResult {
  const exp = load(expected);
  const act = load(actual);
  const missing: RoundtripResult['missing'] = [];
  const differences: Difference[] = [];

  for (const spec of RECORD_KINDS) {
    const expRecords = exp.records.get(spec.kind) ?? [];
    const actById = new Map((act.records.get(spec.kind) ?? []).map((r) => [r.id as string, r]));
    for (const e of expRecords) {
      const id = e.id as string;
      const a = actById.get(id);
      if (!a) { missing.push({ kind: spec.kind, id }); continue; }
      const strip = (r: AnyRecord) => Object.fromEntries(Object.entries(r).filter(([k]) => !IGNORED_FIELDS.has(k)));
      const local: { path: string; expected: unknown; actual: unknown }[] = [];
      diff(strip(e), strip(a), '', local);
      for (const d of local) differences.push({ kind: spec.kind, id, ...d });
    }
  }
  for (const [name, bytes] of exp.xFiles) {
    const other = act.xFiles.get(name);
    if (!other || !other.equals(bytes)) differences.push({ kind: 'x-file', id: name, path: `/${name}`, expected: 'present', actual: other ? 'different bytes' : 'missing' });
  }
  const extraFiles = [...act.xFiles.keys()].filter((n) => !exp.xFiles.has(n));
  return { ok: missing.length === 0 && differences.length === 0, missing, differences, extraFiles };
}
