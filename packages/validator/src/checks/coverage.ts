import type { Context } from '../context.js';
import { KINDS } from '../kinds.js';

/** Check 9: coverage.included agrees with the files actually present. */
export function checkCoverage(ctx: Context): void {
  const cov = ctx.manifest?.coverage;
  if (!cov) return; // manifest schema already failed
  const included = new Set(cov.included);
  for (const spec of KINDS) {
    const present = ctx.bundle.has(spec.file);
    if (included.has(spec.kind) && !present) {
      ctx.error('coverage', `coverage.included lists ${spec.kind} but ${spec.file} is not in the bundle`, 'manifest.json');
    }
    if (present && !included.has(spec.kind)) {
      ctx.warn('coverage', `${spec.file} is present but ${spec.kind} is not in coverage.included`, 'manifest.json');
    }
  }
}
